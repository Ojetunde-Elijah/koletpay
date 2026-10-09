"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CircleDollarSign,
  Users,
  Wallet,
  ReceiptText,
  FileDown,
} from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { PageHead } from "@/components/Shell";
import { RevenueChart } from "@/components/RevenueChart";
import {
  forCustomer,
  topProducts,
  totals,
  Period,
  paymentsFor,
} from "@/lib/metrics";
import { money } from "@/lib/types";
export default function Reports() {
  const { data } = useKoletPay();
  const [period, setPeriod] = useState<Period>("month");
  const t = totals(data, period);
  const top = data.customers
    .map((c) => ({ ...c, ...forCustomer(data, c.id) }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);
  const download = () => {
    const rows = [
      ["Date", "Payment ID", "Invoice", "Customer", "Amount", "Method"],
      ...paymentsFor(data, period).map((p) => [
        p.date,
        p.id,
        p.invoice.id,
        p.customer?.name || "",
        String(p.amount),
        p.method,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `koletpay-payments-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHead
        title="Reports & insights"
        sub="Know your income trends, best products and most valuable customers."
        action={
          <button onClick={download} className="btn blue">
            <FileDown size={16} /> Export CSV
          </button>
        }
      />
      <div className="filter-row">
        <span className="eyebrow">Reporting period</span>
        <div className="seg">
          {(["day", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              className={period === p ? "selected" : ""}
              onClick={() => setPeriod(p)}
            >
              {p === "day"
                ? "Today"
                : p === "month"
                  ? "This month"
                  : "This year"}
            </button>
          ))}
        </div>
      </div>
      <div className="stats">
        <div className="stat blueish">
          <span className="stat-head">
            <CircleDollarSign size={16} /> Received
          </span>
          <strong>{money(t.revenue)}</strong>
        </div>
        <div className="stat greenish">
          <span className="stat-head">
            <ReceiptText size={16} /> Payments
          </span>
          <strong>{t.sales}</strong>
        </div>
        <div className="stat amberish">
          <span className="stat-head">
            <Wallet size={16} /> Unpaid balances
          </span>
          <strong>{money(t.outstanding)}</strong>
        </div>
        <div className="stat">
          <span className="stat-head">
            <Users size={16} /> Customers
          </span>
          <strong>{t.customers}</strong>
        </div>
      </div>
      <section className="card">
        <div className="card-head">
          <h2>Revenue trend</h2>
        </div>
        <RevenueChart period={period} />
      </section>
      <div className="grid-half">
        <section className="card">
          <div className="card-head">
            <h2>Highest-value customers</h2>
            <Link href="/customers">Customer ledger →</Link>
          </div>
          {top.map((c) => (
            <Link href={`/customers/${c.id}`} className="row" key={c.id}>
              <span className="avatar">{c.name.slice(0, 2).toUpperCase()}</span>
              <span className="content">
                <b>{c.name}</b>
                <p>{c.invoices.length} order(s)</p>
              </span>
              <span className="end">
                <b>{money(c.spent)}</b>
              </span>
            </Link>
          ))}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Best-selling items (invoiced)</h2>
          </div>
          {topProducts(data)
            .slice(0, 5)
            .map((p) => (
              <div className="row" key={p.id}>
                <span className="content">
                  <b>{p.name}</b>
                  <p>{p.kind}</p>
                </span>
                <span className="end">
                  <b>{money(p.revenue)}</b>
                </span>
              </div>
            ))}
        </section>
      </div>
      <div className="note">
        Income is counted when payments are recorded, not when an invoice is
        created. Cash and POS payments are what you recorded yourself; KoletPay payments are credited to your wallet.
      </div>
    </>
  );
}
