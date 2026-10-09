"use client";
import { useState } from "react";
import Link from "next/link";
import { CircleDollarSign, ReceiptText, Wallet, Users, Plus, Link2, Landmark, Mic } from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { PageHead, Status, QuickLink, Empty } from "@/components/Shell";
import { RevenueChart } from "@/components/RevenueChart";
import { totals, Period } from "@/lib/metrics";
import { money, remainingOf, statusOf, shortDate, amountOf } from "@/lib/types";

export default function Dashboard() {
  const { data } = useKoletPay();
  const [period, setPeriod] = useState<Period>("month");
  const t = totals(data, period);
  const recent = [...data.invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).slice(0, 5);
  const owing = data.invoices.filter((i) => remainingOf(i) > 0).length;
  const firstName = data.business.ownerName.split(" ")[0] || "there";

  return (
    <>
      <PageHead
        title={`Hello, ${firstName}`}
        sub={`${data.business.name} · here is how your business is doing.`}
        action={
          <Link href="/invoices/new" className="btn blue">
            <Plus size={16} /> Create invoice
          </Link>
        }
      />

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h2>KoletPay wallet</h2>
          <Link href="/wallet">Open wallet →</Link>
        </div>
        <div className="money-big">{money(data.wallet?.balance ?? 0)}</div>
        <p className="small">
          Account number <b>{data.wallet?.accountNumber ?? "—"}</b> · {data.wallet?.bankName ?? "KoletPay"}
        </p>
      </section>

      <div className="filter-row">
        <span className="eyebrow">Overview</span>
        <div className="seg">
          {(["day", "month", "year"] as Period[]).map((p) => (
            <button key={p} className={period === p ? "selected" : ""} onClick={() => setPeriod(p)}>
              {p === "day" ? "Today" : p === "month" ? "This month" : "This year"}
            </button>
          ))}
        </div>
      </div>

      <div className="stats">
        <div className="stat blueish">
          <span className="stat-head"><CircleDollarSign size={16} /> Received</span>
          <strong>{money(t.revenue)}</strong>
          <small>{t.sales} payment(s)</small>
        </div>
        <div className="stat amberish">
          <span className="stat-head"><Wallet size={16} /> Still owed to you</span>
          <strong>{money(t.outstanding)}</strong>
          <small>{owing} unpaid invoice(s)</small>
        </div>
        <div className="stat greenish">
          <span className="stat-head"><ReceiptText size={16} /> Invoices</span>
          <strong>{t.invoices}</strong>
          <small>created in this period</small>
        </div>
        <div className="stat">
          <span className="stat-head"><Users size={16} /> Customers</span>
          <strong>{t.customers}</strong>
          <small>in your ledger</small>
        </div>
      </div>

      <div className="grid-main">
        <section className="card">
          <div className="card-head"><h2>Revenue trend</h2></div>
          <RevenueChart period={period} />
        </section>
        <section className="card">
          <div className="card-head"><h2>Quick actions</h2></div>
          <div className="stack">
            <QuickLink href="/invoices/new" icon={<ReceiptText size={17} />} title="Create an invoice" />
            <QuickLink href="/links" icon={<Link2 size={17} />} title="Make a payment link" />
            <QuickLink href="/wallet" icon={<Landmark size={17} />} title="Withdraw to your bank" />
            <QuickLink href="/assistant" icon={<Mic size={17} />} title="Ask Kolet AI" />
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Recent invoices</h2>
          <Link href="/invoices">All invoices →</Link>
        </div>
        {recent.length ? (
          recent.map((inv) => (
            <Link href={`/invoices/${inv.id}`} className="row" key={inv.id}>
              <span className="content">
                <b>{inv.id}</b>
                <p>
                  {data.customers.find((c) => c.id === inv.customerId)?.name ?? "Customer"} · {shortDate(inv.issuedAt)}
                </p>
              </span>
              <span className="end">
                <b>{money(amountOf(inv))}</b>
                <Status status={statusOf(inv)} />
              </span>
            </Link>
          ))
        ) : (
          <Empty title="No invoices yet" description="Create your first invoice or share a payment link to get paid." />
        )}
      </section>
    </>
  );
}
