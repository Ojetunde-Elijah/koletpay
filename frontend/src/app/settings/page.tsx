"use client";
import { useState } from "react";
import { Save, ShieldCheck, LogOut } from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { useMeta } from "@/lib/meta";
import { errorMessage } from "@/lib/api";
import { PageHead } from "@/components/Shell";

export default function Settings() {
  const { data, updateBusiness, logout } = useKoletPay();
  const meta = useMeta();
  const [info, setInfo] = useState(data.business);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof info, v: string) => setInfo({ ...info, [k]: v });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateBusiness({
        name: info.name,
        ownerName: info.ownerName,
        email: info.email,
        phone: info.phone,
        whatsapp: info.whatsapp,
        businessType: info.businessType,
        category: info.category,
        rcNumber: info.rcNumber,
        tin: info.tin ?? "",
        state: info.state,
        city: info.city,
        address: info.address,
      });
      setNotice("Business details saved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const text = (key: keyof typeof info, label: string, type = "text", required = true) => (
    <div className="form-group">
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} type={type} required={required} className="field" value={(info[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} />
    </div>
  );
  const pick = (key: keyof typeof info, label: string, options: string[]) => (
    <div className="form-group">
      <label className="label" htmlFor={key}>{label}</label>
      <select id={key} className="field" value={(info[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)}>
        {!options.includes(info[key] as string) && <option value={info[key] as string}>{(info[key] as string) || "Choose"}</option>}
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <PageHead title="Business settings" sub="Keep your business details consistent across invoices and receipts." />
      <div className="grid-main">
        <section className="card">
          <h2 className="title-sm">Business profile</h2>
          <form onSubmit={save}>
            <div className="form-grid">
              {text("name", "Business name")}
              {text("ownerName", "Owner full name")}
              {text("email", "Business email", "email")}
              {text("phone", "Business phone")}
              {text("whatsapp", "WhatsApp number", "text", false)}
              {pick("businessType", "Business type", meta?.businessTypes ?? [])}
              {pick("category", "Category", meta?.categories ?? [])}
              {text("rcNumber", "CAC number", "text", false)}
              {text("tin", "Tax ID (TIN)", "text", false)}
              {pick("state", "State", meta?.states ?? [])}
              {text("city", "City / town")}
              {text("address", "Business address")}
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn blue" type="submit" disabled={busy}>
              <Save size={16} /> {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
          {notice && <p role="status" className="small success" style={{ marginTop: 10 }}>{notice}</p>}
        </section>
        <section className="card">
          <h2 className="title-sm">Account</h2>
          <div className="note">
            <ShieldCheck size={17} style={{ verticalAlign: "middle" }} /> Your data is stored securely on the KoletPay
            server and is only visible to your business.
          </div>
          <div className="divider" />
          <button className="btn danger" onClick={logout}>
            <LogOut size={15} /> Sign out
          </button>
        </section>
      </div>
    </>
  );
}
