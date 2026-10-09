"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, Plus, X, Users, Phone, Mail, ArrowRight } from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { forCustomer } from "@/lib/metrics";
import { money } from "@/lib/types";
import { errorMessage } from "@/lib/api";
import { PageHead, Empty } from "@/components/Shell";
const blank = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  location: "",
  contact: "Phone" as const,
  notes: "",
  project: "",
  projectDetails: "",
  projectDue: "",
};
export default function Customers() {
  const { data, addCustomer } = useKoletPay();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof blank>({ ...blank });
  const visible = data.customers.filter((c) =>
    `${c.name} ${c.phone} ${c.email} ${c.project}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await addCustomer(form);
      setForm({ ...blank });
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        title="Customers"
        sub="Your contact book, purchase history and project ledger in one place."
        action={
          <button className="btn blue" onClick={() => setOpen(true)}>
            <Plus size={17} /> Add customer
          </button>
        }
      />
      <div
        className="stats"
        style={{
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          maxWidth: 560,
        }}
      >
        <div className="stat blueish">
          <span className="stat-head">
            <Users size={17} /> Total customers
          </span>
          <strong>{data.customers.length}</strong>
          <small>Profiles in your ledger</small>
        </div>
        <div className="stat amberish">
          <span className="stat-head">Open balances</span>
          <strong>
            {money(
              data.customers.reduce(
                (s, c) => s + forCustomer(data, c.id).outstanding,
                0,
              ),
            )}
          </strong>
          <small>Payments still expected</small>
        </div>
      </div>
      <div className="card">
        <div className="search">
          <Search size={18} color="#76809a" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, email or project"
            aria-label="Search customers"
          />
        </div>
        {visible.length ? (
          <div className="table-scroll">
            <table className="list-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Orders</th>
                  <th>Amount received</th>
                  <th>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const m = forCustomer(data, c.id);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/customers/${c.id}`}>{c.name}</Link>
                        <p className="small">
                          {c.project || "No active project"}
                        </p>
                      </td>
                      <td>
                        {c.phone}
                        <br />
                        <span className="small muted">{c.email}</span>
                      </td>
                      <td>{m.invoices.length}</td>
                      <td>{money(m.spent)}</td>
                      <td
                        style={{
                          color: m.outstanding ? "var(--red)" : "var(--green)",
                          fontWeight: 800,
                        }}
                      >
                        {money(m.outstanding)}
                      </td>
                      <td>
                        <Link className="btn sm" href={`/customers/${c.id}`}>
                          Details <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No customers found"
            description="Change the search or add your first customer."
          />
        )}
      </div>
      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-label="Add customer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-head">
              <h2>Add customer</h2>
              <button
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="form-grid">
                {(
                  [
                    ["name", "Full name *"],
                    ["phone", "Phone number"],
                    ["whatsapp", "WhatsApp number"],
                    ["email", "Email address"],
                    ["address", "Home / delivery address"],
                    ["location", "Area / city"],
                    ["project", "Current project / order"],
                    ["projectDue", "Project due date"],
                  ] as [keyof typeof blank, string][]
                ).map(([key, label]) => (
                  <div className="form-group" key={key}>
                    <label className="label" htmlFor={key}>
                      {label}
                    </label>
                    <input
                      id={key}
                      required={key === "name"}
                      className="field"
                      type={
                        key === "projectDue"
                          ? "date"
                          : key === "email"
                            ? "email"
                            : "text"
                      }
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
                <div className="form-group">
                  <label className="label" htmlFor="contact">
                    Preferred contact
                  </label>
                  <select
                    id="contact"
                    className="field"
                    value={form.contact}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        contact: e.target.value as typeof form.contact,
                      })
                    }
                  >
                    <option>Phone</option>
                    <option>Email</option>
                    <option>WhatsApp</option>
                  </select>
                </div>
                <div className="form-group wide">
                  <label className="label">Project details</label>
                  <textarea
                    className="field"
                    value={form.projectDetails}
                    onChange={(e) =>
                      setForm({ ...form, projectDetails: e.target.value })
                    }
                  />
                </div>
                <div className="form-group wide">
                  <label className="label">Customer notes</label>
                  <textarea
                    className="field"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="btnrow">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button className="btn blue" type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
