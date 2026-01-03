import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Get comments for a spot (only today's comments using spot's timezone)
router.get('/spots/:spotId/comments', asyncHandler(async (req, res) => {
  const { spotId } = req.params;
  const { user_id } = req.query;
  
  // Get the spot's timezone
  const spotResult = await query('SELECT timezone FROM spots WHERE id = $1', [spotId]);
  const spotTimezone = spotResult.rows[0]?.timezone || 'America/Los_Angeles';
  
  // Use spot's timezone for "today" calculation
  const result = await query(
    `SELECT fc.*, p.display_name, p.avatar_url, p.total_shakas_received,
            (SELECT COUNT(*)::int FROM forecast_comment_likes WHERE comment_id = fc.id) as likes_count,
            (SELECT COUNT(*)::int FROM forecast_comment_kooks WHERE comment_id = fc.id) as kooks_count,
            ${user_id ? `EXISTS(SELECT 1 FROM forecast_comment_likes WHERE comment_id = fc.id AND user_id = $3) as is_liked,` : 'false as is_liked,'}
            ${user_id ? `EXISTS(SELECT 1 FROM forecast_comment_kooks WHERE comment_id = fc.id AND user_id = $3) as is_kooked` : 'false as is_kooked'}
     FROM forecast_comments fc
     JOIN profiles p ON fc.user_id = p.user_id
     WHERE fc.spot_id = $1 
       AND (fc.created_at AT TIME ZONE $2)::date = (NOW() AT TIME ZONE $2)::date
       AND fc.parent_id IS NULL
     ORDER BY fc.created_at DESC`,
    user_id ? [spotId, spotTimezone, user_id] : [spotId, spotTimezone]
  );
  
  // Fetch replies for each comment
  const commentsWithReplies = await Promise.all(
    result.rows.map(async (comment: any) => {
      const repliesResult = await query(
        `SELECT fc.*, p.display_name, p.avatar_url,
                (SELECT COUNT(*)::int FROM forecast_comment_likes WHERE comment_id = fc.id) as likes_count,
                (SELECT COUNT(*)::int FROM forecast_comment_kooks WHERE comment_id = fc.id) as kooks_count,
                ${user_id ? `EXISTS(SELECT 1 FROM forecast_comment_likes WHERE comment_id = fc.id AND user_id = $2) as is_liked,` : 'false as is_liked,'}
                ${user_id ? `EXISTS(SELECT 1 FROM forecast_comment_kooks WHERE comment_id = fc.id AND user_id = $2) as is_kooked` : 'false as is_kooked'}
         FROM forecast_comments fc
         JOIN profiles p ON fc.user_id = p.user_id
         WHERE fc.parent_id = $1
         ORDER BY fc.created_at ASC`,
        user_id ? [comment.id, user_id] : [comment.id]
      );
      
      return {
        ...comment,
        profile: {
          display_name: comment.display_name,
          avatar_url: comment.avatar_url,
          total_shakas_received: comment.total_shakas_received
        },
        replies: repliesResult.rows.map((reply: any) => ({
          ...reply,
          profile: {
            display_name: reply.display_name,
            avatar_url: reply.avatar_url
          },
          is_liked: reply.is_liked === true || reply.is_liked === 't',
          is_kooked: reply.is_kooked === true || reply.is_kooked === 't'
        })),
        is_liked: comment.is_liked === true || comment.is_liked === 't',
        is_kooked: comment.is_kooked === true || comment.is_kooked === 't'
      };
    })
  );
  
  res.json(commentsWithReplies);
}));

// Create a comment
router.post('/spots/:spotId/comments', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { spotId } = req.params;
  const { content, parent_id } = req.body;
  const user_id = req.userId;
  
  if (!content || !content.trim()) {
    throw new ApiError(400, 'Content is required');
  }
  
  const result = await query(
    'INSERT INTO forecast_comments (spot_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [spotId, user_id, content.trim(), parent_id || null]
  );
  
  res.status(201).json(result.rows[0]);
}));

// Like a comment
router.post('/comments/:commentId/like', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { commentId } = req.params;
  const user_id = req.userId;
  
  const result = await query(
    'INSERT INTO forecast_comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT (comment_id, user_id) DO NOTHING RETURNING *',
    [commentId, user_id]
  );
  
  res.status(201).json(result.rows[0] || { message: 'Already liked' });
}));

// Unlike a comment
router.delete('/comments/:commentId/like', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { commentId } = req.params;
  const user_id = req.userId;
  
  await query(
    'DELETE FROM forecast_comment_likes WHERE comment_id = $1 AND user_id = $2',
    [commentId, user_id]
  );
  
  res.json({ message: 'Unliked' });
}));

// Kook a comment
router.post('/comments/:commentId/kook', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { commentId } = req.params;
  const user_id = req.userId;
  
  const result = await query(
    'INSERT INTO forecast_comment_kooks (comment_id, user_id) VALUES ($1, $2) ON CONFLICT (comment_id, user_id) DO NOTHING RETURNING *',
    [commentId, user_id]
  );
  
  res.status(201).json(result.rows[0] || { message: 'Already kooked' });
}));

// Unkook a comment
router.delete('/comments/:commentId/kook', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { commentId } = req.params;
  const user_id = req.userId;
  
  await query(
    'DELETE FROM forecast_comment_kooks WHERE comment_id = $1 AND user_id = $2',
    [commentId, user_id]
  );
  
  res.json({ message: 'Unkooked' });
}));

// Delete a comment
router.delete('/comments/:commentId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { commentId } = req.params;
  const user_id = req.userId;
  
  // Verify comment exists
  const commentResult = await query(
    'SELECT user_id FROM forecast_comments WHERE id = $1',
    [commentId]
  );
  
  if (commentResult.rows.length === 0) {
    throw new ApiError(404, 'Comment not found');
  }

  // Check if user is admin
  const adminCheck = await query(
    "SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin') as is_admin",
    [user_id]
  );
  const isAdmin = adminCheck.rows[0].is_admin;
  
  // Allow deletion if user owns the comment OR is admin
  if (commentResult.rows[0].user_id !== user_id && !isAdmin) {
    throw new ApiError(403, 'Not authorized to delete this comment');
  }
  
  await query('DELETE FROM forecast_comments WHERE id = $1', [commentId]);
  
  res.json({ message: 'Comment deleted' });
}));

export default router;
