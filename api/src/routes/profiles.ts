import { Router } from 'express';
import { query } from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();

// Search profiles - MUST be before /:id route to avoid conflict
router.get('/search', asyncHandler(async (req, res) => {
  const { q, limit = 50 } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.json([]);
  }
  
  const result = await query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM sessions WHERE user_id = p.user_id) as session_count,
            (SELECT COUNT(*) FROM boards WHERE user_id = p.user_id) as board_count,
            (SELECT COUNT(*) FROM follows WHERE following_id = p.user_id) as follower_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = p.user_id) as following_count,
            EXISTS(SELECT 1 FROM user_roles WHERE user_id = p.user_id AND role = 'admin') as is_admin
     FROM profiles p
     WHERE p.display_name ILIKE $1 OR p.bio ILIKE $1
     ORDER BY follower_count DESC
     LIMIT $2`,
    [`%${q}%`, limit]
  );
  
  res.json(result.rows);
}));

// Get profile by user ID
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const result = await query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM sessions WHERE user_id = p.user_id) as session_count,
            (SELECT COUNT(*) FROM boards WHERE user_id = p.user_id) as board_count,
            (SELECT COUNT(*) FROM follows WHERE following_id = p.user_id) as follower_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = p.user_id) as following_count
     FROM profiles p
     WHERE p.user_id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Profile not found');
  }
  
  res.json(result.rows[0]);
}));

// Get profile by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM sessions WHERE user_id = p.user_id) as session_count,
            (SELECT COUNT(*) FROM boards WHERE user_id = p.user_id) as board_count,
            (SELECT COUNT(*) FROM follows WHERE following_id = p.user_id) as follower_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = p.user_id) as following_count
     FROM profiles p
     WHERE p.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Profile not found');
  }
  
  res.json(result.rows[0]);
}));

// Update profile
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = [
    'display_name', 'bio', 'avatar_url', 'home_break', 'years_surfing',
    'longest_streak', 'longest_streak_start',
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
    `UPDATE profiles SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Profile not found');
  }

  res.json(result.rows[0]);
}));

export default router;
