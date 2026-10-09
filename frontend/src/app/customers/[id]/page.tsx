"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  Pencil,
  Save,
  ReceiptText,
  CalendarDays,
  ShoppingBag,
  Wallet,
  FileText,
} from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { errorMessage } from "@/lib/api";
import { forCustomer } from "@/lib/metrics";
import {
  amountOf,
  money,
  paidOf,
  remainingOf,
  shortDate,
  statusOf,
} from "@/lib/types";
import { PageHead, Status } from "@/components/Shell";
export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, editCustomer } = useKoletPay();
  const c = data.customers.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(c);
  }, [c?.id]);
  if (!c)
    return (
      <>
        <PageHead title="Customer not found" />
        <Link className="btn" href="/customers">
          Back to customers
        </Link>
      </>
    );
  const t = forCustomer(data, id);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft?.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await editCustomer(id, {
        name: draft.name,
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        email: draft.email,
        address: draft.address,
        location: draft.location,
        contact: draft.contact,
        notes: draft.notes,
        project: draft.project,
        projectDetails: draft.projectDetails,
        projectDue: draft.projectDue,
      });
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="filter-row">
        <Link href="/customers" className="btn sm">
          <ArrowLeft size={15} /> Customers
        </Link>
        <span className="eyebrow">Customer record</span>
      </div>
      <PageHead
        title="Customer details"
        sub="Contacts, projects, purchases and payment history."
        action={
          <Link href={`/invoices/new?customer=${id}`} className="btn blue">
            <ReceiptText size={16} /> Create invoice
          </Link>
        }
      />
      <div className="card">
        <div className="profile-head">
          <span className="avatar giant">
            {c.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="profile-title">
            <h2>{c.name}</h2>
            <p>Customer since {shortDate(c.joinedAt)}</p>
            <div
              className="btnrow"
              style={{ justifyContent: "flex-start", marginTop: 12 }}
            >
              {c.phone && (
                <a href={`tel:${c.phone}`} className="btn sm">
                  <Phone size={14} /> Call
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className="btn sm">
                  <Mail size={14} /> Email
                </a>
              )}
              <button className="btn sm" onClick={() => setEditing(!editing)}>
                <Pencil size={14} />
                {editing ? "Cancel edit" : "Edit profile"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        className="stats"
        style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}
      >
        <div className="stat blueish">
          <span className="stat-head">
            <ShoppingBag size={17} /> Total invoiced
          </span>
          <strong>{money(t.invoiced)}</strong>
          <small>{t.invoices.length} order(s)</small>
        </div>
        <div className="stat greenish">
          <span className="stat-head">
            <Wallet size={17} /> Amount received
          </span>
          <strong>{money(t.spent)}</strong>
          <small>Recorded payments</small>
        </div>
        <div className="stat amberish">
          <span className="stat-head">Outstanding balance</span>
          <strong>{money(t.outstanding)}</strong>
          <small>Remaining to collect</small>
        </div>
      </div>
      {editing && draft ? (
        <div className="card">
          <h2 className="title-sm">Edit customer details</h2>
          <form onSubmit={save}>
            <div className="form-grid">
              {(
                [
                  "name",
                  "phone",
                  "whatsapp",
                  "email",
                  "address",
                  "location",
                  "project",
                  "projectDue",
                ] as const
              ).map((key) => (
                <div className="form-group" key={key}>
                  <label className="label" htmlFor={key}>
                    {
                      {
                        name: "Full name",
                        phone: "Phone number",
                        whatsapp: "WhatsApp number",
                        email: "Email",
                        address: "Home / delivery address",
                        location: "Area / city",
                        project: "Project name",
                        projectDue: "Project due date",
                      }[key]
                    }
                  </label>
                  <input
                    id={key}
                    className="field"
                    type={key === "projectDue" ? "date" : "text"}
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
              <div className="form-group">
                <label className="label">Preferred contact</label>
                <select
                  className="field"
                  value={draft.contact}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      contact: e.target.value as typeof draft.contact,
                    })
                  }
                >
                  <option>Phone</option>
                  <option>Email</option>
                  <option>WhatsApp</option>
                </select>
              </div>
              <div className="form-group wide">
                <label className="label">
                  Project requirements / description
                </label>
                <textarea
                  className="field"
                  value={draft.projectDetails}
                  onChange={(e) =>
                    setDraft({ ...draft, projectDetails: e.target.value })
                  }
                />
              </div>
              <div className="form-group wide">
                <label className="label">Private notes</label>
                <textarea
                  className="field"
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value })
                  }
                />
              </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn blue" type="submit" disabled={saving}>
              <Save size={16} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      ) : null}
      <div className="grid-half">
        <section className="card">
          <div className="card-head">
            <h2>Contact details</h2>
          </div>
          {(
            [
              ["Full name", c.name],
              ["Phone", c.phone || "Not provided"],
              ["WhatsApp", c.whatsapp || "Not provided"],
              ["Email", c.email || "Not provided"],
              ["Address", c.address || c.location || "Not provided"],
              ["Preferred contact", c.contact],
              ["Customer since", shortDate(c.joinedAt)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div className="kv" key={label}>
              <span className="key">{label}</span>
              <span className="val">{value}</span>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Current project / order</h2>
          </div>
          <div className="project">
            <b>{c.project || "No project recorded"}</b>
            <p style={{ whiteSpace: "pre-line", marginTop: 8 }}>
              {c.projectDetails ||
                "Add delivery details or the requirements of this project."}
            </p>
            <p style={{ marginTop: 12 }}>
              <CalendarDays size={14} style={{ verticalAlign: "middle" }} />{" "}
              {c.projectDue
                ? `Due ${shortDate(c.projectDue)}`
                : "No deadline set"}
            </p>
          </div>
          <div className="divider" />
          <h3 className="title-sm">Business notes</h3>
          <p style={{ whiteSpace: "pre-line" }}>{c.notes || "No notes yet."}</p>
        </section>
      </div>
      <section className="card">
        <div className="card-head">
          <h2>Purchase & invoice history</h2>
          <Link href={`/invoices/new?customer=${id}`}>New invoice →</Link>
        </div>
        {t.invoices.length ? (
          <div className="table-scroll">
            <table className="list-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>What was bought / service</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {t.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link href={`/invoices/${inv.id}`}>{inv.id}</Link>
                    </td>
                    <td>
                      {inv.items
                        .map((i) => `${i.description} (${i.quantity})`)
                        .join(", ")}
                    </td>
                    <td>{shortDate(inv.issuedAt)}</td>
                    <td>{money(amountOf(inv))}</td>
                    <td>{money(paidOf(inv))}</td>
                    <td>{money(remainingOf(inv))}</td>
                    <td>
                      <Status status={statusOf(inv)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No purchases yet — create the first invoice for this customer.</p>
        )}
      </section>
    </>
  );
}
