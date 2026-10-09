"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Link2, ReceiptText } from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { errorMessage } from "@/lib/api";
import { PageHead } from "@/components/Shell";
import { dateISO, money } from "@/lib/types";

type Line = { productId: string; description: string; quantity: string; unitPrice: string };
const blankLine = (): Line => ({ productId: "", description: "", quantity: "1", unitPrice: "" });

function Form() {
  const { data, addInvoice, createLink } = useKoletPay();
  const router = useRouter();
  const qp = useSearchParams();
  const [mode, setMode] = useState<"invoice" | "link">(qp.get("customer") ? "invoice" : "link");
  const [customerId, setCustomerId] = useState(qp.get("customer") || "");
  const [dueAt, setDueAt] = useState(dateISO(7));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [withLink, setWithLink] = useState(true);
  const [title, setTitle] = useState("");
  const [linkDays, setLinkDays] = useState(30);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const pickProduct = (i: number, productId: string) => {
    const p = data.products.find((x) => x.id === productId);
    setLine(i, p ? { productId, description: p.name, unitPrice: String(p.price) } : { productId: "" });
  };
  const items = lines
    .filter((l) => l.description.trim() || l.unitPrice)
    .map((l) => ({
      productId: l.productId,
      description: l.description.trim(),
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
    }));
  const total = items.reduce((n, i) => n + (i.quantity || 0) * (i.unitPrice || 0), 0);

  const valid = () => {
    if (!items.length) return "Add at least one item with a price.";
    for (const i of items) {
      if (!i.description) return "Describe every item.";
      if (!Number.isInteger(i.quantity) || i.quantity < 1) return "Quantity must be a whole number, at least 1.";
      if (!Number.isInteger(i.unitPrice) || i.unitPrice < 1) return "Enter prices in whole naira, more than ₦0.";
    }
    return "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = valid() || (mode === "invoice" && !customerId ? "Choose a customer, or switch to a payment link." : "") ||
      (mode === "link" && title.trim().length < 2 ? "Say what this payment is for." : "");
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "invoice") {
        const res = await addInvoice({ customerId, dueAt, items, notes, createLink: withLink });
        router.push(`/invoices/${res.invoice.id}`);
      } else {
        await createLink({
          title: title.trim(),
          description: notes,
          items: items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })),
          expiresInDays: linkDays,
        });
        router.push("/links?created=1");
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="filter-row">
        <Link className="btn sm" href="/invoices"><ArrowLeft size={16} /> All invoices</Link>
      </div>
      <PageHead
        title="Create invoice"
        sub="Bill a customer you know, or just set a price and send a link. The customer fills in their own details before paying."
      />
      <div className="seg" style={{ marginBottom: 16 }}>
        <button type="button" className={mode === "link" ? "selected" : ""} onClick={() => setMode("link")}>
          Price + payment link
        </button>
        <button type="button" className={mode === "invoice" ? "selected" : ""} onClick={() => setMode("invoice")}>
          Invoice for a customer
        </button>
      </div>

      <form onSubmit={submit}>
        <div className="grid-main">
          <section className="card">
            {mode === "link" ? (
              <div className="form-group">
                <label className="label" htmlFor="title">What is this payment for?</label>
                <input id="title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20 custom mugs" />
                <p className="hint">The customer sees this on the payment page. No customer needed yet.</p>
              </div>
            ) : (
              <div className="form-grid">
                <div className="form-group">
                  <label className="label" htmlFor="customer">Customer</label>
                  <select id="customer" className="field" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">Choose a customer</option>
                    {data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {!data.customers.length && <p className="hint">No customers yet. Add one, or use a payment link.</p>}
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="due">Due date</label>
                  <input id="due" type="date" className="field" min={dateISO(0)} value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                </div>
              </div>
            )}

            <h2 className="title-sm" style={{ marginTop: 18 }}>Items</h2>
            {lines.map((l, i) => (
              <div className="form-grid" key={i} style={{ alignItems: "end", marginBottom: 8 }}>
                <div className="form-group">
                  <label className="label">Item {data.products.length ? "(pick from your price list or type)" : ""}</label>
                  {data.products.length > 0 && (
                    <select className="field" value={l.productId} onChange={(e) => pickProduct(i, e.target.value)} style={{ marginBottom: 6 }}>
                      <option value="">Custom item</option>
                      {data.products.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}
                    </select>
                  )}
                  <input className="field" placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value, productId: "" })} />
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: "90px 1fr auto" }}>
                  <div className="form-group">
                    <label className="label">Qty</label>
                    <input className="field" type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="label">Price (₦)</label>
                    <input className="field" type="number" min="1" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                  </div>
                  <button type="button" className="icon-button" aria-label="Remove item" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn sm" onClick={() => setLines([...lines, blankLine()])}>
              <Plus size={15} /> Add another item
            </button>

            <div className="form-group" style={{ marginTop: 18 }}>
              <label className="label" htmlFor="notes">Notes / delivery details (optional)</label>
              <textarea id="notes" className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </section>

          <section className="card">
            <h2 className="title-sm">Summary</h2>
            <div className="status-line"><b>Total</b><strong className="money-big">{money(total)}</strong></div>
            <div className="divider" />
            {mode === "invoice" ? (
              <label className="auth-terms" style={{ alignItems: "flex-start" }}>
                <input type="checkbox" checked={withLink} onChange={(e) => setWithLink(e.target.checked)} />
                <span>Also create a payment link I can send to the customer.</span>
              </label>
            ) : (
              <div className="form-group">
                <label className="label" htmlFor="days">Link stays valid for</label>
                <select id="days" className="field" value={linkDays} onChange={(e) => setLinkDays(Number(e.target.value))}>
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            )}
            <p className="small" style={{ margin: "12px 0" }}>
              {mode === "link"
                ? "Your customer opens the link, enters their name, phone, WhatsApp and address, then pays. Their details and the invoice appear in your account automatically."
                : "The invoice is saved to your records. Payments through the link go straight into your KoletPay wallet."}
            </p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn blue block" type="submit" disabled={busy} style={{ marginTop: 12 }}>
              {mode === "link" ? <Link2 size={16} /> : <ReceiptText size={16} />}
              {busy ? "Creating…" : mode === "link" ? "Create payment link" : "Create invoice"}
            </button>
          </section>
        </div>
      </form>
    </>
  );
}

export default function NewInvoice() {
  return (
    <Suspense fallback={null}>
      <Form />
    </Suspense>
  );
}
