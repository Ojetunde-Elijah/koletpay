import { Router } from 'express';
import mongoose from 'mongoose';
import { Customer, Product, Invoice, PayLink, Wallet, LedgerEntry, Withdrawal } from '../models.js';
import { asyncHandler, conflict, notFound, badRequest, lagosDate, linkToken, paymentRef, isDuplicateKey } from '../utils.js';
import {
  validate, businessPatchSchema, customerSchema, customerPatchSchema, productSchema, invoiceSchema, manualPaymentSchema,
  linkSchema, invoiceLinkSchema, withdrawalSchema,
} from '../schemas.js';
import { createInvoice, totalOf } from '../services/invoices.js';
import { withdraw } from '../services/wallet.js';

const r = Router();
const validId = (id) => mongoose.isValidObjectId(id);
const expiry = (days) => (days ? new Date(Date.now() + days * 86400000) : null);

r.get('/bootstrap', asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const [customers, products, invoices, links, wallet] = await Promise.all([
    Customer.find({ businessId }).sort({ createdAt: -1 }).limit(2000),
    Product.find({ businessId }).sort({ createdAt: -1 }).limit(1000),
    Invoice.find({ businessId }).sort({ createdAt: -1 }).limit(2000),
    PayLink.find({ businessId }).sort({ createdAt: -1 }).limit(300),
    Wallet.findOne({ businessId }),
  ]);
  res.json({ success: true, data: { business: req.business.toJSON(), customers, products, invoices, links, wallet } });
}));

// ---------- Business profile ----------
r.patch('/business/me', asyncHandler(async (req, res) => {
  const patch = validate(businessPatchSchema, req.body);
  try {
    Object.assign(req.business, patch);
    await req.business.save();
  } catch (e) {
    if (isDuplicateKey(e)) throw conflict('That email or phone number is already used by another account', 'DUPLICATE');
    throw e;
  }
  res.json({ success: true, data: req.business.toJSON() });
}));

// ---------- Customers ----------
r.get('/customers', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Customer.find({ businessId: req.business._id }).sort({ createdAt: -1 }).limit(2000) });
}));
r.post('/customers', asyncHandler(async (req, res) => {
  const d = validate(customerSchema, req.body);
  if (d.phone && await Customer.exists({ businessId: req.business._id, phone: d.phone }))
    throw conflict('You already have a customer with this phone number', 'DUPLICATE');
  const c = await Customer.create({ ...d, whatsapp: d.whatsapp || d.phone, businessId: req.business._id, joinedAt: lagosDate() });
  res.status(201).json({ success: true, data: c });
}));
r.get('/customers/:id', asyncHandler(async (req, res) => {
  const c = validId(req.params.id) && await Customer.findOne({ _id: req.params.id, businessId: req.business._id });
  if (!c) throw notFound('Customer not found');
  res.json({ success: true, data: c });
}));
r.patch('/customers/:id', asyncHandler(async (req, res) => {
  const patch = validate(customerPatchSchema, req.body);
  const c = validId(req.params.id) && await Customer.findOneAndUpdate({ _id: req.params.id, businessId: req.business._id }, { $set: patch }, { new: true });
  if (!c) throw notFound('Customer not found');
  res.json({ success: true, data: c });
}));

// ---------- Products ----------
r.get('/products', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Product.find({ businessId: req.business._id }).sort({ createdAt: -1 }) });
}));
r.post('/products', asyncHandler(async (req, res) => {
  const p = await Product.create({ ...validate(productSchema, req.body), businessId: req.business._id });
  res.status(201).json({ success: true, data: p });
}));

// ---------- Invoices ----------
const findInvoice = async (req) => {
  const inv = await Invoice.findOne({ businessId: req.business._id, number: req.params.id });
  if (!inv) throw notFound('Invoice not found');
  return inv;
};
const newLink = (businessId, fields) => PayLink.create({ businessId, token: linkToken(), ...fields });

r.get('/invoices', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Invoice.find({ businessId: req.business._id }).sort({ createdAt: -1 }).limit(2000) });
}));
r.get('/invoices/:id', asyncHandler(async (req, res) => res.json({ success: true, data: await findInvoice(req) })));

r.post('/invoices', asyncHandler(async (req, res) => {
  const d = validate(invoiceSchema, req.body);
  if (!validId(d.customerId) || !await Customer.exists({ _id: d.customerId, businessId: req.business._id }))
    throw badRequest('Choose a customer from your list', 'VALIDATION');
  const invoice = await createInvoice(req.business._id, d);
  let link = null;
  if (d.createLink) link = await newLink(req.business._id, {
    title: d.items.length === 1 ? d.items[0].description : `Invoice ${invoice.number}`, invoiceNumber: invoice.number, amount: invoice.total,
    items: [], expiresAt: expiry(30),
  });
  res.status(201).json({ success: true, data: { invoice, link } });
}));

// A payment received outside KoletPay (cash, POS, direct transfer). Does NOT touch the wallet.
r.post('/invoices/:id/payments', asyncHandler(async (req, res) => {
  const d = validate(manualPaymentSchema, req.body);
  const inv = await findInvoice(req);
  const ref = paymentRef('MP');
  const updated = await Invoice.findOneAndUpdate(
    { _id: inv._id, paidTotal: { $lte: inv.total - d.amount } },
    { $push: { payments: { id: ref, amount: d.amount, date: lagosDate(), method: d.method, reference: ref, channel: 'manual' } }, $inc: { paidTotal: d.amount } },
    { new: true },
  );
  if (!updated) throw badRequest(`Amount is more than the balance of ₦${(inv.total - inv.paidTotal).toLocaleString('en-NG')}`, 'OVERPAYMENT');
  res.status(201).json({ success: true, data: updated });
}));

r.post('/invoices/:id/links', asyncHandler(async (req, res) => {
  const d = validate(invoiceLinkSchema, req.body);
  const inv = await findInvoice(req);
  const remaining = inv.total - inv.paidTotal;
  if (remaining <= 0) throw conflict('This invoice is already fully paid', 'ALREADY_PAID');
  const amount = d.amount ?? remaining;
  if (amount > remaining) throw badRequest(`Amount is more than the balance of ₦${remaining.toLocaleString('en-NG')}`, 'OVERPAYMENT');
  const link = await newLink(req.business._id, {
    title: inv.items.length === 1 ? inv.items[0].description : `Invoice ${inv.number}`, invoiceNumber: inv.number, amount,
    expiresAt: expiry(d.expiresInDays === undefined ? 30 : d.expiresInDays),
  });
  res.status(201).json({ success: true, data: link });
}));

// ---------- Pay links ----------
r.get('/links', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await PayLink.find({ businessId: req.business._id }).sort({ createdAt: -1 }).limit(300) });
}));
r.post('/links', asyncHandler(async (req, res) => {
  const d = validate(linkSchema, req.body);
  const items = d.items ?? [];
  const amount = items.length ? totalOf(items) : d.amount;
  if (!amount || amount < 1) throw badRequest('Set a price and amount', 'VALIDATION');
  const link = await newLink(req.business._id, {
    title: d.title, description: d.description, items, amount,
    expiresAt: expiry(d.expiresInDays === undefined ? 30 : d.expiresInDays),
  });
  res.status(201).json({ success: true, data: link });
}));
r.post('/links/:id/disable', asyncHandler(async (req, res) => {
  const l = validId(req.params.id) && await PayLink.findOneAndUpdate(
    { _id: req.params.id, businessId: req.business._id, status: 'ACTIVE' }, { $set: { status: 'DISABLED' } }, { new: true });
  if (!l) throw conflict('Only active links can be disabled', 'LINK_UNAVAILABLE');
  res.json({ success: true, data: l });
}));

// ---------- Wallet ----------
r.get('/wallet', asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const [wallet, ledger, withdrawals] = await Promise.all([
    Wallet.findOne({ businessId }),
    LedgerEntry.find({ businessId }).sort({ createdAt: -1 }).limit(100),
    Withdrawal.find({ businessId }).sort({ createdAt: -1 }).limit(50),
  ]);
  res.json({ success: true, data: { wallet, ledger, withdrawals } });
}));
r.post('/wallet/withdrawals', asyncHandler(async (req, res) => {
  const d = validate(withdrawalSchema, req.body);
  const wallet = await Wallet.findOne({ businessId: req.business._id });
  const out = await withdraw(wallet, d);
  res.status(201).json({ success: true, data: { wallet: out.wallet, withdrawal: out.withdrawal } });
}));

export default r;
