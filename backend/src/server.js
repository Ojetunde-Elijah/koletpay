import { config } from './config.js';
import { connectDB } from './db.js';
import { createApp } from './app.js';

const app = createApp();
try {
  const conn = await connectDB();
  console.log(`MongoDB connected: ${conn.host}`);
} catch (e) {
  console.error('Failed to connect to MongoDB:', e.message);
  process.exit(1);
}
app.listen(config.port, () => {
  console.log(`KoletPay API on :${config.port}  (payments: ${config.paymentsMode}, Gemini: ${config.gemini.apiKey ? 'on' : 'off'})`);
});
