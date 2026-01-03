import { Router } from 'express';
import { query, analyticsQuery } from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { deleteFile, BUCKETS } from '../config/minio';
import { Session } from '../types';

const router = Router();

// Helper function to fetch swell signature for a session
async function fetchSwellSignature(session: any) {
  try {
    const analyticsSpotResult = await analyticsQuery(
      `SELECT id FROM reference.spot_info WHERE name ILIKE $1 LIMIT 1`,
      [`%${session.location}%`]
    );

    if (analyticsSpotResult.rows.length > 0) {
      const spotId = analyticsSpotResult.rows[0].id;
      
      // Get wind data closest to session start time
      const windResult = await analyticsQuery(
        `SELECT wind_speed, wind_direction
         FROM ingested.wind_data
         WHERE spot_id = $1
         ORDER BY ABS(EXTRACT(EPOCH FROM (timestamp - $2::timestamptz)))
         LIMIT 1`,
        [spotId, session.session_date]
      );

      // Get buoy for swell data
      const buoyLinkResult = await analyticsQuery(
        `SELECT buoy_id FROM reference.spot_buoy_link WHERE spot_id = $1 LIMIT 1`,
        [spotId]
      );

      if (buoyLinkResult.rows.length > 0) {
        const buoyId = buoyLinkResult.rows[0].buoy_id;
        
        // Get swell data closest to session start time
        const swellResult = await analyticsQuery(
          `SELECT swell_height, wave_height, swell_period, swell_direction, tide
           FROM ingested.swell_data
           WHERE buoy_id = $1
           ORDER BY ABS(EXTRACT(EPOCH FROM (timestamp - $2::timestamptz)))
           LIMIT 1`,
          [buoyId, session.session_date]
        );

        if (swellResult.rows.length > 0 || windResult.rows.length > 0) {
          const swell = swellResult.rows[0] || {};
          const wind = windResult.rows[0] || {};
          
          // Format swell height
          let formattedSwellHeight = null;
          const height = swell.swell_height || swell.wave_height;
          if (height != null) {
            const rounded = Math.round(height * 10) / 10;
            formattedSwellHeight = rounded % 1 === 0 ? `${Math.floor(rounded)}ft` : `${rounded.toFixed(1)}ft`;
          }
          
          // Format wind direction
          let formattedWindDir = null;
          if (wind.wind_direction != null) {
            const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
            const index = Math.round(wind.wind_direction / 22.5) % 16;
            formattedWindDir = directions[index];
          }
          
          // Format tide height
          let formattedTide = null;
          if (swell.tide != null) {
            const rounded = Math.round(swell.tide * 10) / 10;
            formattedTide = rounded % 1 === 0 ? `${Math.floor(rounded)}ft` : `${rounded.toFixed(1)}ft`;
          }
          
          return {
            swell_height: formattedSwellHeight,
            swell_period: swell.swell_period != null ? Math.round(swell.swell_period) : null,
            swell_direction: swell.swell_direction || null,
            wind_speed: wind.wind_speed != null ? Math.round(wind.wind_speed) : null,
            wind_direction: formattedWindDir,
            tide_height: formattedTide
          };
        }
      }
    }
  } catch (error) {
    console.error('Error fetching swell signature for session:', error);
  }
  return null;
}

// Get all public sessions (feed)
// Get feed - sessions from followed users only
router.get('/feed', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, user_id } = req.query;
  
  if (!user_id) {
    res.json([]);
    return;
  }
  
  const result = await query(
    `SELECT s.*, p.display_name, p.avatar_url,
            (SELECT COUNT(*)::int FROM session_likes WHERE session_id = s.id) as like_count,
            (SELECT COUNT(*)::int FROM session_comments WHERE session_id = s.id) as comment_count,
            (SELECT COUNT(*)::int FROM session_kooks WHERE session_id = s.id) as kooks_count,
            EXISTS(SELECT 1 FROM session_likes WHERE session_id = s.id AND user_id = $3) as is_liked,
            EXISTS(SELECT 1 FROM session_kooks WHERE session_id = s.id AND user_id = $3) as is_kooked
     FROM sessions s
     JOIN profiles p ON s.user_id = p.user_id
     WHERE s.is_public = true
       AND (s.user_id = $3 OR s.user_id IN (SELECT following_id FROM follows WHERE follower_id = $3))
     ORDER BY s.session_date DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset, user_id]
  );
  
  // Fetch media, board, and swell signature for each session with error handling
  const sessionsWithMedia = await Promise.all(
    result.rows.map(async (session: any) => {
      try {
        const [mediaResult, swellSignature, boardResult] = await Promise.all([
          query('SELECT id, url, media_type FROM session_media WHERE session_id = $1', [session.id]),
          fetchSwellSignature(session).catch(() => null),
          session.board_id 
            ? query('SELECT id, name, brand, photo_url FROM boards WHERE id = $1', [session.board_id]).catch(() => ({ rows: [] }))
            : Promise.resolve({ rows: [] })
        ]);
        
        return { 
          ...session, 
          media: mediaResult?.rows || [],
          like_count: parseInt(session.like_count) || 0,
          comment_count: parseInt(session.comment_count) || 0,
          kooks_count: parseInt(session.kooks_count) || 0,
          is_liked: session.is_liked === true || session.is_liked === 't' || session.is_liked === 1,
          is_kooked: session.is_kooked === true || session.is_kooked === 't' || session.is_kooked === 1,
          swell_signature: swellSignature,
          board: boardResult?.rows?.[0] || null
        };
      } catch (error) {
        console.error('Error enriching session:', session.id, error);
        return { 
          ...session, 
          media: [],
          like_count: parseInt(session.like_count) || 0,
          comment_count: parseInt(session.comment_count) || 0,
          kooks_count: parseInt(session.kooks_count) || 0,
          is_liked: session.is_liked === true || session.is_liked === 't' || session.is_liked === 1,
          is_kooked: session.is_kooked === true || session.is_kooked === 't' || session.is_kooked === 1,
          swell_signature: null,
          board: null
        };
      }
    })
  );
  
  res.json(sessionsWithMedia);
}));

router.get('/public', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, user_id } = req.query;
  
  const result = await query(
    `SELECT s.*, p.display_name, p.avatar_url,
            (SELECT COUNT(*)::int FROM session_likes WHERE session_id = s.id) as like_count,
            (SELECT COUNT(*)::int FROM session_comments WHERE session_id = s.id) as comment_count,
            (SELECT COUNT(*)::int FROM session_kooks WHERE session_id = s.id) as kooks_count,
            ${user_id ? `EXISTS(SELECT 1 FROM session_likes WHERE session_id = s.id AND user_id = $3) as is_liked,` : 'false as is_liked,'}
            ${user_id ? `EXISTS(SELECT 1 FROM session_kooks WHERE session_id = s.id AND user_id = $3) as is_kooked` : 'false as is_kooked'}
     FROM sessions s
     JOIN profiles p ON s.user_id = p.user_id
     WHERE s.is_public = true
     ORDER BY s.session_date DESC
     LIMIT $1 OFFSET $2`,
    user_id ? [limit, offset, user_id] : [limit, offset]
  );
  
  // Fetch media, board, and swell signature for each session
  const sessionsWithMedia = await Promise.all(
    result.rows.map(async (session: any) => {
      const [mediaResult, swellSignature, boardResult] = await Promise.all([
        query('SELECT id, url, media_type FROM session_media WHERE session_id = $1', [session.id]),
        fetchSwellSignature(session),
        session.board_id 
          ? query('SELECT id, name, brand, photo_url FROM boards WHERE id = $1', [session.board_id])
          : Promise.resolve({ rows: [] })
      ]);
      
      return { 
        ...session, 
        media: mediaResult.rows,
        like_count: parseInt(session.like_count) || 0,
        comment_count: parseInt(session.comment_count) || 0,
        kooks_count: parseInt(session.kooks_count) || 0,
        is_liked: session.is_liked === true || session.is_liked === 't' || session.is_liked === 1,
        is_kooked: session.is_kooked === true || session.is_kooked === 't' || session.is_kooked === 1,
        swell_signature: swellSignature,
        board: boardResult.rows[0] || null
      };
    })
  );
  
  res.json(sessionsWithMedia);
}));

// Get session by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(
    `SELECT s.*, p.display_name, p.avatar_url,
            (SELECT COUNT(*) FROM session_likes WHERE session_id = s.id) as like_count,
            (SELECT COUNT(*) FROM session_comments WHERE session_id = s.id) as comment_count
     FROM sessions s
     JOIN profiles p ON s.user_id = p.user_id
     WHERE s.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Session not found');
  }
  
  res.json(result.rows[0]);
}));

// Get sessions by user ID
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, offset = 0, current_user_id } = req.query;
  
  const result = await query(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM session_likes WHERE session_id = s.id) as like_count,
            (SELECT COUNT(*)::int FROM session_comments WHERE session_id = s.id) as comment_count,
            (SELECT COUNT(*)::int FROM session_kooks WHERE session_id = s.id) as kooks_count,
            ${current_user_id ? `EXISTS(SELECT 1 FROM session_likes WHERE session_id = s.id AND user_id = $4) as is_liked,` : 'false as is_liked,'}
            ${current_user_id ? `EXISTS(SELECT 1 FROM session_kooks WHERE session_id = s.id AND user_id = $4) as is_kooked` : 'false as is_kooked'}
     FROM sessions s
     WHERE s.user_id = $1
     ORDER BY s.session_date DESC
     LIMIT $2 OFFSET $3`,
    current_user_id ? [userId, limit, offset, current_user_id] : [userId, limit, offset]
  );
  
  // Fetch media, board, and swell signature for each session
  const sessionsWithMedia = await Promise.all(
    result.rows.map(async (session: any) => {
      const [mediaResult, swellSignature, boardResult] = await Promise.all([
        query('SELECT id, url, media_type FROM session_media WHERE session_id = $1', [session.id]),
        fetchSwellSignature(session),
        session.board_id 
          ? query('SELECT id, name, brand, photo_url FROM boards WHERE id = $1', [session.board_id])
          : Promise.resolve({ rows: [] })
      ]);
      
      return { 
        ...session, 
        media: mediaResult.rows,
        like_count: parseInt(session.like_count) || 0,
        comment_count: parseInt(session.comment_count) || 0,
        kooks_count: parseInt(session.kooks_count) || 0,
        is_liked: session.is_liked === true || session.is_liked === 't',
        is_kooked: session.is_kooked === true || session.is_kooked === 't',
        swell_signature: swellSignature,
        board: boardResult.rows[0] || null
      };
    })
  );
  
  res.json(sessionsWithMedia);
}));

// Get media for a specific session
router.get('/:id/media', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(
    'SELECT id, url, media_type, created_at FROM session_media WHERE session_id = $1 ORDER BY created_at DESC',
    [id]
  );
  
  res.json(result.rows);
}));

// Get all media for a user (for photo gallery)
router.get('/user/:userId/media', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const result = await query(
    `SELECT sm.id, sm.url, sm.media_type, sm.session_id, sm.created_at,
            s.location as session_location, s.session_date
     FROM session_media sm
     JOIN sessions s ON sm.session_id = s.id
     WHERE sm.user_id = $1
     ORDER BY sm.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  
  res.json(result.rows);
}));

// Create new session
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const {
    location,
    latitude,
    longitude,
    session_date,
    duration_minutes,
    wave_height,
    wave_count,
    wave_consistency,
    shape,
    power,
    crowd,
    form,
    rating,
    gear,
    notes,
    board_id,
    barrel_count,
    air_count,
    is_public = false,
  } = req.body;

  const user_id = req.userId; // Get from JWT token

  if (!location || !session_date) {
    throw new ApiError(400, 'Missing required fields: location, session_date');
  }

  const result = await query(
    `INSERT INTO sessions (
      user_id, location, latitude, longitude, session_date,
      duration_minutes, wave_height, wave_count, wave_consistency,
      shape, power, crowd, form, rating, gear, notes,
      board_id, barrel_count, air_count, is_public
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *`,
    [
      user_id, location, latitude, longitude, session_date,
      duration_minutes, wave_height, wave_count, wave_consistency,
      shape, power, crowd, form, rating, gear, notes,
      board_id, barrel_count, air_count, is_public,
    ]
  );

  const session = result.rows[0];


  res.status(201).json(session);
}));

// Update session
router.put('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Verify ownership
  const sessionCheck = await query('SELECT user_id FROM sessions WHERE id = $1', [id]);
  if (sessionCheck.rows.length === 0) {
    throw new ApiError(404, 'Session not found');
  }
  if (sessionCheck.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Not authorized to update this session');
  }

  const allowedFields = [
    'location', 'latitude', 'longitude', 'session_date',
    'duration_minutes', 'wave_height', 'wave_count', 'wave_consistency',
    'shape', 'power', 'crowd', 'form', 'rating', 'gear', 'notes',
    'board_id', 'barrel_count', 'air_count', 'is_public',
  ];

  const setClause = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');

  if (!setClause) {
    throw new ApiError(400, 'No valid fields to update');
  }

  const values = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .map(key => updates[key]);

  const result = await query(
    `UPDATE sessions SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  res.json(result.rows[0]);
}));

// Delete session
router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Verify ownership
  const sessionCheck = await query('SELECT user_id FROM sessions WHERE id = $1', [id]);
  if (sessionCheck.rows.length === 0) {
    throw new ApiError(404, 'Session not found');
  }
  if (sessionCheck.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Not authorized to delete this session');
  }

  // Delete associated media from MinIO
  const mediaResult = await query('SELECT url FROM session_media WHERE session_id = $1', [id]);
  for (const media of mediaResult.rows) {
    try {
      // Extract object name from URL (format: /minio/bucket/object or full URL)
      const url = media.url;
      const bucketPath = `/${BUCKETS.SESSION_MEDIA}/`;
      const pathIndex = url.indexOf(bucketPath);
      if (pathIndex !== -1) {
        const objectName = url.substring(pathIndex + bucketPath.length);
        await deleteFile(BUCKETS.SESSION_MEDIA, objectName);
      }
    } catch (error) {
      console.error('Error deleting media file:', error);
      // Continue even if file deletion fails
    }
  }

  // Delete media records from database
  await query('DELETE FROM session_media WHERE session_id = $1', [id]);

  // Delete session
  await query('DELETE FROM sessions WHERE id = $1', [id]);

  res.json({ message: 'Session deleted successfully', id });
}));

export default router;
