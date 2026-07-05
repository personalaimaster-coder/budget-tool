"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { SPENDERS } from "@/lib/categories";
import { toast } from "@/components/Toaster";
import type { ExpenseRow } from "@/lib/types";

function toDateInput(iso: string): string {
  // Render the stored timestamp as a YYYY-MM-DD date in IST.
  const d = new Date(iso);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export function ExpenseEditModal({
  expense,
  categories,
  defaultSpender,
  onSaved,
  onCancel,
}: {
  expense?: ExpenseRow | null;
  categories: string[];
  defaultSpender?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!expense;
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState(
    expense?.category ?? categories[0] ?? ""
  );
  const [item, setItem] = useState(expense?.item_description ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [spender, setSpender] = useState(
    expense?.spender ?? defaultSpender ?? SPENDERS[0]
  );
  const [date, setDate] = useState(
    toDateInput(expense?.date ?? new Date().toISOString())
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast("Enter a valid amount.", "warning");
      return;
    }
    if (!category) {
      toast("Pick a category.", "warning");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        amount: amt,
        category,
        item_description: item,
        description,
        spender,
        // noon IST so it stays on the chosen calendar day
        date: `${date}T12:00:00+05:30`,
      };
      const res = await fetch("/api/expenses", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isEdit ? { id: expense!.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(
          data.error || `Failed to ${isEdit ? "update" : "add"} expense.`,
          "error"
        );
        setSaving(false);
        return;
      }
      toast(isEdit ? "Expense updated." : "Expense added.", "success");
      onSaved();
    } catch {
      toast("Something went wrong.", "error");
      setSaving(false);
    }
  }

  // Make sure the current (possibly removed) category is still selectable.
  const options = categories.includes(category)
    ? categories
    : [category, ...categories];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <h3 className="text-lg font-semibold">
          {isEdit ? "Edit expense" : "Add expense"}
        </h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Amount (₹)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-indigo-500"
              >
                {options.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Who
              </label>
              <select
                value={spender}
                onChange={(e) => setSpender(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-indigo-500"
              >
                {SPENDERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Item
            </label>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-slate-700 px-4 py-3 font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
