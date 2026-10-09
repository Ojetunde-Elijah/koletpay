"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ShieldCheck, Lock } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { initials, money } from "@/lib/types";

type LinkInfo = {
  businessName: string;
  location: string;
  title: string;
  description: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  amount: number;
  status: "ACTIVE" | "PROCESSING" | "PAID" | "DISABLED" | "EXPIRED";
  expiresAt: string | null;
  simulated: boolean;
};
type Receipt = {
  reference: string;
  amount: number;
  method: string;
  invoiceNumber: string;
  businessName: string;
  customerName: string;
  paidAt: string;
  title: string;
};

export default function PayPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", email: "", address: "", method: "Bank transfer" });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<LinkInfo>(`/api/public/links/${encodeURIComponent(token)}`, { auth: false })
      .then(setInfo)
      .catch((e) => setLoadError(errorMessage(e)));
  }, [token]);

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError("Please agree to share your details with this business.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api<Receipt>(`/api/public/links/${encodeURIComponent(token)}/pay`, {
        method: "POST",
        auth: false,
        body: { ...form, consent: true },
      });
      setReceipt(r);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loadError)
    return (
      <main className="pay-page">
        <div className="pay-wrap"><div className="pay-card"><h1>Link not found</h1><p>{loadError}</p></div></div>
      </main>
    );
  if (!info)
    return (
      <main className="pay-page"><div className="pay-wrap"><p role="status">Loading payment…</p></div></main>
    );

  if (receipt)
    return (
      <main className="pay-page">
        <div className="pay-wrap">
          <div className="pay-card" role="status">
            <CheckCircle2 size={40} color="#12b76a" />
            <h1 style={{ marginTop: 10 }}>Payment received</h1>
            <p>Thank you, {receipt.customerName}. {receipt.businessName} has been notified.</p>
            <div className="divider" />
            <div className="kv"><span>Amount</span><b>{money(receipt.amount)}</b></div>
            <div className="kv"><span>For</span><b>{receipt.title}</b></div>
            <div className="kv"><span>Receipt no.</span><b>{receipt.invoiceNumber}</b></div>
            <div className="kv"><span>Reference</span><b>{receipt.reference}</b></div>
            <div className="kv"><span>Date</span><b>{new Date(receipt.paidAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}</b></div>
            <button className="btn block" style={{ marginTop: 16 }} onClick={() => window.print()}>Save / print receipt</button>
          </div>
        </div>
      </main>
    );

  const unavailable = info.status !== "ACTIVE";
  return (
    <main className="pay-page">
      <div className="pay-wrap">
        <div className="pay-card">
          <div className="pay-biz">
            <span className="avatar">{initials(info.businessName)}</span>
            <span>
              <b>{info.businessName}</b>
              <p className="small">{info.location}</p>
            </span>
          </div>
          <div className="divider" />
          <p className="small">You are paying for</p>
          <h1 style={{ fontSize: 22 }}>{info.title}</h1>
          {info.description && <p className="small">{info.description}</p>}
          {info.items.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {info.items.map((it, i) => (
                <div className="kv" key={i}>
                  <span>{it.quantity} × {it.description}</span>
                  <b>{money(it.quantity * it.unitPrice)}</b>
                </div>
              ))}
            </div>
          )}
          <div className="pay-amount" style={{ marginTop: 12 }}>{money(info.amount)}</div>
        </div>

        {unavailable ? (
          <div className="pay-card" role="alert">
            <h2 className="title-sm">
              {info.status === "PAID" ? "This link has already been paid" : "This link is no longer available"}
            </h2>
            <p className="small">
              {info.status === "PAID"
                ? "No further payment is needed."
                : "It may have expired or been switched off. Please ask the business for a new link."}
            </p>
          </div>
        ) : (
          <form className="pay-card" onSubmit={submit}>
            <h2 className="title-sm">Your details</h2>
            <p className="small" style={{ marginBottom: 12 }}>
              {info.businessName} needs these to deliver your order and send your receipt.
            </p>
            <div className="form-group">
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" className="field" autoComplete="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="phone">Phone number</label>
              <input id="phone" className="field" type="tel" autoComplete="tel" required placeholder="0803 123 4567" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="whatsapp">WhatsApp number</label>
              <input id="whatsapp" className="field" type="tel" placeholder="Same as phone if blank" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="email">Email (optional)</label>
              <input id="email" className="field" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="address">Delivery / home address</label>
              <textarea id="address" className="field" autoComplete="street-address" required value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="method">How will you pay?</label>
              <select id="method" className="field" value={form.method} onChange={(e) => set("method", e.target.value)}>
                {["Bank transfer", "Card", "USSD"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <label className="auth-terms" style={{ alignItems: "flex-start" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I agree to share these details with {info.businessName}.</span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn blue block" disabled={busy} style={{ marginTop: 14 }}>
              <Lock size={16} /> {busy ? "Processing…" : `Pay ${money(info.amount)}`}
            </button>
            <p className="hint" style={{ textAlign: "center", marginTop: 10 }}>
              <ShieldCheck size={13} style={{ verticalAlign: "middle" }} /> Secured by KoletPay
            </p>
            {info.simulated && (
              <p className="note" style={{ marginTop: 10 }}>
                Test mode: no real money is charged.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
