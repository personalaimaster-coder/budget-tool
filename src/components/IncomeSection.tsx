"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { SPENDERS, formatINR } from "@/lib/categories";
import { toast } from "@/components/Toaster";

type Income = {
  id: string;
  label: string | null;
  amount: number;
  spender: string | null;
};

export function IncomeSection({
  month,
  onTotalChange,
}: {
  month: string;
  onTotalChange?: (total: number) => void;
}) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [spender, setSpender] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/incomes?month=${month}`);
      const data = await res.json();
      if (res.ok) {
        setIncomes(data.incomes ?? []);
        onTotalChange?.(Number(data.total) || 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function add() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast("Enter a valid income amount.", "warning");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/incomes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          month,
          label,
          amount: amt,
          spender: spender || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to add income.", "error");
        return;
      }
      setLabel("");
      setAmount("");
      setSpender("");
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/incomes?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Failed to delete income.", "error");
      return;
    }
    await load();
  }

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Income
        </h2>
        <span className="text-sm font-semibold text-emerald-400">
          {formatINR(total)}
        </span>
      </div>

      <div className="space-y-2">
        {loading && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        )}
        {!loading && incomes.length === 0 && (
          <p className="text-sm text-slate-500">No income added for this month.</p>
        )}
        {incomes.map((i) => (
          <div
            key={i.id}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {i.label || "Income"}
                {i.spender ? (
                  <span className="ml-2 text-xs text-slate-500">{i.spender}</span>
                ) : null}
              </p>
            </div>
            <span className="font-semibold text-emerald-400">
              {formatINR(Number(i.amount))}
            </span>
            <button
              onClick={() => remove(i.id)}
              className="text-slate-500 hover:text-red-400"
              aria-label="Delete income"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Salary)"
            className="col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount ₹"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <select
            value={spender}
            onChange={(e) => setSpender(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Who? (optional)</option>
            {SPENDERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={add}
          disabled={adding}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add income
        </button>
      </div>
    </section>
  );
}
