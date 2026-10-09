import { Router } from 'express';
import { Customer, Invoice, Wallet } from '../models.js';
import { asyncHandler, lagosDate } from '../utils.js';
import { validate, assistantSchema, askSchema } from '../schemas.js';
import { askGemini, geminiEnabled, parseInvoiceWithGemini, parseInvoiceWithRules } from '../services/gemini.js';
import { findCustomerByName } from '../services/invoices.js';

const r = Router();
const naira = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`;

// Drafts only: the browser shows the draft and the owner confirms before anything is created.
r.post('/parse-invoice', asyncHandler(async (req, res) => {
  const { text } = validate(assistantSchema, req.body);
  let parsed; let source = 'gemini';
  try {
    if (!geminiEnabled()) throw new Error('no key');
    parsed = await parseInvoiceWithGemini(text);
  } catch (e) {
    if (geminiEnabled()) console.error('Gemini parse failed, using rules:', e.message);
    parsed = parseInvoiceWithRules(text); source = 'rules';
  }
  const match = parsed.customerName ? await findCustomerByName(req.business._id, parsed.customerName) : null;
  res.json({ success: true, data: {
    source, draft: parsed, customer: match ? { id: String(match._id), name: match.name } : null,
    dueAt: lagosDate(new Date(Date.now() + parsed.dueInDays * 86400000)),
  } });
}));

r.post('/ask', asyncHandler(async (req, res) => {
  const { question } = validate(askSchema, req.body);
  const businessId = req.business._id;
  const [invoices, customers, wallet] = await Promise.all([
    Invoice.find({ businessId }).sort({ createdAt: -1 }).limit(300),
    Customer.find({ businessId }).select('name'), Wallet.findOne({ businessId }),
  ]);
  const names = new Map(customers.map((c) => [String(c._id), c.name]));
  const today = lagosDate(); const month = today.slice(0, 7);
  const payments = invoices.flatMap((i) => i.payments.map((p) => ({ ...p.toObject(), customer: names.get(String(i.customerId)) })));
  const sum = (list) => list.reduce((n, p) => n + p.amount, 0);
  const outstanding = invoices.filter((i) => i.total > i.paidTotal).map((i) => ({
    invoice: i.number, customer: names.get(String(i.customerId)), balance: i.total - i.paidTotal, dueAt: i.dueAt, overdue: i.dueAt < today,
  })).sort((a, b) => b.balance - a.balance);
  const context = {
    today, walletBalance: wallet?.balance ?? 0, revenueToday: sum(payments.filter((p) => p.date === today)),
    revenueThisMonth: sum(payments.filter((p) => p.date.startsWith(month))), totalOutstanding: outstanding.reduce((n, o) => n + o.balance, 0),
    outstandingInvoices: outstanding.slice(0, 15), customerCount: customers.length, invoiceCount: invoices.length,
  };
  let answer; let source = 'gemini';
  try {
    if (!geminiEnabled()) throw new Error('no key');
    answer = await askGemini(question, context);
  } catch (e) {
    if (geminiEnabled()) console.error('Gemini ask failed, using summary:', e.message);
    source = 'summary';
    answer = `Here is a quick summary: you have ${naira(context.totalOutstanding)} outstanding across ${outstanding.length} invoice(s), ` +
      `${naira(context.revenueToday)} received today, ${naira(context.revenueThisMonth)} this month, and ${naira(context.walletBalance)} in your KoletPay wallet.`;
  }
  res.json({ success: true, data: { answer, source } });
}));

export default r;
