import crypto from 'node:crypto';

export const NG_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];
export const NG_BANKS = [
  'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank', 'First Bank of Nigeria',
  'First City Monument Bank (FCMB)', 'Globus Bank', 'Guaranty Trust Bank (GTBank)', 'Heritage Bank', 'Keystone Bank',
  'Kuda Microfinance Bank', 'Moniepoint Microfinance Bank', 'OPay', 'PalmPay', 'Polaris Bank', 'Providus Bank',
  'Stanbic IBTC Bank', 'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank', 'Union Bank of Nigeria',
  'United Bank for Africa (UBA)', 'Unity Bank', 'Wema Bank', 'Zenith Bank',
].map((name) => ({ name }));
export const BUSINESS_TYPES = ['Sole proprietorship', 'Registered business name', 'Limited liability company (Ltd)', 'Partnership', 'Freelancer / Individual', 'NGO / Cooperative'];
export const BUSINESS_CATEGORIES = [
  'Fashion & tailoring', 'Printing & branding', 'Food & catering', 'Retail & supermarket', 'Beauty & salon',
  'Building & construction', 'Electronics & repairs', 'Agriculture', 'Logistics & delivery', 'Education & training',
  'Events & entertainment', 'Health & pharmacy', 'Technology & digital services', 'Professional services', 'Other',
];

/** Normalise a Nigerian mobile number to +234XXXXXXXXXX, or return null if invalid. */
export function normalisePhone(input) {
  let d = String(input ?? '').replace(/[\s()-]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('234')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  if (!/^[789][01]\d{8}$/.test(d)) return null;
  return `+234${d}`;
}

export const lagosDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(d);
export const addDays = (days) => lagosDate(new Date(Date.now() + days * 86400000));
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const randomDigits = (n) => Array.from(crypto.randomBytes(n), (b) => b % 10).join('');
export const linkToken = () => crypto.randomBytes(18).toString('base64url');
export const paymentRef = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
export const isDuplicateKey = (e) => e && (e.code === 11000 || e.code === 11001);

const httpError = (status, defaultCode) => (message, code = defaultCode) => Object.assign(new Error(message), { status, code });
export const badRequest = httpError(400, 'BAD_REQUEST');
export const unauthorized = (message = 'Please sign in to continue', code = 'UNAUTHORIZED') => Object.assign(new Error(message), { status: 401, code });
export const notFound = httpError(404, 'NOT_FOUND');
export const conflict = httpError(409, 'CONFLICT');

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
