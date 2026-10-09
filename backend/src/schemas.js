import { z } from 'zod';
import { BUSINESS_CATEGORIES, BUSINESS_TYPES, NG_BANKS, NG_STATES, normalisePhone } from './utils.js';

const str = (min, max, label) =>
  z.string({ required_error: `${label} is required` }).trim().min(min, `${label} is required`).max(max, `${label} is too long`);
const optStr = (max = 200) => z.string().trim().max(max).optional().default('');
export const phone = z.string({ required_error: 'Phone number is required' })
  .transform((v, ctx) => {
    const n = normalisePhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Enter a valid Nigerian mobile number, e.g. 0803 123 4567' });
    return n ?? '';
  });
const optPhone = z.string().trim().optional().default('').transform((v, ctx) => {
  if (!v) return '';
  const n = normalisePhone(v);
  if (!n) ctx.addIssue({ code: 'custom', message: 'Enter a valid Nigerian WhatsApp number' });
  return n ?? '';
});
const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(120);
const optEmail = z.string().trim().toLowerCase().max(120).optional().default('').refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email');
const naira = (label = 'Amount') =>
  z.number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole naira amount`).positive(`${label} must be more than ₦0`).max(1_000_000_000, `${label} is too large`);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');

export const registerSchema = z.object({
  ownerName: str(2, 80, 'Your full name'),
  email,
  phone,
  whatsapp: optPhone,
  password: z.string().min(8, 'Password must be at least 8 characters').max(100)
    .regex(/[A-Za-z]/, 'Password needs at least one letter').regex(/\d/, 'Password needs at least one number'),
  businessName: str(2, 100, 'Business name'),
  businessType: z.enum(BUSINESS_TYPES, { errorMap: () => ({ message: 'Choose a business type' }) }),
  category: z.enum(BUSINESS_CATEGORIES, { errorMap: () => ({ message: 'Choose a business category' }) }),
  rcNumber: z.string().trim().max(20).regex(/^((RC|BN|IT)[\s-]?)?\d{4,9}$/i, 'Use a valid CAC number, e.g. RC1234567 or BN1234567').optional().or(z.literal('')).default(''),
  state: z.enum(NG_STATES, { errorMap: () => ({ message: 'Choose your state' }) }),
  city: str(2, 60, 'City / town'),
  address: str(5, 200, 'Business address'),
});
export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });

export const businessPatchSchema = z.object({
  name: str(2, 100, 'Business name').optional(),
  ownerName: str(2, 80, 'Owner name').optional(),
  email: email.optional(),
  phone: phone.optional(),
  whatsapp: optPhone.optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  category: z.enum(BUSINESS_CATEGORIES).optional(),
  rcNumber: z.string().trim().max(20).optional(),
  tin: z.string().trim().max(20).optional(),
  state: z.enum(NG_STATES).optional(),
  city: str(2, 60, 'City').optional(),
  address: str(5, 200, 'Address').optional(),
}).strict();

export const customerSchema = z.object({
  name: str(2, 80, 'Customer name'),
  phone: z.string().trim().optional().default('').transform((v, ctx) => {
    if (!v) return '';
    const n = normalisePhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Enter a valid Nigerian phone number' });
    return n ?? '';
  }),
  whatsapp: optPhone,
  email: optEmail,
  address: optStr(200),
  location: optStr(120),
  contact: z.enum(['Phone', 'Email', 'WhatsApp']).optional().default('Phone'),
  notes: optStr(1000),
  project: optStr(120),
  projectDetails: optStr(1000),
  projectDue: z.string().optional().default(''),
});
export const customerPatchSchema = z.object({
  name: str(2, 80, 'Customer name').optional(),
  phone: customerSchema.shape.phone.optional(),
  whatsapp: optPhone.optional(),
  email: optEmail.optional(),
  address: optStr(200).optional(),
  location: optStr(120).optional(),
  contact: z.enum(['Phone', 'Email', 'WhatsApp']).optional(),
  notes: optStr(1000).optional(),
  project: optStr(120).optional(),
  projectDetails: optStr(1000).optional(),
  projectDue: z.string().optional(),
}).strict();

export const productSchema = z.object({
  name: str(2, 100, 'Item name'),
  kind: z.enum(['Product', 'Service']).default('Product'),
  price: z.number().int().min(0, 'Price cannot be negative').max(1_000_000_000),
  description: optStr(500),
});

export const itemSchema = z.object({
  productId: z.string().optional().default(''),
  description: str(1, 200, 'Item description'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100000),
  unitPrice: z.number().int().min(0, 'Price cannot be negative').max(1_000_000_000),
});
export const invoiceSchema = z.object({
  customerId: str(1, 40, 'Customer'),
  dueAt: isoDate,
  items: z.array(itemSchema).min(1, 'Add at least one item').max(50),
  notes: optStr(1000),
  createLink: z.boolean().optional().default(false),
  source: z.enum(['manual', 'assistant']).optional().default('manual'),
});
export const manualPaymentSchema = z.object({
  amount: naira(),
  method: z.enum(['Cash', 'Bank transfer', 'POS', 'Other']).default('Cash'),
});

export const linkSchema = z.object({
  title: str(2, 120, 'What is this payment for?'),
  description: optStr(500),
  amount: naira().optional(),
  items: z.array(itemSchema).max(20).optional(),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
}).refine((v) => v.amount || (v.items && v.items.length), { message: 'Set a price and amount', path: ['amount'] });
export const invoiceLinkSchema = z.object({
  amount: naira().optional(),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
});

// What the customer fills in before paying.
export const payerSchema = z.object({
  name: str(2, 80, 'Full name'),
  phone,
  whatsapp: optPhone,
  email: optEmail,
  address: str(5, 200, 'Delivery / home address'),
  method: z.enum(['Bank transfer', 'Card', 'USSD']).optional().default('Bank transfer'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to share your details with this business' }) }),
});

export const withdrawalSchema = z.object({
  amount: naira(),
  bankName: z.enum(NG_BANKS.map((b) => b.name), { errorMap: () => ({ message: 'Choose a bank' }) }),
  accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
  accountName: str(2, 100, 'Account name'),
});

export const assistantSchema = z.object({ text: str(2, 600, 'Say what you want to do') });
export const askSchema = z.object({ question: str(2, 400, 'Question') });

export const validate = (schema, data) => {
  const r = schema.safeParse(data ?? {});
  if (!r.success) {
    const issue = r.error.issues[0];
    const e = new Error(issue.message);
    e.status = 400; e.code = 'VALIDATION'; e.field = issue.path.join('.');
    throw e;
  }
  return r.data;
};
