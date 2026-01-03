import { Router } from 'express';
import { query } from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { deleteFile, BUCKETS } from '../config/minio';

const router = Router();

// Get all boards for a user
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const result = await query(
    'SELECT * FROM boards WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  
  res.json(result.rows);
}));

// Get board by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query('SELECT * FROM boards WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Board not found');
  }
  
  res.json(result.rows[0]);
}));

// Create new board
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const {
    name,
    brand,
    model,
    board_type,
    length_feet,
    length_inches,
    volume_liters,
    photo_url,
    notes,
  } = req.body;

  const user_id = req.userId;

  if (!name) {
    throw new ApiError(400, 'Missing required field: name');
  }

  const result = await query(
    `INSERT INTO boards (
      user_id, name, brand, model, board_type,
      length_feet, length_inches, volume_liters, photo_url, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [user_id, name, brand, model, board_type, length_feet, length_inches, volume_liters, photo_url, notes]
  );

  res.status(201).json(result.rows[0]);
}));

// Update board
router.put('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Verify ownership
  const boardCheck = await query('SELECT user_id FROM boards WHERE id = $1', [id]);
  if (boardCheck.rows.length === 0) {
    throw new ApiError(404, 'Board not found');
  }
  if (boardCheck.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Not authorized to update this board');
  }

  const allowedFields = [
    'name', 'brand', 'model', 'board_type',
    'length_feet', 'length_inches', 'volume_liters', 'photo_url', 'notes',
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
    `UPDATE boards SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  res.json(result.rows[0]);
}));

// Delete board
router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Verify ownership and get photo_url
  const boardCheck = await query('SELECT user_id, photo_url FROM boards WHERE id = $1', [id]);
  if (boardCheck.rows.length === 0) {
    throw new ApiError(404, 'Board not found');
  }
  if (boardCheck.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Not authorized to delete this board');
  }

  // Delete board photo from MinIO if exists
  const photoUrl = boardCheck.rows[0].photo_url;
  if (photoUrl) {
    try {
      const bucketPath = `/${BUCKETS.BOARD_PHOTOS}/`;
      const pathIndex = photoUrl.indexOf(bucketPath);
      if (pathIndex !== -1) {
        const objectName = photoUrl.substring(pathIndex + bucketPath.length);
        await deleteFile(BUCKETS.BOARD_PHOTOS, objectName);
      }
    } catch (error) {
      console.error('Error deleting board photo:', error);
    }
  }

  await query('DELETE FROM boards WHERE id = $1', [id]);

  res.json({ message: 'Board deleted successfully', id });
}));

export default router;
