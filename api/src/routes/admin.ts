import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Middleware to check if user is admin
const requireAdmin = async (req: AuthRequest, res: any, next: any) => {
  const userId = req.userId;
  
  const result = await query(
    "SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin') as is_admin",
    [userId]
  );
  
  if (!result.rows[0].is_admin) {
    throw new ApiError(403, 'Admin access required');
  }
  
  next();
};

// Promote user to admin
router.post('/users/:userId/promote', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const { userId } = req.params;
  
  // Check if user already has admin role
  const checkResult = await query(
    "SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin') as is_admin",
    [userId]
  );
  
  if (checkResult.rows[0].is_admin) {
    throw new ApiError(400, 'User is already an admin');
  }
  
  // Add admin role
  await query(
    "INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')",
    [userId]
  );
  
  res.json({ message: 'User promoted to admin' });
}));

// Remove admin role from user
router.delete('/users/:userId/admin', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const { userId } = req.params;
  
  // Prevent removing own admin status
  if (userId === req.userId) {
    throw new ApiError(400, 'Cannot remove your own admin status');
  }
  
  // Remove admin role
  await query(
    "DELETE FROM user_roles WHERE user_id = $1 AND role = 'admin'",
    [userId]
  );
  
  res.json({ message: 'Admin role removed' });
}));

// Delete user (admin only)
router.delete('/users/:userId', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const { userId } = req.params;
  
  // Prevent deleting yourself
  if (userId === req.userId) {
    throw new ApiError(400, 'Cannot delete yourself');
  }
  
  // Delete user (cascade will handle related data)
  await query('DELETE FROM auth.users WHERE id = $1', [userId]);
  
  res.json({ message: 'User deleted' });
}));

export default router;
