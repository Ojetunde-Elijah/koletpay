import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { Business } from '../models.js';
import { asyncHandler, unauthorized } from '../utils.js';

export const signToken = (business) => jwt.sign({ sub: String(business._id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw unauthorized();
  let payload;
  try { payload = jwt.verify(token, config.jwtSecret); } catch { throw unauthorized('Your session has expired. Please sign in again.'); }
  const business = await Business.findById(payload.sub);
  if (!business) throw unauthorized();
  req.business = business;
  next();
});
