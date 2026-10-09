"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useKoletPay } from "@/lib/store";
import { PageHead, Status } from "@/components/Shell";
import {
  amountOf,
  money,
  paidOf,
  remainingOf,
  shortDate,
  statusOf,
} from "@/lib/types";
export default function Invoices() {
  const { data } = useKoletPay();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const invoices = [...data.invoices]
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .filter((inv) => {
      const customer = data.customers.find((c) => c.id === inv.customerId);
      return (
        `${inv.id} ${customer?.name} ${inv.items.map((i) => i.description).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (filter === "All" || statusOf(inv) === filter)
      );
    });
  return (
    <>
      <PageHead
        title="Invoices"
        sub="Track what customers bought and how much they still owe."
        action={
          <Link href="/invoices/new" className="btn blue">
            <Plus size={16} /> Create invoice
          </Link>
        }
      />
      <section className="card">
        <div className="filter-row">
          <div className="search" style={{ margin: 0, flex: 1 }}>
            <Search size={17} />
            <input
              placeholder="Search invoice, customer or item"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="compact-select"
            aria-label="Filter invoices"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["All", "Paid", "Pending", "Partially paid", "Overdue"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </div>
        <div className="table-scroll">
          <table className="list-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Items / services</th>
                <th>Amount</th>
                <th>Received</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`}>{inv.id}</Link>
                  </td>
                  <td>
                    {data.customers.find((c) => c.id === inv.customerId)?.name}
                  </td>
                  <td>{inv.items.map((i) => i.description).join(", ")}</td>
                  <td>{money(amountOf(inv))}</td>
                  <td>{money(paidOf(inv))}</td>
                  <td>{money(remainingOf(inv))}</td>
                  <td>
                    <Status status={statusOf(inv)} />
                  </td>
                  <td>{shortDate(inv.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!invoices.length && (
          <p style={{ padding: 18 }}>No invoices match your filter.</p>
        )}
      </section>
    </>
  );
}
