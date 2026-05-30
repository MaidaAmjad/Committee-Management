import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  const allowedOrigins = new Set([
    env.clientUrl,
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'https://committee-management-ten.vercel.app',
  ]);

  for (const extra of (process.env.ALLOWED_ORIGINS || '').split(',')) {
    const origin = extra.trim();
    if (origin) allowedOrigins.add(origin);
  }

  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser tools (no Origin header) and known dev/prod frontends
        if (!origin || allowedOrigins.has(origin) || env.nodeEnv === 'development') {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10kb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  });

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'TrustCom API',
      health: '/health',
      auth: '/api/auth',
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ success: true, status: 'ok' });
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/admin', authLimiter, adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
