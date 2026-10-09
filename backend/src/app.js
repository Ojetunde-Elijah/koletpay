import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import publicRoutes from './routes/public.js';
import assistantRoutes from './routes/assistant.js';
import { requireAuth } from './middleware/auth.js';

const limiter = (windowMs, max) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false, skip: () => config.isTest,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' },
});

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Render sits behind a proxy
  app.use(helmet());
  app.use(cors({
    origin(origin, cb) {
      if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
      cb(Object.assign(new Error('This frontend origin is not allowed.'), { status: 403 }));
    },
  }));
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (_req, res) => res.json({ success: true, message: 'KoletPay API is running', paymentsMode: config.paymentsMode }));

  app.use('/api/auth', limiter(15 * 60 * 1000, 60), authRoutes);
  app.use('/api/public', limiter(60 * 1000, 40), publicRoutes);
  app.use('/api/assistant', requireAuth, limiter(60 * 1000, 20), assistantRoutes);
  app.use('/api', requireAuth, businessRoutes);

  app.use((req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    let status = err.status || 500; let message = err.message; let code = err.code;
    if (err.name === 'CastError') { status = 400; message = 'Invalid request'; code = 'VALIDATION'; }
    else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors)[0]?.message || 'Invalid data'; code = 'VALIDATION'; }
    else if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON in request'; code = 'VALIDATION'; }
    else if (err.type === 'entity.too.large') { status = 413; message = 'Request is too large'; }
    else if (err.code === 11000) { status = 409; message = 'That record already exists'; code = 'DUPLICATE'; }
    if (status >= 500) { console.error('API error:', err); message = 'Something went wrong on our side. Please try again.'; }
    res.status(status).json({ success: false, message, code: typeof code === 'string' ? code : undefined, field: err.field });
  });
  return app;
}
