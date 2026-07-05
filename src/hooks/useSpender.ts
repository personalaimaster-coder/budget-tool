"use client";

import { useCallback, useEffect, useState } from "react";
import { SPENDERS, type Spender } from "@/lib/categories";

const STORAGE_KEY = "bt_spender";

export function useSpender() {
  const [spender, setSpenderState] = useState<Spender | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (SPENDERS as readonly string[]).includes(stored)) {
        setSpenderState(stored as Spender);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const setSpender = useCallback((value: Spender) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setSpenderState(value);
  }, []);

  const clearSpender = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSpenderState(null);
  }, []);

  return { spender, setSpender, clearSpender, ready };
}
