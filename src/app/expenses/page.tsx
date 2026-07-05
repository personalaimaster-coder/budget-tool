"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell, useSpenderCtx } from "@/components/AppShell";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { ExpenseEditModal } from "@/components/ExpenseEditModal";
import { toast } from "@/components/Toaster";
import { currentMonthKey } from "@/lib/month";
import {
  KIND_LABELS,
  KINDS,
  SPENDERS,
  formatINR,
  type BudgetCategory,
} from "@/lib/categories";
import type { ExpenseRow } from "@/lib/types";

function ExpensesPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [spender, setSpender] = useState("all");
  const [category, setCategory] = useState("all");
  const [kind, setKind] = useState("all");

  const { spender: currentSpender } = useSpenderCtx();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (spender !== "all") params.set("spender", spender);
      if (category !== "all") params.set("category", category);
      if (kind !== "all") params.set("kind", kind);
      const res = await fetch(`/api/expenses?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setExpenses(data.expenses ?? []);
      else toast(data.error || "Failed to load expenses.", "error");
    } catch {
      toast("Failed to load expenses.", "error");
    } finally {
      setLoading(false);
    }
  }, [month, spender, category, kind]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Failed to delete expense.", "error");
      return;
    }
    toast("Expense deleted.", "success");
    await load();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const selectClass =
    "rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm outline-none focus:border-indigo-500";

  return (
    <div className="space-y-4">
      <MonthSwitcher month={month} onChange={setMonth} />

      <div className="grid grid-cols-3 gap-2">
        <select
          value={spender}
          onChange={(e) => setSpender(e.target.value)}
          className={selectClass}
        >
          <option value="all">All people</option>
          {SPENDERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={selectClass}
        >
          <option value="all">All types</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={selectClass}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => setAdding(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4" />
        Add expense manually
      </button>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {expenses.length} transaction{expenses.length === 1 ? "" : "s"}
        </span>
        <span className="font-semibold">{formatINR(total)}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : expenses.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No transactions match these filters.
        </p>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-300"
                title={e.spender}
              >
                {e.spender?.[0] ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {e.item_description || e.category}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {e.category} ·{" "}
                  {new Date(e.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                  {e.description ? ` · ${e.description}` : ""}
                </p>
              </div>
              <span className="shrink-0 font-semibold">
                {formatINR(Number(e.amount))}
              </span>
              <button
                onClick={() => setEditing(e)}
                className="text-slate-500 hover:text-slate-300"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(e.id)}
                className="text-slate-500 hover:text-red-400"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ExpenseEditModal
          expense={editing}
          categories={categories.map((c) => c.name)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {adding && (
        <ExpenseEditModal
          categories={categories.map((c) => c.name)}
          defaultSpender={currentSpender ?? undefined}
          onSaved={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell title="Expenses">
      <ExpensesPage />
    </AppShell>
  );
}
