import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDB(uri = config.mongoUri) {
  if (!uri) throw new Error('MONGO_URI is not defined in the environment');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  // Unique indexes (idempotency keys, one-payment-per-link) must exist before taking traffic.
  await mongoose.syncIndexes();
  return mongoose.connection;
}
