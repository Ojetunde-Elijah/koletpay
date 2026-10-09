"use client";
import { useState } from "react";
import { Plus, Package, X, Search } from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { PageHead } from "@/components/Shell";
import { money } from "@/lib/types";
import { errorMessage } from "@/lib/api";
export default function Products() {
  const { data, addProduct } = useKoletPay();
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"Product" | "Service">("Product");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !Number.isInteger(Number(price)) || Number(price) < 0) {
      setError("Enter a name and a whole-naira price.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addProduct({ name: name.trim(), kind, price: Number(price), description: desc });
      setName("");
      setPrice("");
      setDesc("");
      setShow(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        title="Products & services"
        sub="Your price list — add items once, use them on every invoice."
        action={
          <button onClick={() => setShow(true)} className="btn blue">
            <Plus size={17} /> Add item
          </button>
        }
      />
      <section className="card">
        <div className="search">
          <Search size={17} />
          <input
            placeholder="Search products or services"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table className="list-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Description</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {data.products
                .filter((p) =>
                  `${p.name} ${p.description}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.name}</b>
                    </td>
                    <td>
                      <span className="pill">{p.kind}</span>
                    </td>
                    <td>{p.description}</td>
                    <td>
                      <b>{money(p.price)}</b>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      {show && (
        <div className="modal-backdrop" onClick={() => setShow(false)}>
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-label="New product"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-head">
              <h2>New product or service</h2>
              <button className="icon-button" onClick={() => setShow(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="label">Item name</label>
                <input
                  required
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Custom tote bag"
                />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Type</label>
                  <select
                    className="field"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as typeof kind)}
                  >
                    <option>Product</option>
                    <option>Service</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Unit price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="field"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea
                  className="field"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="btn blue block" disabled={busy}>{busy ? "Saving…" : "Save item"}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
