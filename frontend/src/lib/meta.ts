"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

export type Meta = {
  states: string[];
  banks: { name: string }[];
  businessTypes: string[];
  categories: string[];
};
let cache: Meta | null = null;

/** Nigerian states, banks, business types and categories, served by the API. */
export function useMeta() {
  const [meta, setMeta] = useState<Meta | null>(cache);
  useEffect(() => {
    if (cache) return;
    api<Meta>("/api/auth/meta", { auth: false })
      .then((m) => {
        cache = m;
        setMeta(m);
      })
      .catch(() => {});
  }, []);
  return meta;
}
