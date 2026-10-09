"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Clipboard, Ban, Link2 } from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { errorMessage } from "@/lib/api";
import { PageHead, Empty } from "@/components/Shell";
import { dateTime, money, payUrl, shortDate } from "@/lib/types";
import type { PayLink } from "@/lib/types";

const label = (l: PayLink) => {
  if (l.status === "ACTIVE" && l.expiresAt && new Date(l.expiresAt) < new Date()) return "Expired";
  return { ACTIVE: "Active", PROCESSING: "Processing", PAID: "Paid", DISABLED: "Disabled" }[l.status];
};

export default function Links() {
  const { data, disableLink } = useKoletPay();
  const [message, setMessage] = useState("");

  const copy = async (l: PayLink) => {
    try {
      await navigator.clipboard.writeText(payUrl(l.token));
      setMessage("Payment link copied. Send it to your customer on WhatsApp, SMS or email.");
    } catch {
      setMessage("Could not copy automatically. Select the link text and copy it.");
    }
  };
  const disable = async (l: PayLink) => {
    if (!window.confirm("Disable this link? Customers will no longer be able to pay with it.")) return;
    try {
      await disableLink(l.id);
      setMessage("Link disabled.");
    } catch (e) {
      setMessage(errorMessage(e));
    }
  };

  return (
    <>
      <PageHead
        title="Payment links"
        sub="Send a link. Your customer fills in their details, pays, and the money lands in your KoletPay wallet."
        action={
          <Link href="/invoices/new" className="btn blue">
            <Plus size={16} /> New link
          </Link>
        }
      />
      {message && <p className="note" role="status" style={{ marginBottom: 12 }}>{message}</p>}
      <section className="card">
        {data.links.length ? (
          data.links.map((l) => {
            const status = label(l);
            const usable = status === "Active";
            return (
              <div className="row" key={l.id} style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <span className="avatar"><Link2 size={18} /></span>
                <span className="content" style={{ minWidth: 220 }}>
                  <b>{l.title}</b>
                  <p>
                    {money(l.amount)} · created {shortDate(l.createdAt)}
                    {l.expiresAt && usable ? ` · expires ${shortDate(l.expiresAt)}` : ""}
                  </p>
                  {l.status === "PAID" && (
                    <p>
                      Paid by <b>{l.customerName}</b>
                      {l.paidAt ? ` · ${dateTime(l.paidAt)}` : ""} ·{" "}
                      <Link href={`/invoices/${l.invoiceNumber}`}>{l.invoiceNumber}</Link>
                    </p>
                  )}
                  {usable && <div className="copy-box" style={{ marginTop: 8 }}><span>{payUrl(l.token)}</span></div>}
                </span>
                <span className="end" style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                  <span className={`status ${status.toLowerCase()}`}>{status}</span>
                  {usable && (
                    <span style={{ display: "flex", gap: 6 }}>
                      <button className="btn sm" onClick={() => copy(l)}><Clipboard size={14} /> Copy</button>
                      <button className="btn sm danger" onClick={() => disable(l)}><Ban size={14} /> Disable</button>
                    </span>
                  )}
                </span>
              </div>
            );
          })
        ) : (
          <Empty title="No payment links yet" description="Create one from the Create invoice page: set a price, get a link, send it." />
        )}
      </section>
    </>
  );
}
