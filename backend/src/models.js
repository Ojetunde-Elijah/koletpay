import mongoose from 'mongoose';
const { Schema } = mongoose;

const toJSON = (customId) => ({
  virtuals: false,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = customId ? ret[customId] : String(ret._id);
    delete ret._id;
    delete ret.passwordHash;
    delete ret.businessId;
    return ret;
  },
});

const businessSchema = new Schema({
  ownerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true },
  whatsapp: { type: String, default: '' },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  businessType: { type: String, required: true },
  category: { type: String, required: true },
  rcNumber: { type: String, default: '' },
  tin: { type: String, default: '' },
  state: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true },
}, { timestamps: true });
businessSchema.set('toJSON', toJSON());

const walletSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, unique: true },
  accountNumber: { type: String, required: true, unique: true },
  accountName: { type: String, required: true },
  bankName: { type: String, default: 'KoletPay Virtual Account' },
  provider: { type: String, default: 'simulated' },
  balance: { type: Number, default: 0, min: 0 },
  totalIn: { type: Number, default: 0 },
  totalOut: { type: Number, default: 0 },
}, { timestamps: true });
walletSchema.set('toJSON', toJSON());

const ledgerSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, required: true, index: true },
  walletId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
  amount: { type: Number, required: true, min: 1 },
  balanceAfter: { type: Number, default: null },
  reference: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  invoiceNumber: { type: String, default: '' },
  customerName: { type: String, default: '' },
}, { timestamps: true });
ledgerSchema.index({ businessId: 1, createdAt: -1 });
ledgerSchema.set('toJSON', toJSON());

const withdrawalSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  reference: { type: String, required: true, unique: true },
}, { timestamps: true });
withdrawalSchema.set('toJSON', toJSON());

const customerSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  email: { type: String, default: '', lowercase: true, trim: true },
  address: { type: String, default: '' },
  location: { type: String, default: '' },
  contact: { type: String, enum: ['Phone', 'Email', 'WhatsApp'], default: 'Phone' },
  source: { type: String, enum: ['manual', 'payment_link', 'assistant'], default: 'manual' },
  notes: { type: String, default: '' },
  project: { type: String, default: '' },
  projectDetails: { type: String, default: '' },
  projectDue: { type: String, default: '' },
  joinedAt: { type: String, required: true },
}, { timestamps: true });
customerSchema.index({ businessId: 1, phone: 1 });
customerSchema.set('toJSON', toJSON());

const productSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true, trim: true },
  kind: { type: String, enum: ['Product', 'Service'], default: 'Product' },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
}, { timestamps: true });
productSchema.set('toJSON', toJSON());

const itemSchema = new Schema({
  productId: { type: String, default: '' },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const paymentSchema = new Schema({
  id: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  date: { type: String, required: true },
  method: { type: String, required: true },
  reference: { type: String, default: '' },
  channel: { type: String, enum: ['koletpay', 'manual'], default: 'manual' },
  payerName: { type: String, default: '' },
}, { _id: false });

const invoiceSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, required: true, index: true },
  number: { type: String, required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  issuedAt: { type: String, required: true },
  dueAt: { type: String, required: true },
  items: { type: [itemSchema], validate: (v) => v.length > 0 },
  payments: { type: [paymentSchema], default: [] },
  notes: { type: String, default: '' },
  total: { type: Number, required: true, min: 1 },
  paidTotal: { type: Number, default: 0, min: 0 },
  source: { type: String, enum: ['manual', 'payment_link', 'assistant'], default: 'manual' },
}, { timestamps: true });
invoiceSchema.index({ businessId: 1, number: 1 }, { unique: true });
invoiceSchema.set('toJSON', {
  versionKey: false,
  transform(_d, ret) {
    ret.id = ret.number;
    ret.customerId = String(ret.customerId);
    delete ret._id; delete ret.businessId; delete ret.number;
    return ret;
  },
});

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });

const linkSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, required: true, index: true },
  token: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  items: { type: [itemSchema], default: [] },
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['ACTIVE', 'PROCESSING', 'PAID', 'DISABLED'], default: 'ACTIVE' },
  expiresAt: { type: Date, default: null },
  invoiceNumber: { type: String, default: '' },
  customerId: { type: String, default: '' },
  customerName: { type: String, default: '' },
  paidAt: { type: Date, default: null },
  reference: { type: String, default: '' },
}, { timestamps: true });
linkSchema.index({ businessId: 1, createdAt: -1 });
linkSchema.set('toJSON', toJSON());

// One row per link being settled; the unique index guarantees a link is paid at most once even under races.
const claimSchema = new Schema({ linkId: { type: Schema.Types.ObjectId, required: true, unique: true } }, { timestamps: true });

export const SettlementClaim = mongoose.model('SettlementClaim', claimSchema);
export const Business = mongoose.model('Business', businessSchema);
export const Wallet = mongoose.model('Wallet', walletSchema);
export const LedgerEntry = mongoose.model('LedgerEntry', ledgerSchema);
export const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
export const Customer = mongoose.model('Customer', customerSchema);
export const Product = mongoose.model('Product', productSchema);
export const Invoice = mongoose.model('Invoice', invoiceSchema);
export const Counter = mongoose.model('Counter', counterSchema);
export const PayLink = mongoose.model('PayLink', linkSchema);
