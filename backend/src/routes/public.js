import { Router } from 'express';
import { Business, PayLink } from '../models.js';
import { asyncHandler, notFound } from '../utils.js';
import { validate, payerSchema } from '../schemas.js';
import { settleLink } from '../services/settlement.js';
import { config } from '../config.js';

const r = Router();
const TOKEN = /^[A-Za-z0-9_-]{16,40}$/;

const findLink = async (token) => {
  const link = TOKEN.test(token) && await PayLink.findOne({ token });
  if (!link) throw notFound('This payment link does not exist');
  return link;
};
const effectiveStatus = (l) => (l.status === 'ACTIVE' && l.expiresAt && l.expiresAt < new Date() ? 'EXPIRED' : l.status);

// Only what a customer needs to see. No wallet, owner contact or internal IDs.
r.get('/links/:token', asyncHandler(async (req, res) => {
  const l = await findLink(req.params.token);
  const b = await Business.findById(l.businessId).select('name city state');
  res.json({ success: true, data: {
    businessName: b?.name ?? 'Business', location: b ? `${b.city}, ${b.state}` : '',
    title: l.title, description: l.description, items: l.items, amount: l.amount,
    status: effectiveStatus(l), expiresAt: l.expiresAt, simulated: config.paymentsMode === 'simulated',
  } });
}));

r.post('/links/:token/pay', asyncHandler(async (req, res) => {
  const link = await findLink(req.params.token);
  const payer = validate(payerSchema, req.body);
  const receipt = await settleLink(link, payer);
  res.status(201).json({ success: true, data: receipt });
}));

export default r;
