import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as string;

// Sign Up
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Check if user exists
  const existingUser = await query(
    'SELECT id FROM auth.users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw new ApiError(400, 'Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const userResult = await query(
    `INSERT INTO auth.users (email, password_hash, email_confirmed)
     VALUES ($1, $2, false) RETURNING id, email, created_at`,
    [email.toLowerCase(), passwordHash]
  );

  const user = userResult.rows[0];

  // Profile is auto-created by trigger, but we can update display_name
  if (displayName) {
    await query(
      'UPDATE profiles SET display_name = $1 WHERE user_id = $2',
      [displayName, user.id]
    );
  }

  // Generate JWT
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    token,
  });
}));

// Sign In
router.post('/signin', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Get user
  const userResult = await query(
    'SELECT id, email, password_hash, email_confirmed FROM auth.users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (userResult.rows.length === 0) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = userResult.rows[0];

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Update last sign in
  await query(
    'UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1',
    [user.id]
  );

  // Generate JWT
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      email_confirmed: user.email_confirmed,
    },
    token,
  });
}));

// Get Current User
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const userResult = await query(
    `SELECT u.id, u.email, u.email_confirmed, u.created_at,
            p.display_name, p.avatar_url, p.bio
     FROM auth.users u
     LEFT JOIN profiles p ON u.id = p.user_id
     WHERE u.id = $1`,
    [req.userId]
  );

  if (userResult.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  res.json(userResult.rows[0]);
}));

// Change Password
router.post('/change-password', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required');
  }

  // Get current password hash
  const userResult = await query(
    'SELECT password_hash FROM auth.users WHERE id = $1',
    [req.userId]
  );

  const user = userResult.rows[0];

  // Verify current password
  const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

  if (!validPassword) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await query(
    'UPDATE auth.users SET password_hash = $1, updated_at = now() WHERE id = $2',
    [newPasswordHash, req.userId]
  );

  res.json({ message: 'Password updated successfully' });
}));

// Request Password Reset
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const userResult = await query(
    'SELECT id FROM auth.users WHERE email = $1',
    [email.toLowerCase()]
  );

  // Always return success to prevent email enumeration
  if (userResult.rows.length === 0) {
    res.json({ message: 'If email exists, reset link will be sent' });
    return;
  }

  const user = userResult.rows[0];
  const resetToken = uuidv4();
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  await query(
    'UPDATE auth.users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
    [resetToken, expiresAt, user.id]
  );

  // TODO: Send email with reset link
  // For now, just log it (remove in production)
  console.log(`Reset token for ${email}: ${resetToken}`);

  res.json({ message: 'If email exists, reset link will be sent' });
}));

// Confirm Password Reset
router.post('/confirm-reset', asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required');
  }

  const userResult = await query(
    `SELECT id FROM auth.users 
     WHERE reset_token = $1 AND reset_token_expires_at > now()`,
    [token]
  );

  if (userResult.rows.length === 0) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  const user = userResult.rows[0];
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await query(
    `UPDATE auth.users 
     SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL, updated_at = now()
     WHERE id = $2`,
    [newPasswordHash, user.id]
  );

  res.json({ message: 'Password reset successfully' });
}));

// Check if user is admin
router.get('/check-admin/:user_id', asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  
  const result = await query(
    "SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin') as is_admin",
    [user_id]
  );
  
  res.json({ isAdmin: result.rows[0].is_admin });
}));

export default router;
