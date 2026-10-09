import { Counter, Invoice, Customer } from '../models.js';
import { lagosDate, escapeRegex } from '../utils.js';

export async function nextInvoiceNumber(businessId) {
  const year = lagosDate().slice(0, 4);
  const c = await Counter.findOneAndUpdate({ _id: `inv:${businessId}:${year}` }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `INV-${year}-${String(c.seq).padStart(4, '0')}`;
}

export const totalOf = (items) => items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);

export async function createInvoice(businessId, { customerId, dueAt, items, notes = '', source = 'manual' }) {
  const total = totalOf(items);
  if (total < 1) throw Object.assign(new Error('Invoice total must be more than ₦0'), { status: 400, code: 'VALIDATION' });
  return Invoice.create({
    businessId, number: await nextInvoiceNumber(businessId), customerId, issuedAt: lagosDate(), dueAt,
    items, notes, total, paidTotal: 0, payments: [], source,
  });
}

export const findCustomerByName = (businessId, name) =>
  Customer.findOne({ businessId, name: new RegExp(`^\\s*${escapeRegex(name.trim())}\\s*$`, 'i') });
