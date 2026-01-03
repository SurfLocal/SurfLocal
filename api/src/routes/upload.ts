import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { upload } from '../middleware/upload';
import { uploadFile, deleteFile, BUCKETS, getFileUrl } from '../config/minio';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

router.post('/session-media', authenticate, upload.array('files', 5), asyncHandler(async (req: AuthRequest, res) => {
  const files = req.files as Express.Multer.File[];
  const { session_id } = req.body;
  const user_id = req.userId;

  if (!session_id) {
    throw new ApiError(400, 'session_id is required');
  }

  // Verify session ownership
  const sessionCheck = await query('SELECT user_id FROM sessions WHERE id = $1', [session_id]);
  if (sessionCheck.rows.length === 0) {
    throw new ApiError(404, 'Session not found');
  }
  if (sessionCheck.rows[0].user_id !== user_id) {
    throw new ApiError(403, 'Not authorized to upload media to this session');
  }

  if (!files || files.length === 0) {
    throw new ApiError(400, 'No files uploaded');
  }

  const uploadedFiles = [];

  for (const file of files) {
    const fileExtension = file.originalname.split('.').pop();
    const objectName = `${user_id}/${session_id}/${uuidv4()}.${fileExtension}`;

    await uploadFile(
      BUCKETS.SESSION_MEDIA,
      objectName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype }
    );

    const url = getFileUrl(BUCKETS.SESSION_MEDIA, objectName);

    const result = await query(
      'INSERT INTO session_media (session_id, user_id, url, media_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [session_id, user_id, url, file.mimetype]
    );

    uploadedFiles.push(result.rows[0]);
  }

  res.status(201).json(uploadedFiles);
}));

router.post('/avatar', authenticate, upload.single('file'), asyncHandler(async (req: AuthRequest, res) => {
  const file = req.file;
  const user_id = req.userId;

  if (!file) {
    throw new ApiError(400, 'No file uploaded');
  }

  // Get old avatar URL to delete after uploading new one
  const oldAvatarResult = await query('SELECT avatar_url FROM profiles WHERE user_id = $1', [user_id]);
  const oldAvatarUrl = oldAvatarResult.rows[0]?.avatar_url;

  const fileExtension = file.originalname.split('.').pop();
  const objectName = `${user_id}/avatar.${fileExtension}`;

  await uploadFile(
    BUCKETS.AVATARS,
    objectName,
    file.buffer,
    file.size,
    { 'Content-Type': file.mimetype }
  );

  const url = getFileUrl(BUCKETS.AVATARS, objectName);

  await query('UPDATE profiles SET avatar_url = $1 WHERE user_id = $2', [url, user_id]);

  // Delete old avatar from MinIO if it exists and is different from new one
  if (oldAvatarUrl && oldAvatarUrl !== url) {
    try {
      const bucketPath = `/${BUCKETS.AVATARS}/`;
      const pathIndex = oldAvatarUrl.indexOf(bucketPath);
      if (pathIndex !== -1) {
        const oldObjectName = oldAvatarUrl.substring(pathIndex + bucketPath.length);
        await deleteFile(BUCKETS.AVATARS, oldObjectName);
      }
    } catch (error) {
      console.error('Error deleting old avatar:', error);
    }
  }

  res.json({ url });
}));

router.post('/board-photo', authenticate, upload.single('file'), asyncHandler(async (req: AuthRequest, res) => {
  const file = req.file;
  const { board_id } = req.body;
  const user_id = req.userId;

  if (!board_id) {
    throw new ApiError(400, 'board_id is required');
  }

  if (!file) {
    throw new ApiError(400, 'No file uploaded');
  }

  // Verify board ownership
  const boardCheck = await query('SELECT user_id, photo_url FROM boards WHERE id = $1', [board_id]);
  if (boardCheck.rows.length === 0) {
    throw new ApiError(404, 'Board not found');
  }
  if (boardCheck.rows[0].user_id !== user_id) {
    throw new ApiError(403, 'Not authorized to upload photo to this board');
  }

  const oldPhotoResult = boardCheck;
  const oldPhotoUrl = oldPhotoResult.rows[0]?.photo_url;

  const fileExtension = file.originalname.split('.').pop();
  // Add timestamp to filename to prevent browser caching old images
  const timestamp = Date.now();
  const objectName = `${user_id}/${board_id}_${timestamp}.${fileExtension}`;

  await uploadFile(
    BUCKETS.BOARD_PHOTOS,
    objectName,
    file.buffer,
    file.size,
    { 'Content-Type': file.mimetype }
  );

  const url = getFileUrl(BUCKETS.BOARD_PHOTOS, objectName);

  await query('UPDATE boards SET photo_url = $1 WHERE id = $2', [url, board_id]);

  // Delete old board photo from MinIO if it exists
  if (oldPhotoUrl) {
    try {
      const bucketPath = `/${BUCKETS.BOARD_PHOTOS}/`;
      const pathIndex = oldPhotoUrl.indexOf(bucketPath);
      if (pathIndex !== -1) {
        const oldObjectName = oldPhotoUrl.substring(pathIndex + bucketPath.length);
        await deleteFile(BUCKETS.BOARD_PHOTOS, oldObjectName);
      }
    } catch (error) {
      console.error('Error deleting old board photo:', error);
    }
  }

  res.json({ url });
}));

router.delete('/file', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { bucket, objectName } = req.body;
  const user_id = req.userId;

  if (!bucket || !objectName) {
    throw new ApiError(400, 'bucket and objectName are required');
  }

  // Validate bucket is one of our allowed buckets
  const allowedBuckets = [BUCKETS.SESSION_MEDIA, BUCKETS.AVATARS, BUCKETS.BOARD_PHOTOS];
  if (!allowedBuckets.includes(bucket)) {
    throw new ApiError(400, 'Invalid bucket');
  }

  // Verify user owns the file by checking the path starts with their user_id
  if (!objectName.startsWith(`${user_id}/`)) {
    throw new ApiError(403, 'Not authorized to delete this file');
  }

  await deleteFile(bucket, objectName);

  res.json({ message: 'File deleted successfully' });
}));

export default router;
