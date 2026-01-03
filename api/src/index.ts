import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pool } from './config/database';
import { ensureBucketsExist } from './config/minio';
import { errorHandler } from './middleware/errorHandler';

import authRouter from './routes/auth';
import sessionsRouter from './routes/sessions';
import boardsRouter from './routes/boards';
import profilesRouter from './routes/profiles';
import spotsRouter from './routes/spots';
import socialRouter from './routes/social';
import uploadRouter from './routes/upload';
import locationsRouter from './routes/locations';
import forecastRouter from './routes/forecast';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting - enabled in production
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  message: 'Too many requests from this IP, please try again later.',
  skip: () => process.env.NODE_ENV !== 'production', // Skip in development
});

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: (error as Error).message });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/spots', spotsRouter);
app.use('/api/social', socialRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/forecast', forecastRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Database connection established');

    await ensureBucketsExist();
    console.log('MinIO buckets verified');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
