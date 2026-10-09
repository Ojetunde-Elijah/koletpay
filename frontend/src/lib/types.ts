export type Business = {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsapp: string;
  businessType: string;
  category: string;
  rcNumber: string;
  tin?: string;
  state: string;
  city: string;
  address: string;
};
export type Customer = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  location: string;
  contact: "Phone" | "Email" | "WhatsApp";
  source: "manual" | "payment_link" | "assistant";
  joinedAt: string;
  notes: string;
  project: string;
  projectDetails: string;
  projectDue: string;
};
export type Product = {
  id: string;
  name: string;
  kind: "Product" | "Service";
  price: number;
  description: string;
};
export type LineItem = {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};
export type Payment = {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference?: string;
  channel?: "koletpay" | "manual";
  payerName?: string;
};
export type Invoice = {
  id: string;
  customerId: string;
  issuedAt: string;
  dueAt: string;
  items: LineItem[];
  payments: Payment[];
  notes: string;
  source?: string;
};
export type LinkStatus = "ACTIVE" | "PROCESSING" | "PAID" | "DISABLED";
export type PayLink = {
  id: string;
  token: string;
  title: string;
  description: string;
  items: LineItem[];
  amount: number;
  status: LinkStatus;
  expiresAt: string | null;
  invoiceNumber: string;
  customerName: string;
  paidAt: string | null;
  createdAt: string;
};
export type Wallet = {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  provider: string;
  balance: number;
  totalIn: number;
  totalOut: number;
};
export type LedgerEntry = {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balanceAfter: number | null;
  description: string;
  invoiceNumber: string;
  customerName: string;
  reference: string;
  createdAt: string;
};
export type Withdrawal = {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
};
export type StoreData = {
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  links: PayLink[];
  wallet: Wallet | null;
  business: Business;
};
export type InvoiceStatus = "Paid" | "Partially paid" | "Overdue" | "Pending";

// Dates are handled in Nigerian time (Africa/Lagos) so "today" matches the business day.
export const lagosKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d);
export const todayLagos = () => lagosKey(new Date());
export const dateISO = (offsetDays = 0) => lagosKey(new Date(Date.now() + offsetDays * 86400000));

export const amountOf = (invoice: Invoice) =>
  invoice.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
export const paidOf = (invoice: Invoice) =>
  invoice.payments.reduce((n, p) => n + p.amount, 0);
export const remainingOf = (invoice: Invoice) =>
  Math.max(0, amountOf(invoice) - paidOf(invoice));
export const statusOf = (invoice: Invoice): InvoiceStatus => {
  if (remainingOf(invoice) === 0) return "Paid";
  if (invoice.dueAt < todayLagos()) return "Overdue";
  if (paidOf(invoice) > 0) return "Partially paid";
  return "Pending";
};
export const money = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
export const shortDate = (date: string) =>
  new Date(date.slice(0, 10) + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
export const payUrl = (token: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${token}`;
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "K";
