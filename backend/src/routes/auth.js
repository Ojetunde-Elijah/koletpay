import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Business } from '../models.js';
import { asyncHandler, conflict, isDuplicateKey, unauthorized, NG_STATES, NG_BANKS, BUSINESS_TYPES, BUSINESS_CATEGORIES } from '../utils.js';
import { validate, registerSchema, loginSchema } from '../schemas.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { createWallet } from '../services/wallet.js';

const r = Router();

// Static lists the register / withdraw forms need.
r.get('/meta', (_req, res) => res.json({ success: true, data: { states: NG_STATES, banks: NG_BANKS, businessTypes: BUSINESS_TYPES, categories: BUSINESS_CATEGORIES } }));

r.post('/register', asyncHandler(async (req, res) => {
  const d = validate(registerSchema, req.body);
  let business;
  try {
    const { password, businessName, ...rest } = d;
    business = await Business.create({ ...rest, name: businessName, passwordHash: await bcrypt.hash(password, 10) });
  } catch (e) {
    if (isDuplicateKey(e)) throw conflict(String(e.message).includes('phone') ? 'An account with this phone number already exists' : 'An account with this email already exists', 'DUPLICATE');
    throw e;
  }
  // Every business gets its KoletPay virtual account on sign-up.
  let wallet;
  try { wallet = await createWallet(business); } catch (e) { await Business.deleteOne({ _id: business._id }); throw e; }
  res.status(201).json({ success: true, data: { token: signToken(business), business: business.toJSON(), wallet: wallet.toJSON() } });
}));

r.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = validate(loginSchema, req.body);
  const business = await Business.findOne({ email });
  const ok = business && await bcrypt.compare(password, business.passwordHash);
  if (!ok) throw unauthorized('Incorrect email or password');
  res.json({ success: true, data: { token: signToken(business), business: business.toJSON() } });
}));

r.get('/me', requireAuth, (req, res) => res.json({ success: true, data: { business: req.business.toJSON() } }));

export default r;
