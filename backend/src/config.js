import 'dotenv/config';

const list = (v, fallback) => (v ? v.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean) : fallback);

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigins: list(process.env.CLIENT_ORIGINS, ['http://localhost:3000']),
  paymentsMode: process.env.PAYMENTS_MODE === 'live' ? 'live' : 'simulated',
  isTest: process.env.NODE_ENV === 'test',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 12000,
  },
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'dev-only-secret') {
  throw new Error('JWT_SECRET must be set in production');
}
