"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  CreditCard,
  Clipboard,
  Mail,
  Link2,
} from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { errorMessage } from "@/lib/api";
import {
  amountOf,
  paidOf,
  remainingOf,
  money,
  shortDate,
  statusOf,
  payUrl,
} from "@/lib/types";
import { PageHead, Status } from "@/components/Shell";
export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, recordPayment, createInvoiceLink } = useKoletPay();
  const inv = data.invoices.find((i) => i.id === id);
  const [partial, setPartial] = useState("");
  const [method, setMethod] = useState("Cash");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!inv)
    return (
      <>
        <PageHead title="Invoice not found" />
        <Link href="/invoices">Back</Link>
      </>
    );
  const customer = data.customers.find((c) => c.id === inv.customerId);
  const total = amountOf(inv),
    paid = paidOf(inv),
    remaining = remainingOf(inv),
    status = statusOf(inv);
  const links = data.links.filter((l) => l.invoiceNumber === inv.id);
  const activeLink = links.find((l) => l.status === "ACTIVE");
  const register = async (amount: number) => {
    if (!Number.isInteger(amount) || amount <= 0 || amount > remaining) {
      setMessage(`Enter a whole amount between ₦1 and ${money(remaining)}.`);
      return;
    }
    setBusy(true);
    try {
      await recordPayment(inv.id, amount, method);
      setMessage(`Payment of ${money(amount)} recorded.`);
      setPartial("");
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const makeLink = async () => {
    setBusy(true);
    try {
      await createInvoiceLink(inv.id);
      setMessage("Payment link created. Copy it and send it to your customer.");
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copied to clipboard.`);
    } catch {
      setMessage("Could not copy automatically. Select the text and copy it.");
    }
  };
  return (
    <>
      <div className="filter-row">
        <Link className="btn sm" href="/invoices">
          <ArrowLeft size={16} /> All invoices
        </Link>
      </div>
      <PageHead
        title={inv.id}
        sub="View the invoice, share a payment link and track what has been paid."
        action={
          <button className="btn" onClick={() => window.print()}>
            <Printer size={15} /> Print / Save PDF
          </button>
        }
      />
      <div className="grid-main">
        <div>
          <section className="card">
            <div className="paper">
              <div className="invoice-top">
                <div>
                  <h2 style={{ fontSize: 22 }}>{data.business.name}</h2>
                  <p className="small">
                    {data.business.email} · {data.business.phone}
                  </p>
                </div>
                <span className="red-serial">No. {inv.id}</span>
              </div>
              <div className="divider" />
              <div className="grid-half" style={{ gap: 20 }}>
                <div>
                  <span className="eyebrow">Billed to</span>
                  <p>
                    <b>{customer?.name || "Unknown customer"}</b>
                  </p>
                  <p className="small">{customer?.phone}</p>
                  <p className="small">{customer?.email}</p>
                  {customer?.address && <p className="small">{customer.address}</p>}
                </div>
                <div>
                  <span className="eyebrow">Invoice details</span>
                  <p>Issued: {shortDate(inv.issuedAt)}</p>
                  <p>Due: {shortDate(inv.dueAt)}</p>
                  <Status status={status} />
                </div>
              </div>
              <div className="divider" />
              <div className="table-scroll">
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Unit price</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((it, i) => (
                      <tr key={i}>
                        <td>{it.description}</td>
                        <td>{it.quantity}</td>
                        <td>{money(it.unitPrice)}</td>
                        <td>{money(it.unitPrice * it.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divider" />
              <div className="status-line">
                <b>Invoice total</b>
                <strong className="money-big">{money(total)}</strong>
              </div>
              <div className="status-line">
                <span className="muted">Paid so far</span>
                <b className="success">{money(paid)}</b>
              </div>
              <div className="status-line">
                <b>Balance due</b>
                <b className="danger-text" style={{ fontSize: 20 }}>
                  {money(remaining)}
                </b>
              </div>
              {inv.notes && (
                <div className="note" style={{ marginTop: 16 }}>
                  <b>Project / delivery notes:</b> {inv.notes}
                </div>
              )}
            </div>
          </section>
          <section className="card">
            <div className="card-head">
              <h2>Payment history</h2>
              <span className="pill">{inv.payments.length} payment(s)</span>
            </div>
            {inv.payments.length ? (
              inv.payments.map((p) => (
                <div className="row" key={p.id}>
                  <span className="avatar">
                    <CheckCircle2 size={19} />
                  </span>
                  <span className="content">
                    <b>{p.method}</b>
                    <p>
                      {shortDate(p.date)} · {p.id}
                      {p.payerName ? ` · paid by ${p.payerName}` : ""}
                    </p>
                  </span>
                  <span className="end">
                    <b className="success">+{money(p.amount)}</b>
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">No payments recorded for this invoice.</p>
            )}
            {remaining === 0 && (
              <div className="note" style={{ marginTop: 20 }}>
                <b>Fully paid.</b> This invoice is your complete receipt. Select
                Print / Save PDF to export it.
              </div>
            )}
          </section>
        </div>
        <div>
          <section className="card">
            <h2 className="title-sm">Payment status</h2>
            <Status status={status} />
            <div
              style={{
                margin: "18px 0 10px",
                height: 8,
                borderRadius: 10,
                background: "#e7eaff",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "var(--blue)",
                  height: "100%",
                  width: `${total ? (paid / total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="small">
              {money(paid)} of {money(total)} received
            </p>
            <div className="divider" />
            {remaining > 0 ? (
              <>
                <p className="small" style={{ marginBottom: 12 }}>
                  Got paid in cash, by POS or direct transfer? Record it here. Payments through your KoletPay link are
                  recorded automatically.
                </p>
                <div className="form-group">
                  <label className="label">How were you paid?</label>
                  <select className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {["Cash", "Bank transfer", "POS", "Other"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <button className="btn blue block" disabled={busy} onClick={() => register(remaining)}>
                  <CreditCard size={16} /> Record full balance ({money(remaining)})
                </button>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="label">Or record a part payment (₦)</label>
                  <input
                    className="field"
                    type="number"
                    min="1"
                    max={remaining}
                    value={partial}
                    onChange={(e) => setPartial(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <button className="btn block" disabled={busy || !partial} onClick={() => register(Number(partial))}>
                  Record part payment
                </button>
              </>
            ) : (
              <div className="note success">
                <CheckCircle2 size={18} /> Balance cleared. Receipt is ready.
              </div>
            )}
            {message && (
              <p style={{ marginTop: 12 }} className="small" role="status">
                {message}
              </p>
            )}
          </section>
          <section className="card">
            <h2 className="title-sm">Installments</h2>
            <p className="section-sub">
              Offer a customer a clear payment schedule for any remaining
              invoice balance.
            </p>
            <Link
              className="btn block"
              href={`/installments?invoice=${inv.id}`}
            >
              Calculate a payment plan
            </Link>
          </section>
          <section className="card">
            <h2 className="title-sm">Share / contact</h2>
            <div className="stack">
              {activeLink ? (
                <>
                  <div className="copy-box"><span>{payUrl(activeLink.token)}</span></div>
                  <button className="btn block" onClick={() => copy(payUrl(activeLink.token), "Payment link")}>
                    <Clipboard size={15} /> Copy payment link ({money(activeLink.amount)})
                  </button>
                </>
              ) : remaining > 0 ? (
                <button className="btn blue block" onClick={makeLink} disabled={busy}>
                  <Link2 size={15} /> Create payment link for {money(remaining)}
                </button>
              ) : null}
              {customer?.email && (
                <a
                  className="btn block"
                  href={`mailto:${customer.email}?subject=${encodeURIComponent(`Invoice ${inv.id} from ${data.business.name}`)}&body=${encodeURIComponent(`Hello ${customer.name},\n\nHere is your invoice ${inv.id} for ${money(total)}.\n\nKindly review it.\n\nThank you.`)}`}
                >
                  <Mail size={15} /> Draft email
                </a>
              )}
              <Link className="btn block" href={`/customers/${inv.customerId}`}>
                View customer details
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
