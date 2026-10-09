"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { installmentAmounts } from "@/lib/installments";
import { amountOf, lagosKey, money, remainingOf, shortDate } from "@/lib/types";
import { PageHead } from "@/components/Shell";
import { errorMessage } from "@/lib/api";
function Calculator() {
  const { data, recordPayment } = useKoletPay();
  const qp = useSearchParams();
  const [selected, setSelected] = useState(
    qp.get("invoice") ||
      data.invoices.find((i) => remainingOf(i) > 0)?.id ||
      "",
  );
  const inv = data.invoices.find((i) => i.id === selected);
  const balance = inv ? remainingOf(inv) : 0;
  const [parts, setParts] = useState(3);
  const [deposit, setDeposit] = useState(30);
  const [message, setMessage] = useState("");
  const amounts =
    balance > 0 ? installmentAmounts(balance, parts, deposit) : [];
  const dates = amounts.map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    return lagosKey(d);
  });
  const pay = async () => {
    if (inv && amounts[0] > 0) {
      try {
        await recordPayment(inv.id, amounts[0], "Bank transfer");
        setMessage(
          `${money(amounts[0])} recorded as the first installment. Later payments are not automatic; record each one when it arrives.`,
        );
      } catch (err) {
        setMessage(errorMessage(err));
      }
    } else
      setMessage(
        "Choose an unpaid invoice with a positive initial installment.",
      );
  };
  return (
    <>
      <PageHead
        title="Pay in parts"
        sub="Preview installment schedules before committing to a payment arrangement."
      />
      <div className="grid-main">
        <section className="card">
          <h2 className="title-sm">Plan settings</h2>
          <div className="form-group">
            <label className="label">Unpaid invoice</label>
            <select
              className="field"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setMessage("");
              }}
            >
              {data.invoices
                .filter((i) => remainingOf(i) > 0)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.id} —{" "}
                    {data.customers.find((c) => c.id === i.customerId)?.name} —{" "}
                    {money(remainingOf(i))} remaining
                  </option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Number of payments</label>
            <div className="seg" style={{ width: "100%" }}>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={parts === n ? "selected" : ""}
                  onClick={() => setParts(n)}
                >
                  {n} parts
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="label">Upfront amount</label>
            <div className="seg" style={{ width: "100%" }}>
              {[25, 30, 50, 70].map((n) => (
                <button
                  key={n}
                  className={deposit === n ? "selected" : ""}
                  onClick={() => setDeposit(n)}
                >
                  {n}%
                </button>
              ))}
            </div>
          </div>
          <div className="note">
            This calculator only plans the schedule. It does not extend credit, charge fees
            or collect later payments automatically.
          </div>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Installment schedule</h2>
            <span className="pill">{parts} payments</span>
          </div>
          <p>Remaining invoice balance</p>
          <div className="money-big" style={{ marginBottom: 18 }}>
            {money(balance)}
          </div>
          {amounts.map((amount, i) => (
            <div key={i} className="row">
              <span className="avatar">{i + 1}</span>
              <span className="content">
                <b>{i === 0 ? "Pay now" : "Payment " + (i + 1)}</b>
                <p>
                  <CalendarDays size={12} style={{ verticalAlign: "middle" }} />{" "}
                  {shortDate(dates[i])}
                </p>
              </span>
              <span className="end">
                <b>{money(amount)}</b>
              </span>
            </div>
          ))}
          <div className="status-line">
            <b>Total planned</b>
            <b className="money-big">
              {money(amounts.reduce((s, n) => s + n, 0))}
            </b>
          </div>
          <button
            className="btn blue block"
            disabled={!balance || amounts[0] === 0}
            onClick={pay}
          >
            <CheckCircle2 size={17} /> Record first installment
          </button>
          {message && (
            <p role="status" className="small" style={{ marginTop: 10 }}>
              {message}
            </p>
          )}
          {selected && (
            <Link
              className="btn block"
              href={`/invoices/${selected}`}
              style={{ marginTop: 9 }}
            >
              Return to invoice
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
export default function Installments() {
  return (
    <Suspense fallback={<p>Loading calculator...</p>}>
      <Calculator />
    </Suspense>
  );
}
