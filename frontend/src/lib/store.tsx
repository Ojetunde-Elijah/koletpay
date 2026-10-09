"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  Business, Customer, Invoice, LedgerEntry, PayLink, Product, StoreData, Wallet, Withdrawal,
} from "./types";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api";

const EMPTY_BUSINESS: Business = {
  id: "", name: "", ownerName: "", email: "", phone: "", whatsapp: "", businessType: "",
  category: "", rcNumber: "", state: "", city: "", address: "",
};
const EMPTY: StoreData = { customers: [], products: [], invoices: [], links: [], wallet: null, business: EMPTY_BUSINESS };

export type RegisterInput = {
  ownerName: string; email: string; phone: string; whatsapp?: string; password: string;
  businessName: string; businessType: string; category: string; rcNumber?: string;
  state: string; city: string; address: string;
};
export type NewInvoice = {
  customerId: string;
  dueAt: string;
  items: { productId?: string; description: string; quantity: number; unitPrice: number }[];
  notes: string;
  createLink?: boolean;
  source?: "manual" | "assistant";
};
export type WalletView = { wallet: Wallet; ledger: LedgerEntry[]; withdrawals: Withdrawal[] };
type AuthResult = { token: string; business: Business; wallet: Wallet | null };
type Status = "loading" | "signedOut" | "signedIn";

type Store = {
  status: Status;
  loaded: boolean;
  data: StoreData;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  addCustomer: (record: Partial<Customer> & { name: string }) => Promise<Customer>;
  editCustomer: (id: string, patch: Partial<Customer>) => Promise<void>;
  addProduct: (record: Omit<Product, "id">) => Promise<void>;
  addInvoice: (record: NewInvoice) => Promise<{ invoice: Invoice; link: PayLink | null }>;
  recordPayment: (invoiceId: string, amount: number, method: string) => Promise<void>;
  createLink: (input: {
    title: string; description?: string; amount?: number;
    items?: { description: string; quantity: number; unitPrice: number }[];
    expiresInDays?: number | null;
  }) => Promise<PayLink>;
  createInvoiceLink: (invoiceId: string, amount?: number) => Promise<PayLink>;
  disableLink: (id: string) => Promise<void>;
  updateBusiness: (patch: Partial<Business>) => Promise<void>;
  loadWallet: () => Promise<WalletView>;
  withdraw: (input: { amount: number; bankName: string; accountNumber: string; accountName: string }) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<StoreData>(EMPTY);

  const signOut = useCallback(() => {
    setToken(null);
    setData(EMPTY);
    setLoaded(false);
    setStatus("signedOut");
  }, []);

  const refresh = useCallback(async () => {
    const d = await api<StoreData>("/api/bootstrap");
    setData(d);
    setLoaded(true);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Restore the session on first load.
  useEffect(() => {
    if (!getToken()) {
      setStatus("signedOut");
      return;
    }
    refresh()
      .then(() => setStatus("signedIn"))
      .catch((e) => {
        if (!getToken()) return; // a 401 already signed the user out
        if (e?.status === 0) setStatus("signedIn"); // network blip: do not log people out
        else signOut();
      });
  }, [refresh, signOut]);

  const finishAuth = async (res: AuthResult) => {
    setToken(res.token);
    await refresh();
    setStatus("signedIn");
  };

  const value = useMemo<Store>(
    () => ({
      status, loaded, data, refresh,
      login: async (email, password) =>
        finishAuth(await api<AuthResult>("/api/auth/login", { method: "POST", body: { email, password }, auth: false })),
      register: async (input) => {
        const res = await api<AuthResult>("/api/auth/register", { method: "POST", body: input, auth: false });
        await finishAuth(res);
      },
      logout: signOut,
      addCustomer: async (record) => {
        const c = await api<Customer>("/api/customers", { method: "POST", body: record });
        await refresh();
        return c;
      },
      editCustomer: async (id, patch) => {
        await api(`/api/customers/${id}`, { method: "PATCH", body: patch });
        await refresh();
      },
      addProduct: async (record) => {
        await api("/api/products", { method: "POST", body: record });
        await refresh();
      },
      addInvoice: async (record) => {
        const res = await api<{ invoice: Invoice; link: PayLink | null }>("/api/invoices", { method: "POST", body: record });
        await refresh();
        return res;
      },
      recordPayment: async (invoiceId, amount, method) => {
        await api(`/api/invoices/${encodeURIComponent(invoiceId)}/payments`, { method: "POST", body: { amount, method } });
        await refresh();
      },
      createLink: async (input) => {
        const l = await api<PayLink>("/api/links", { method: "POST", body: input });
        await refresh();
        return l;
      },
      createInvoiceLink: async (invoiceId, amount) => {
        const l = await api<PayLink>(`/api/invoices/${encodeURIComponent(invoiceId)}/links`, {
          method: "POST", body: amount ? { amount } : {},
        });
        await refresh();
        return l;
      },
      disableLink: async (id) => {
        await api(`/api/links/${id}/disable`, { method: "POST" });
        await refresh();
      },
      updateBusiness: async (patch) => {
        await api("/api/business/me", { method: "PATCH", body: patch });
        await refresh();
      },
      loadWallet: () => api<WalletView>("/api/wallet"),
      withdraw: async (input) => {
        await api("/api/wallet/withdrawals", { method: "POST", body: input });
        await refresh();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, loaded, data, refresh, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useKoletPay = () => {
  const val = useContext(Ctx);
  if (!val) throw new Error("StoreProvider missing");
  return val;
};
