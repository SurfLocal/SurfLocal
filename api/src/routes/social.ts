import { Router } from 'express';
import { query } from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Session Likes
router.post('/sessions/:sessionId/like', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { sessionId } = req.params;
  const user_id = req.userId;

  const result = await query(
    'INSERT INTO session_likes (session_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
    [sessionId, user_id]
  );

  res.status(201).json(result.rows[0] || { message: 'Already liked' });
}));

router.delete('/sessions/:sessionId/like', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { sessionId } = req.params;

  await query('DELETE FROM session_likes WHERE session_id = $1 AND user_id = $2', [sessionId, req.userId]);
  res.json({ message: 'Like removed' });
}));

// Session Kooks
router.post('/sessions/:sessionId/kook', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { sessionId } = req.params;
  const user_id = req.userId;

  const result = await query(
    'INSERT INTO session_kooks (session_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
    [sessionId, user_id]
  );

  res.status(201).json(result.rows[0] || { message: 'Already kooked' });
}));

router.delete('/sessions/:sessionId/kook', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { sessionId } = req.params;

  await query('DELETE FROM session_kooks WHERE session_id = $1 AND user_id = $2', [sessionId, req.userId]);
  res.json({ message: 'Kook removed' });
}));

// Session Comments
router.get('/sessions/:sessionId/comments', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const result = await query(
    `SELECT c.*, p.display_name, p.avatar_url
     FROM session_comments c
     JOIN profiles p ON c.user_id = p.user_id
     WHERE c.session_id = $1
     ORDER BY c.created_at DESC`,
    [sessionId]
  );

  res.json(result.rows);
}));

router.post('/sessions/:sessionId/comments', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { sessionId } = req.params;
  const { content } = req.body;
  const user_id = req.userId;

  if (!content) {
    throw new ApiError(400, 'content is required');
  }

  const result = await query(
    'INSERT INTO session_comments (session_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
    [sessionId, user_id, content]
  );

  res.status(201).json(result.rows[0]);
}));

router.delete('/comments/:commentId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { commentId } = req.params;

  // Verify comment exists
  const commentCheck = await query('SELECT user_id FROM session_comments WHERE id = $1', [commentId]);
  if (commentCheck.rows.length === 0) {
    throw new ApiError(404, 'Comment not found');
  }

  // Check if user is admin
  const adminCheck = await query(
    "SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin') as is_admin",
    [req.userId]
  );
  const isAdmin = adminCheck.rows[0].is_admin;

  // Allow deletion if user owns the comment OR is admin
  if (commentCheck.rows[0].user_id !== req.userId && !isAdmin) {
    throw new ApiError(403, 'Not authorized to delete this comment');
  }

  await query('DELETE FROM session_comments WHERE id = $1', [commentId]);
  res.json({ message: 'Comment deleted' });
}));

// Follows
router.post('/follow', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { following_id } = req.body;
  const follower_id = req.userId;

  if (!following_id) {
    throw new ApiError(400, 'following_id is required');
  }

  if (follower_id === following_id) {
    throw new ApiError(400, 'Cannot follow yourself');
  }

  const result = await query(
    'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
    [follower_id, following_id]
  );

  res.status(201).json(result.rows[0] || { message: 'Already following' });
}));

router.delete('/follow/:followingId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { followingId } = req.params;

  await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.userId, followingId]);
  res.json({ message: 'Unfollowed' });
}));

router.get('/followers/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await query(
    `SELECT p.* FROM profiles p
     JOIN follows f ON p.user_id = f.follower_id
     WHERE f.following_id = $1`,
    [userId]
  );

  res.json(result.rows);
}));

router.get('/following/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await query(
    `SELECT p.* FROM profiles p
     JOIN follows f ON p.user_id = f.following_id
     WHERE f.follower_id = $1`,
    [userId]
  );

  res.json(result.rows);
}));

// Get follow stats for a user (followers count, following count, and if current user is following)
router.get('/follow-stats/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { current_user } = req.query;

  const [followersResult, followingResult, isFollowingResult] = await Promise.all([
    query('SELECT COUNT(*) as count FROM follows WHERE following_id = $1', [userId]),
    query('SELECT COUNT(*) as count FROM follows WHERE follower_id = $1', [userId]),
    current_user 
      ? query('SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2) as is_following', [current_user, userId])
      : Promise.resolve({ rows: [{ is_following: false }] })
  ]);

  res.json({
    followers_count: parseInt(followersResult.rows[0].count),
    following_count: parseInt(followingResult.rows[0].count),
    is_following: current_user ? isFollowingResult.rows[0].is_following : false
  });
}));

// Get top followed surfers (for Find Friends page)
router.get('/top-surfers', asyncHandler(async (req, res) => {
  const { exclude, limit = 5 } = req.query;

  const result = await query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM sessions WHERE user_id = p.user_id) as session_count,
            (SELECT COUNT(*) FROM boards WHERE user_id = p.user_id) as board_count,
            (SELECT COUNT(*) FROM follows WHERE following_id = p.user_id) as follower_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = p.user_id) as following_count
     FROM profiles p
     WHERE p.user_id != $1
     ORDER BY follower_count DESC
     LIMIT $2`,
    [exclude || '', limit]
  );

  res.json(result.rows);
}));

// Search profiles (for Find Friends page)
router.get('/search-profiles', asyncHandler(async (req, res) => {
  const { q, limit = 50 } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.json([]);
  }
  
  // Sanitize search input - escape LIKE/ILIKE special characters
  const sanitizedQuery = q.replace(/[%_\\]/g, '\\$&');
  
  const result = await query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM sessions WHERE user_id = p.user_id) as session_count,
            (SELECT COUNT(*) FROM boards WHERE user_id = p.user_id) as board_count,
            (SELECT COUNT(*) FROM follows WHERE following_id = p.user_id) as follower_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = p.user_id) as following_count
     FROM profiles p
     WHERE p.display_name ILIKE $1 OR p.bio ILIKE $1
     ORDER BY follower_count DESC
     LIMIT $2`,
    [`%${sanitizedQuery}%`, limit]
  );
  
  res.json(result.rows);
}));

export default router;
