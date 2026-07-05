"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatINR, type Spender } from "@/lib/categories";
import { toast } from "@/components/Toaster";
import type { ParsedExpense } from "@/components/VoiceRecorder";

export function ConfirmModal({
  parsed,
  spender,
  categories,
  onSaved,
  onCancel,
}: {
  parsed: ParsedExpense;
  spender: Spender;
  categories: string[];
  onSaved: (category: string) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(parsed.amount || ""));
  const [category, setCategory] = useState(parsed.category);
  const [item, setItem] = useState(parsed.item);
  const [description, setDescription] = useState(parsed.description ?? "");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast("Please enter a valid amount.", "warning");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          category,
          item_description: item,
          description,
          spender,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to save expense.", "error");
        setSaving(false);
        return;
      }
      toast(`Saved ${formatINR(amt)} · ${category}`, "success");
      onSaved(category);
    } catch {
      toast("Something went wrong saving the expense.", "error");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Confirm expense</h3>
        {parsed.transcript && (
          <p className="mt-1 text-sm italic text-slate-400">
            &ldquo;{parsed.transcript}&rdquo;
          </p>
        )}

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

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Item
            </label>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. Ice cream"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Description (extra details)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. monthly SIP, from BigBasket, for the kids' party"
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>

          <p className="text-sm text-slate-400">
            Logging as{" "}
            <span className="font-medium text-slate-200">{spender}</span>
          </p>
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
            onClick={confirm}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
