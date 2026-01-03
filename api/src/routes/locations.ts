import { Router } from 'express';
import { query } from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();

// Get user's saved locations
router.get('/user/:user_id', asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  
  const result = await query(
    `SELECT id, user_id, name, latitude, longitude, created_at
     FROM saved_locations
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [user_id]
  );
  
  res.json(result.rows);
}));

// Save a new location
router.post('/', asyncHandler(async (req, res) => {
  const { user_id, name, latitude, longitude } = req.body;
  
  if (!user_id || !name || latitude === undefined || longitude === undefined) {
    throw new ApiError(400, 'Missing required fields: user_id, name, latitude, longitude');
  }
  
  const result = await query(
    `INSERT INTO saved_locations (user_id, name, latitude, longitude)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [user_id, name, latitude, longitude]
  );
  
  res.status(201).json(result.rows[0]);
}));

// Delete a saved location
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(
    'DELETE FROM saved_locations WHERE id = $1 RETURNING *',
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Saved location not found');
  }
  
  res.json({ message: 'Location deleted successfully' });
}));

export default router;
