import multer from 'multer';
import { Request } from 'express';
import { ApiError } from './errorHandler';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type ${file.mimetype} is not allowed`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 20971520, // 20MB default
    files: Number(process.env.MAX_FILES_PER_UPLOAD) || 5,
  },
});
