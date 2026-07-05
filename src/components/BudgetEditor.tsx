"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, Save } from "lucide-react";
import {
  KIND_LABELS,
  KIND_ORDER,
  KINDS,
  PRIORITIES,
  PRIORITY_LABELS,
  formatINR,
  type Kind,
  type Priority,
} from "@/lib/categories";
import type { StatusRow } from "@/lib/types";
import { toast } from "@/components/Toaster";

function CategoryRow({
  row,
  draft,
  onDraft,
  onReload,
}: {
  row: StatusRow;
  draft: string;
  onDraft: (value: string) => void;
  onReload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.category);
  const [kind, setKind] = useState<Kind>(row.kind);
  const [priority, setPriority] = useState<Priority>(row.priority);
  const [busy, setBusy] = useState(false);

  async function saveEdit() {
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.category_id, name, kind, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to update category.", "error");
        return;
      }
      setEditing(false);
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete category "${row.category}"? Its planned budget will be removed.`))
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/categories?id=${row.category_id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast("Failed to delete category.", "error");
        return;
      }
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-xl border border-indigo-500/40 bg-slate-900/60 p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={saveEdit}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{row.category}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                row.priority === "must_have"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "bg-slate-700/50 text-slate-400"
              }`}
            >
              {PRIORITY_LABELS[row.priority]}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Spent {formatINR(Number(row.spent))}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">₹</span>
          <input
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder="0"
            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-right text-sm outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => setEditing(true)}
            className="text-slate-500 hover:text-slate-300"
            aria-label="Edit category"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="text-slate-500 hover:text-red-400"
            aria-label="Delete category"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCategory({ onReload }: { onReload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("variable");
  const [priority, setPriority] = useState<Priority>("must_have");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) {
      toast("Enter a category name.", "warning");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, kind, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to add category.", "error");
        return;
      }
      setName("");
      setKind("variable");
      setPriority("must_have");
      setOpen(false);
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-700 px-3 py-3 text-sm font-medium text-slate-400 hover:border-indigo-500/50 hover:text-slate-200"
      >
        <Plus className="h-4 w-4" />
        Add category
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-indigo-500/40 bg-slate-900/60 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        autoFocus
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          onClick={add}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Add
        </button>
      </div>
    </div>
  );
}

export function BudgetEditor({
  month,
  rows,
  onReload,
  onPlannedTotalChange,
}: {
  month: string;
  rows: StatusRow[];
  onReload: () => Promise<void>;
  onPlannedTotalChange?: (total: number) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialise drafts when rows change (e.g. month switch / reload).
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const r of rows) {
      next[r.category_id] = Number(r.planned) ? String(r.planned) : "";
    }
    setDrafts(next);
  }, [rows]);

  const totalPlanned = useMemo(
    () =>
      Object.values(drafts).reduce((s, v) => s + (Number(v) || 0), 0),
    [drafts]
  );

  useEffect(() => {
    onPlannedTotalChange?.(totalPlanned);
  }, [totalPlanned, onPlannedTotalChange]);

  async function saveAll() {
    setSaving(true);
    try {
      const items = rows.map((r) => ({
        category_id: r.category_id,
        planned_amount: Number(drafts[r.category_id]) || 0,
      }));
      const res = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month, items }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to save budget.", "error");
        return;
      }
      toast("Budget saved.", "success");
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  const byKind = KIND_ORDER.map((k) => ({
    kind: k,
    rows: rows.filter((r) => r.kind === k),
  })).filter((g) => g.rows.length > 0);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Planned budget
        </h2>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </button>
      </div>

      {byKind.map((group) => {
        const groupTotal = group.rows.reduce(
          (s, r) => s + (Number(drafts[r.category_id]) || 0),
          0
        );
        return (
          <div key={group.kind} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-300/80">
                {KIND_LABELS[group.kind]}
              </h3>
              <span className="text-xs text-slate-500">
                {formatINR(groupTotal)}
              </span>
            </div>
            {group.rows.map((r) => (
              <CategoryRow
                key={r.category_id}
                row={r}
                draft={drafts[r.category_id] ?? ""}
                onDraft={(value) =>
                  setDrafts((d) => ({ ...d, [r.category_id]: value }))
                }
                onReload={onReload}
              />
            ))}
          </div>
        );
      })}

      <AddCategory onReload={onReload} />
    </section>
  );
}
