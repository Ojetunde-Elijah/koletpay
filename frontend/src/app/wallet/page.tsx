"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, Clipboard, Send } from "lucide-react";
import { useKoletPay, WalletView } from "@/lib/store";
import { errorMessage } from "@/lib/api";
import { useMeta } from "@/lib/meta";
import { PageHead } from "@/components/Shell";
import { dateTime, money } from "@/lib/types";

export default function WalletPage() {
  const { loadWallet, withdraw } = useKoletPay();
  const meta = useMeta();
  const [view, setView] = useState<WalletView | null>(null);
  const [loadError, setLoadError] = useState("");
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [acctNo, setAcctNo] = useState("");
  const [acctName, setAcctName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setView(await loadWallet());
      setLoadError("");
    } catch (e) {
      setLoadError(errorMessage(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isInteger(n) || n < 1) return setError("Enter a whole naira amount.");
    if (!bank) return setError("Choose your bank.");
    if (!/^\d{10}$/.test(acctNo)) return setError("Account number must be 10 digits.");
    if (acctName.trim().length < 2) return setError("Enter the account name.");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await withdraw({ amount: n, bankName: bank, accountNumber: acctNo, accountName: acctName.trim() });
      setNotice(`${money(n)} withdrawal to ${bank} submitted.`);
      setAmount("");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const w = view?.wallet;
  return (
    <>
      <PageHead title="KoletPay wallet" sub="Every payment from your payment links is collected here. Withdraw to your bank when you are ready." />
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      <div className="grid-main">
        <div>
          <section className="card">
            <div className="card-head"><h2>Balance</h2><Landmark size={18} /></div>
            <div className="money-big">{money(w?.balance ?? 0)}</div>
            <div className="divider" />
            <div className="kv"><span>Your KoletPay account number</span><b>{w?.accountNumber ?? "—"}</b></div>
            <div className="kv"><span>Account name</span><b>{w?.accountName ?? "—"}</b></div>
            <div className="kv"><span>Total received</span><b>{money(w?.totalIn ?? 0)}</b></div>
            <div className="kv"><span>Total withdrawn</span><b>{money(w?.totalOut ?? 0)}</b></div>
            {w && (
              <button className="btn sm" style={{ marginTop: 12 }} onClick={() => navigator.clipboard?.writeText(w.accountNumber)}>
                <Clipboard size={14} /> Copy account number
              </button>
            )}
            {w?.provider === "simulated" && (
              <p className="note" style={{ marginTop: 14 }}>
                Test mode: payments and withdrawals are simulated and no real money moves yet.
              </p>
            )}
          </section>

          <section className="card">
            <div className="card-head"><h2>Activity</h2></div>
            {view?.ledger.length ? (
              view.ledger.map((l) => (
                <div className="row" key={l.id}>
                  <span className="avatar">{l.type === "CREDIT" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
                  <span className="content">
                    <b>{l.description || (l.type === "CREDIT" ? "Payment received" : "Withdrawal")}</b>
                    <p>{dateTime(l.createdAt)}{l.invoiceNumber ? ` · ${l.invoiceNumber}` : ""}</p>
                  </span>
                  <span className="end">
                    <b className={l.type === "CREDIT" ? "success" : "danger-text"}>
                      {l.type === "CREDIT" ? "+" : "−"}{money(l.amount)}
                    </b>
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">No wallet activity yet. Payments from your links will show here.</p>
            )}
          </section>
        </div>

        <section className="card">
          <h2 className="title-sm">Withdraw to your bank</h2>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="label" htmlFor="wamount">Amount (₦)</label>
              <input id="wamount" className="field" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="wbank">Bank</label>
              <select id="wbank" className="field" value={bank} onChange={(e) => setBank(e.target.value)}>
                <option value="">{meta ? "Choose your bank" : "Loading…"}</option>
                {meta?.banks.map((b) => <option key={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="wno">Account number</label>
              <input id="wno" className="field" inputMode="numeric" maxLength={10} value={acctNo} onChange={(e) => setAcctNo(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="wname">Account name</label>
              <input id="wname" className="field" value={acctName} onChange={(e) => setAcctName(e.target.value)} />
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="small success" role="status">{notice}</p>}
            <button className="btn blue block" disabled={busy} style={{ marginTop: 12 }}>
              <Send size={16} /> {busy ? "Submitting…" : "Withdraw"}
            </button>
          </form>

          {view?.withdrawals.length ? (
            <>
              <div className="divider" />
              <h3 className="title-sm">Recent withdrawals</h3>
              {view.withdrawals.slice(0, 6).map((x) => (
                <div className="kv" key={x.id}>
                  <span>{x.bankName} · {dateTime(x.createdAt)}</span>
                  <b>{money(x.amount)} · {x.status.toLowerCase()}</b>
                </div>
              ))}
            </>
          ) : null}
        </section>
      </div>
    </>
  );
}
