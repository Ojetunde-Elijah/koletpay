"use client";
import Link from "next/link";
import { useState } from "react";
import { Wallet, Search } from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { PageHead, Status } from "@/components/Shell";
import { money, remainingOf, shortDate, statusOf } from "@/lib/types";
import { paymentsFor, Period } from "@/lib/metrics";
export default function Payments() {
  const { data } = useKoletPay();
  const [period, setPeriod] = useState<Period>("month");
  const list = paymentsFor(data, period).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const amount = list.reduce((s, p) => s + p.amount, 0);
  return (
    <>
      <PageHead
        title="Transaction logbook"
        sub="Every recorded payment, searchable by date and invoice."
      />
      <div className="filter-row">
        <div className="stat greenish" style={{ minWidth: 240 }}>
          <span className="stat-head">
            <Wallet size={17} /> Payments received
          </span>
          <strong>{money(amount)}</strong>
          <small>{list.length} payment(s) in this period</small>
        </div>
        <div className="seg">
          {(["day", "month", "year"] as Period[]).map((p) => (
            <button
              className={p === period ? "selected" : ""}
              onClick={() => setPeriod(p)}
              key={p}
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
      <section className="card">
        <div className="table-scroll">
          <table className="list-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Payment ID</th>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Method</th>
                <th>Channel</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{shortDate(p.date)}</td>
                  <td>{p.id}</td>
                  <td>{p.customer?.name}{p.payerName && p.payerName !== p.customer?.name ? ` (paid by ${p.payerName})` : ""}</td>
                  <td>
                    <Link href={`/invoices/${p.invoice.id}`}>
                      {p.invoice.id}
                    </Link>
                  </td>
                  <td>{p.method}</td>
                  <td>{p.channel === "koletpay" ? "KoletPay" : "Recorded by you"}</td>
                  <td className="success">
                    <b>+{money(p.amount)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <p style={{ padding: 14 }}>No recorded payments in this period.</p>
        )}
      </section>
      <p className="help">
        Payments through KoletPay payment links are credited to your KoletPay wallet. Cash, POS and direct-transfer
        payments you record yourself are tracked here but do not move wallet money.
      </p>
    </>
  );
}
