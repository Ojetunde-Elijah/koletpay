"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Mic,
  Sparkles,
  ArrowUp,
  Volume2,
  ReceiptText,
  Info,
  Link2,
} from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { api, errorMessage } from "@/lib/api";
import { PageHead } from "@/components/Shell";
import { money, shortDate } from "@/lib/types";

type Parsed = {
  customerId: string;
  customerName: string;
  description: string;
  quantity: number;
  unitPrice: number | null;
  dueAt: string;
  createLink: boolean;
  source: string;
};
type ParseResult = {
  source: string;
  dueAt: string;
  customer: { id: string; name: string } | null;
  draft: {
    customerName?: string | null;
    description: string;
    quantity: number;
    unitPrice?: number | null;
    createLink: boolean;
  };
};
type SpeechLike = {
  lang: string;
  onresult:
    | ((ev: {
        results: { [k: number]: { [k: number]: { transcript: string } } };
      }) => void)
    | null;
  onerror: (() => void) | null;
  start: () => void;
};
export default function Assistant() {
  const { addInvoice, createLink } = useKoletPay();
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [created, setCreated] = useState("");
  const [listening, setListening] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [badge, setBadge] = useState("");

  const ask = async (input: string) => {
    setText(input);
    setCreated("");
    setParsed(null);
    const v = input.trim();
    if (v.length < 2) {
      setReply("Type a question or an instruction like “Invoice Sarah 20k for custom mugs”.");
      return;
    }
    setBusy(true);
    try {
      if (/\b(invoice|bill|charge)\b/i.test(v)) {
        const r = await api<ParseResult>("/api/assistant/parse-invoice", { method: "POST", body: { text: v } });
        setBadge(r.source === "gemini" ? "Gemini" : "Basic parser");
        if (!r.draft.unitPrice) {
          setReply("I could not find an amount. Try: “Invoice Sarah 20k for custom mugs”.");
        } else {
          setParsed({
            customerId: r.customer?.id ?? "",
            customerName: r.customer?.name ?? r.draft.customerName ?? "",
            description: r.draft.description,
            quantity: r.draft.quantity,
            unitPrice: r.draft.unitPrice,
            dueAt: r.dueAt,
            createLink: r.draft.createLink,
            source: r.source,
          });
          setReply(
            r.customer
              ? `Draft ready for ${r.customer.name}. Check it below, then create it.`
              : `I could not find ${r.draft.customerName ? `“${r.draft.customerName}”` : "a customer"} in your list. You can send a payment link instead and they will be added when they pay.`,
          );
        }
      } else {
        const r = await api<{ answer: string; source: string }>("/api/assistant/ask", { method: "POST", body: { question: v } });
        setBadge(r.source === "gemini" ? "Gemini" : "Summary");
        setReply(r.answer);
      }
    } catch (e) {
      setReply(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!parsed || !parsed.customerId || !parsed.unitPrice) return;
    setBusy(true);
    try {
      const res = await addInvoice({
        customerId: parsed.customerId,
        dueAt: parsed.dueAt,
        items: [{ productId: "", description: parsed.description, unitPrice: parsed.unitPrice, quantity: parsed.quantity }],
        notes: "Drafted with Kolet AI.",
        createLink: parsed.createLink,
        source: "assistant",
      });
      setCreated(res.invoice.id);
      setReply(`Invoice ${res.invoice.id} created. Open it to check the details${res.link ? " and copy the payment link" : ""}.`);
      setParsed(null);
    } catch (e) {
      setReply(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const makeLink = async () => {
    if (!parsed || !parsed.unitPrice) return;
    setBusy(true);
    try {
      await createLink({
        title: parsed.description,
        items: [{ description: parsed.description, quantity: parsed.quantity, unitPrice: parsed.unitPrice }],
        expiresInDays: 30,
      });
      setReply("Payment link created. Find it under Payment links and send it to your customer.");
      setParsed(null);
    } catch (e) {
      setReply(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const voice = () => {
    const W = window as typeof window & {
      SpeechRecognition?: new () => SpeechLike;
      webkitSpeechRecognition?: new () => SpeechLike;
    };
    const C = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!C) {
      setReply(
        "Voice dictation is unavailable in this browser. Type your instruction below instead.",
      );
      return;
    }
    try {
      const rec = new C();
      rec.lang = "en-NG";
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setText(transcript);
        ask(transcript);
        setListening(false);
      };
      rec.onerror = () => {
        setListening(false);
        setReply(
          "Microphone could not be accessed. Please type the command instead.",
        );
      };
      rec.start();
      setListening(true);
    } catch {
      setReply(
        "Unable to start the microphone. You can type the same instruction.",
      );
      setListening(false);
    }
  };
  return (
    <>
      <PageHead
        title="Ask KoletPay"
        sub="Ask about your business, or describe an invoice in one sentence. You can also dictate by voice."
      />
      <div className="grid-main">
        <section className="card">
          <div className="assistant-hero">
            <span className="assistant-icon">
              <Sparkles size={30} />
            </span>
            <h2>Your business assistant</h2>
            <p>
              Ask about money received, outstanding invoices or create a simple
              invoice from one sentence.
            </p>
          </div>
          <div className="stack" style={{ marginBottom: 20 }}>
            <span className="eyebrow">Try one</span>
            <div className="suggestions">
              {[
                "Who owes me money?",
                "How much revenue this month?",
                "Show payments above ₦20,000",
                "Invoice Sarah 20k for custom mugs",
              ].map((q) => (
                <button key={q} onClick={() => void ask(q)} className="btn sm" disabled={busy}>
                  {q}
                </button>
              ))}
            </div>
          </div>
          {reply && (
            <div
              className="note"
              role="status"
              style={{ lineHeight: 1.7, marginBottom: 16 }}
            >
              <b>Kolet AI{badge ? ` (${badge})` : ""}:</b> {reply}
            </div>
          )}
          {parsed && (
            <div
              className="card"
              style={{ background: "#f7f8ff", boxShadow: "none" }}
            >
              <h3 className="title-sm">Review draft before creating</h3>
              <div className="kv">
                <span className="key">Customer</span>
                <b>{parsed.customerName}</b>
              </div>
              <div className="kv">
                <span className="key">Item / service</span>
                <b>{parsed.description}</b>
              </div>
              <div className="kv">
                <span className="key">Amount</span>
                <b>{parsed.quantity > 1 ? `${parsed.quantity} × ` : ""}{money(parsed.unitPrice ?? 0)}</b>
              </div>
              <div className="kv">
                <span className="key">Due</span>
                <b>{shortDate(parsed.dueAt)}</b>
              </div>
              {parsed.customerId ? (
                <button className="btn blue block" style={{ marginTop: 16 }} onClick={create} disabled={busy}>
                  <ReceiptText size={16} /> Create invoice
                </button>
              ) : (
                <button className="btn blue block" style={{ marginTop: 16 }} onClick={makeLink} disabled={busy}>
                  <Link2 size={16} /> Create payment link instead
                </button>
              )}
            </div>
          )}
          {created && (
            <Link className="btn blue" href={`/invoices/${created}`}>
              Open {created} →
            </Link>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(text);
            }}
            className="assistant-composer"
          >
            <input
              className="field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about your business or draft an invoice…"
              aria-label="Ask KoletPay"
            />
            <button
              type="button"
              aria-label="Dictate using microphone"
              className={"btn " + (listening ? "blue" : "")}
              onClick={voice}
            >
              <Mic size={18} />
              {listening ? "Listening" : ""}
            </button>
            <button
              type="submit"
              className="btn blue"
              aria-label="Submit message"
              disabled={busy}
            >
              <ArrowUp size={18} />
            </button>
          </form>
        </section>
        <aside>
          <section className="card">
            <h2 className="title-sm">What Kolet AI can do</h2>
            <div className="row">
              <span className="avatar">
                <ReceiptText size={17} />
              </span>
              <span className="content">
                <b>Draft an invoice</b>
                <p>
                  Turns a sentence into an invoice draft you review first.
                </p>
              </span>
            </div>
            <div className="row">
              <span className="avatar">
                <Volume2 size={17} />
              </span>
              <span className="content">
                <b>Optional speech input</b>
                <p>Uses browser speech recognition when available.</p>
              </span>
            </div>
            <div className="row">
              <span className="avatar">
                <Info size={17} />
              </span>
              <span className="content">
                <b>Answer questions</b>
                <p>Revenue, outstanding balances and your wallet.</p>
              </span>
            </div>
            <div className="note" style={{ marginTop: 20 }}>
              Powered by Gemini. Kolet AI only <b>drafts</b>: nothing is created, sent or paid until you confirm. If
              Gemini is unavailable, a basic parser takes over.
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
