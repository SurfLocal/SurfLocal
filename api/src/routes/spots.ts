import { Router } from 'express';
import { query, analyticsQuery } from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0, search } = req.query;
  
  let queryText = 'SELECT * FROM spots';
  let params: any[] = [];
  
  if (search) {
    queryText += ' WHERE name ILIKE $1 OR location ILIKE $1';
    params.push(`%${search}%`);
    queryText += ' ORDER BY name LIMIT $2 OFFSET $3';
    params.push(limit, offset);
  } else {
    queryText += ' ORDER BY name LIMIT $1 OFFSET $2';
    params = [limit, offset];
  }
  
  const result = await query(queryText, params);
  res.json(result.rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await query('SELECT * FROM spots WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Spot not found');
  }
  
  res.json(result.rows[0]);
}));

// Time window definitions (in hours, 24-hour format)
const TIME_WINDOWS = {
  morning: { start: 5, end: 10 },    // 5am - 10am
  midday: { start: 10, end: 14 },    // 10am - 2pm
  afternoon: { start: 14, end: 19 }, // 2pm - 7pm
};

// Helper to get time window from session date
function getTimeWindow(sessionDate: Date): 'morning' | 'midday' | 'afternoon' | null {
  const hour = sessionDate.getHours();
  if (hour >= TIME_WINDOWS.morning.start && hour < TIME_WINDOWS.morning.end) return 'morning';
  if (hour >= TIME_WINDOWS.midday.start && hour < TIME_WINDOWS.midday.end) return 'midday';
  if (hour >= TIME_WINDOWS.afternoon.start && hour < TIME_WINDOWS.afternoon.end) return 'afternoon';
  return null;
}

// Helper to calculate consensus for a set of sessions (most frequent values)
function calculateConsensus(sessions: any[]) {
  if (sessions.length === 0) {
    return {
      session_count: 0,
      wave_height: null,
      shape: null,
      rating: null,
    };
  }
  
  return {
    session_count: sessions.length,
    wave_height: getMostCommon(sessions, 'wave_height'),
    shape: getMostCommon(sessions, 'shape'),
    rating: getMostCommon(sessions, 'rating'),
  };
}

// Helper to get current hour in a specific timezone
function getCurrentHourInTimezone(timezone: string): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false
  });
  return parseInt(formatter.format(now), 10);
}

// Helper to get time window for a session in the spot's timezone
function getTimeWindowInTimezone(sessionDate: Date, timezone: string): 'morning' | 'midday' | 'afternoon' | null {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false
  });
  const hour = parseInt(formatter.format(sessionDate), 10);
  if (hour >= TIME_WINDOWS.morning.start && hour < TIME_WINDOWS.morning.end) return 'morning';
  if (hour >= TIME_WINDOWS.midday.start && hour < TIME_WINDOWS.midday.end) return 'midday';
  if (hour >= TIME_WINDOWS.afternoon.start && hour < TIME_WINDOWS.afternoon.end) return 'afternoon';
  return null;
}

// Get spot report with user consensus from TODAY's sessions only (time-windowed)
// Uses the spot's timezone for all time calculations
router.get('/:id/report', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get the spot (includes timezone)
  const spotResult = await query('SELECT * FROM spots WHERE id = $1', [id]);
  if (spotResult.rows.length === 0) {
    throw new ApiError(404, 'Spot not found');
  }
  const spot = spotResult.rows[0];
  const spotTimezone = spot.timezone || 'America/Los_Angeles';
  
  // Get sessions at this spot for TODAY only (using spot's timezone)
  const sessionsResult = await query(
    `SELECT 
      wave_height, wave_consistency, shape, power, crowd, rating,
      session_date, duration_minutes
     FROM sessions 
     WHERE (location ILIKE $1 OR location ILIKE $2)
       AND (session_date AT TIME ZONE $3)::date = (NOW() AT TIME ZONE $3)::date
     ORDER BY session_date DESC`,
    [`%${spot.name}%`, `%${spot.location}%`, spotTimezone]
  );
  
  const sessions = sessionsResult.rows;
  
  // Group sessions by time window (using spot's timezone)
  const windowedSessions: Record<string, any[]> = {
    morning: [],
    midday: [],
    afternoon: [],
  };
  
  sessions.forEach(session => {
    const window = getTimeWindowInTimezone(new Date(session.session_date), spotTimezone);
    if (window) {
      windowedSessions[window].push(session);
    }
  });
  
  // Calculate consensus for each time window (most frequent values)
  const consensus = {
    morning: calculateConsensus(windowedSessions.morning),
    midday: calculateConsensus(windowedSessions.midday),
    afternoon: calculateConsensus(windowedSessions.afternoon),
  };
  
  // Determine which time period has the most recent consensus (in spot's timezone)
  const currentHour = getCurrentHourInTimezone(spotTimezone);
  let latestConsensusTime: 'morning' | 'midday' | 'afternoon' | null = null;
  
  // Check time periods in reverse order (afternoon -> midday -> morning)
  // to find the most recent one with data
  if (consensus.afternoon.session_count > 0 && currentHour >= TIME_WINDOWS.afternoon.start) {
    latestConsensusTime = 'afternoon';
  } else if (consensus.midday.session_count > 0 && currentHour >= TIME_WINDOWS.midday.start) {
    latestConsensusTime = 'midday';
  } else if (consensus.morning.session_count > 0) {
    latestConsensusTime = 'morning';
  }
  
  // If no sessions today at all, check if we're in a time window and default to that
  if (!latestConsensusTime) {
    if (currentHour >= TIME_WINDOWS.afternoon.start && currentHour < TIME_WINDOWS.afternoon.end) {
      latestConsensusTime = 'afternoon';
    } else if (currentHour >= TIME_WINDOWS.midday.start && currentHour < TIME_WINDOWS.midday.end) {
      latestConsensusTime = 'midday';
    } else if (currentHour >= TIME_WINDOWS.morning.start && currentHour < TIME_WINDOWS.morning.end) {
      latestConsensusTime = 'morning';
    } else {
      latestConsensusTime = 'morning'; // Default
    }
  }
  
  res.json({
    spot,
    consensus,
    latest_consensus_time: latestConsensusTime,
    has_consensus_today: sessions.length > 0,
    recent_sessions: sessions.slice(0, 5),
    time_windows: TIME_WINDOWS,
    spot_timezone: spotTimezone,
  });
}));

// Helper function to get most common value
function getMostCommon(arr: any[], field: string): string | null {
  const values = arr.map(item => item[field]).filter(v => v != null);
  if (values.length === 0) return null;
  
  const counts: Record<string, number> = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// Helper to convert wind degrees to cardinal direction
function degreesToCardinal(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Helper to format height/tide with 1 decimal max, omit .0
function formatHeight(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? `${Math.floor(rounded)}` : `${rounded.toFixed(1)}`;
}

// Get live spot data from surf_analytics (swell and wind)
router.get('/:id/live', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get the spot from salt_app
  const spotResult = await query('SELECT * FROM spots WHERE id = $1', [id]);
  if (spotResult.rows.length === 0) {
    throw new ApiError(404, 'Spot not found');
  }
  const spot = spotResult.rows[0];
  
  try {
    // Find matching spot in surf_analytics by name
    const analyticsSpotResult = await analyticsQuery(
      `SELECT id FROM reference.spot_info WHERE name ILIKE $1 LIMIT 1`,
      [`%${spot.name}%`]
    );
    
    let swellData = null;
    let windData = null;
    let tideData = null;
    
    if (analyticsSpotResult.rows.length > 0) {
      const analyticsSpotId = analyticsSpotResult.rows[0].id;
      
      // Get latest wind data for this spot
      const windResult = await analyticsQuery(
        `SELECT timestamp, wind_speed, wind_direction, wind_gust
         FROM ingested.wind_data
         WHERE spot_id = $1
         ORDER BY timestamp DESC
         LIMIT 1`,
        [analyticsSpotId]
      );
      
      if (windResult.rows.length > 0) {
        const w = windResult.rows[0];
        const windDir = w.wind_direction != null ? degreesToCardinal(w.wind_direction) : null;
        const windSpeed = w.wind_speed != null ? Math.round(w.wind_speed) : null;
        windData = {
          formatted: windSpeed != null && windDir ? `${windSpeed} kts ${windDir}` : null,
          speed: windSpeed,
          direction: windDir,
          direction_degrees: w.wind_direction,
          timestamp: w.timestamp,
        };
      }
      
      // Get linked buoy for swell data
      const buoyLinkResult = await analyticsQuery(
        `SELECT buoy_id FROM reference.spot_buoy_link WHERE spot_id = $1 LIMIT 1`,
        [analyticsSpotId]
      );
      
      if (buoyLinkResult.rows.length > 0) {
        const buoyId = buoyLinkResult.rows[0].buoy_id;
        
        // Get latest swell data from linked buoy
        const swellResult = await analyticsQuery(
          `SELECT timestamp, wave_height, swell_height, swell_period, swell_direction, tide
           FROM ingested.swell_data
           WHERE buoy_id = $1
           ORDER BY timestamp DESC
           LIMIT 1`,
          [buoyId]
        );
        
        if (swellResult.rows.length > 0) {
          const s = swellResult.rows[0];
          const height = s.swell_height || s.wave_height;
          const period = s.swell_period != null ? Math.round(s.swell_period) : null;
          const direction = s.swell_direction || null;
          
          swellData = {
            formatted: height != null ? `${formatHeight(height)}ft ${period}s ${direction || ''}`.trim() : null,
            height: height != null ? formatHeight(height) : null,
            period: period,
            direction: direction,
            timestamp: s.timestamp,
          };
          
          if (s.tide != null) {
            tideData = {
              formatted: `${formatHeight(s.tide)} ft`,
              height: formatHeight(s.tide),
            };
          }
        }
      }
    }
    
    res.json({
      spot_id: id,
      spot_name: spot.name,
      swell: swellData,
      wind: windData,
      tide: tideData,
      updated_at: swellData?.timestamp || windData?.timestamp || null,
    });
  } catch (error) {
    console.error('Error fetching live spot data:', error);
    // Return empty data if surf_analytics is unavailable
    res.json({
      spot_id: id,
      spot_name: spot.name,
      swell: null,
      wind: null,
      tide: null,
      error: 'Live data temporarily unavailable',
    });
  }
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, location, latitude, longitude, description, difficulty, break_type } = req.body;

  if (!name || !location || latitude === undefined || longitude === undefined) {
    throw new ApiError(400, 'Missing required fields');
  }

  const result = await query(
    `INSERT INTO spots (name, location, latitude, longitude, description, difficulty, break_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [name, location, latitude, longitude, description, difficulty, break_type]
  );

  res.status(201).json(result.rows[0]);
}));

// ==================== FORECAST COMMENTS (Daily Discussion) ====================

// Get forecast comments for a spot (daily discussion)
router.get('/:id/comments', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const result = await query(
    `SELECT c.*, p.display_name, p.avatar_url,
            (SELECT COUNT(*) FROM forecast_comment_likes WHERE comment_id = c.id) as like_count,
            (SELECT COUNT(*) FROM forecast_comment_kooks WHERE comment_id = c.id) as kook_count
     FROM forecast_comments c
     JOIN profiles p ON c.user_id = p.user_id
     WHERE c.spot_id = $1 AND c.parent_id IS NULL
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [id, limit, offset]
  );
  
  res.json(result.rows);
}));

// Add a forecast comment (daily discussion)
router.post('/:id/comments', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user_id, content, parent_id } = req.body;
  
  if (!user_id || !content) {
    throw new ApiError(400, 'user_id and content are required');
  }
  
  const result = await query(
    `INSERT INTO forecast_comments (spot_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, user_id, content, parent_id || null]
  );
  
  res.status(201).json(result.rows[0]);
}));

// Delete a forecast comment
router.delete('/comments/:comment_id', asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const { user_id } = req.body;
  
  // Verify ownership
  const check = await query('SELECT user_id FROM forecast_comments WHERE id = $1', [comment_id]);
  if (check.rows.length === 0) {
    throw new ApiError(404, 'Comment not found');
  }
  if (check.rows[0].user_id !== user_id) {
    throw new ApiError(403, 'Not authorized to delete this comment');
  }
  
  await query('DELETE FROM forecast_comments WHERE id = $1', [comment_id]);
  res.json({ message: 'Comment deleted' });
}));

// Like a forecast comment
router.post('/comments/:comment_id/like', asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const { user_id } = req.body;
  
  if (!user_id) {
    throw new ApiError(400, 'user_id is required');
  }
  
  await query(
    `INSERT INTO forecast_comment_likes (comment_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (comment_id, user_id) DO NOTHING`,
    [comment_id, user_id]
  );
  
  res.status(201).json({ message: 'Comment liked' });
}));

// Unlike a forecast comment
router.delete('/comments/:comment_id/like', asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const { user_id } = req.body;
  
  await query(
    'DELETE FROM forecast_comment_likes WHERE comment_id = $1 AND user_id = $2',
    [comment_id, user_id]
  );
  
  res.json({ message: 'Like removed' });
}));

// Kook a forecast comment
router.post('/comments/:comment_id/kook', asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const { user_id } = req.body;
  
  if (!user_id) {
    throw new ApiError(400, 'user_id is required');
  }
  
  await query(
    `INSERT INTO forecast_comment_kooks (comment_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (comment_id, user_id) DO NOTHING`,
    [comment_id, user_id]
  );
  
  res.status(201).json({ message: 'Comment kook\'d' });
}));

// Un-kook a forecast comment
router.delete('/comments/:comment_id/kook', asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const { user_id } = req.body;
  
  await query(
    'DELETE FROM forecast_comment_kooks WHERE comment_id = $1 AND user_id = $2',
    [comment_id, user_id]
  );
  
  res.json({ message: 'Kook removed' });
}));

// ==================== SPOT PHOTOS ====================

// Get photos from sessions at this spot
router.get('/:id/photos', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  // Get the spot
  const spotResult = await query('SELECT * FROM spots WHERE id = $1', [id]);
  if (spotResult.rows.length === 0) {
    throw new ApiError(404, 'Spot not found');
  }
  const spot = spotResult.rows[0];
  
  // Get photos from public sessions at this spot (matching by location name)
  const result = await query(
    `SELECT sm.id, sm.url, sm.media_type, sm.session_id, sm.user_id, sm.created_at,
            s.session_date, s.location,
            p.display_name, p.avatar_url
     FROM session_media sm
     JOIN sessions s ON sm.session_id = s.id
     JOIN profiles p ON sm.user_id = p.user_id
     WHERE s.is_public = true
       AND (s.location ILIKE $1 OR s.location ILIKE $2)
     ORDER BY sm.created_at DESC
     LIMIT $3 OFFSET $4`,
    [`%${spot.name}%`, `%${spot.location}%`, limit, offset]
  );
  
  res.json(result.rows);
}));

// ==================== FAVORITE SPOTS ====================

// Get user's favorite spots
router.get('/favorites/:user_id', asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  
  const result = await query(
    `SELECT s.*, fs.display_order, fs.created_at as favorited_at
     FROM favorite_spots fs
     JOIN spots s ON fs.spot_id = s.id
     WHERE fs.user_id = $1
     ORDER BY fs.display_order ASC, fs.created_at DESC`,
    [user_id]
  );
  
  res.json(result.rows);
}));

// Save/add a spot to favorites
router.post('/favorites', asyncHandler(async (req, res) => {
  const { user_id, spot_id } = req.body;
  
  if (!user_id || !spot_id) {
    throw new ApiError(400, 'user_id and spot_id are required');
  }
  
  // Get the next display order
  const orderResult = await query(
    'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM favorite_spots WHERE user_id = $1',
    [user_id]
  );
  const nextOrder = orderResult.rows[0].next_order;
  
  const result = await query(
    `INSERT INTO favorite_spots (user_id, spot_id, display_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, spot_id) DO NOTHING
     RETURNING *`,
    [user_id, spot_id, nextOrder]
  );
  
  if (result.rows.length === 0) {
    throw new ApiError(409, 'Spot already in favorites');
  }
  
  res.status(201).json(result.rows[0]);
}));

// Remove a spot from favorites
router.delete('/favorites/:user_id/:spot_id', asyncHandler(async (req, res) => {
  const { user_id, spot_id } = req.params;
  
  const result = await query(
    'DELETE FROM favorite_spots WHERE user_id = $1 AND spot_id = $2 RETURNING *',
    [user_id, spot_id]
  );
  
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Favorite not found');
  }
  
  res.json({ message: 'Spot removed from favorites' });
}));

// Check if a spot is in user's favorites
router.get('/favorites/:user_id/:spot_id', asyncHandler(async (req, res) => {
  const { user_id, spot_id } = req.params;
  
  const result = await query(
    'SELECT * FROM favorite_spots WHERE user_id = $1 AND spot_id = $2',
    [user_id, spot_id]
  );
  
  res.json({ isFavorite: result.rows.length > 0 });
}));

export default router;
