import { StoreData, amountOf, paidOf, remainingOf, todayLagos, lagosKey } from "./types";
export type Period = "day" | "month" | "year";
const month = (s: string) => s.slice(0, 7);
export function inPeriod(date: string, period: Period) {
  const today = todayLagos();
  return period === "day"
    ? date === today
    : period === "month"
      ? month(date) === month(today)
      : date.slice(0, 4) === today.slice(0, 4);
}
export function paymentsFor(data: StoreData, period: Period) {
  return data.invoices.flatMap((inv) =>
    inv.payments
      .filter((p) => inPeriod(p.date, period))
      .map((p) => ({
        ...p,
        invoice: inv,
        customer: data.customers.find((c) => c.id === inv.customerId),
      })),
  );
}
export function totals(data: StoreData, period: Period) {
  const payments = paymentsFor(data, period);
  return {
    revenue: payments.reduce((s, p) => s + p.amount, 0),
    sales: payments.length,
    outstanding: data.invoices.reduce((s, i) => s + remainingOf(i), 0),
    customers: data.customers.length,
    invoices: data.invoices.filter((i) => inPeriod(i.issuedAt, period)).length,
  };
}
export function forCustomer(data: StoreData, id: string) {
  const invoices = data.invoices.filter((i) => i.customerId === id);
  return {
    invoices,
    spent: invoices.reduce((s, i) => s + paidOf(i), 0),
    invoiced: invoices.reduce((s, i) => s + amountOf(i), 0),
    outstanding: invoices.reduce((s, i) => s + remainingOf(i), 0),
  };
}
export function series(data: StoreData, period: Period) {
  const now = new Date();
  let slices: { label: string; key: string; sum: number }[] = [];
  const n = period === "year" ? 12 : period === "month" ? 14 : 7;
  for (let i = n - 1; i >= 0; i--) {
    let d = new Date(now);
    let key: string, label: string;
    if (period === "year") {
      d.setMonth(d.getMonth() - i, 1);
      key = lagosKey(d).slice(0, 7);
      label = d.toLocaleDateString("en-GB", { month: "short" });
    } else {
      d.setDate(d.getDate() - i);
      key = lagosKey(d);
      label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    }
    slices.push({ label, key, sum: 0 });
  }
  for (const p of paymentsFor(data, "year")) {
    const key = period === "year" ? p.date.slice(0, 7) : p.date;
    const s = slices.find((x) => x.key === key);
    if (s) s.sum += p.amount;
  }
  return slices;
}
export function topProducts(data: StoreData) {
  const list = data.products.map((p) => ({
    ...p,
    revenue: data.invoices.reduce(
      (sum, inv) =>
        sum +
        inv.items
          .filter((x) => x.productId === p.id)
          .reduce((s, it) => s + it.quantity * it.unitPrice, 0),
      0,
    ),
  }));
  return list.sort((a, b) => b.revenue - a.revenue);
}
