"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { AppShell, useSpenderCtx } from "@/components/AppShell";
import { VoiceRecorder, type ParsedExpense } from "@/components/VoiceRecorder";
import { ConfirmModal } from "@/components/ConfirmModal";
import { toast } from "@/components/Toaster";
import { formatINR } from "@/lib/categories";

type StatusRow = {
  category: string;
  kind: string;
  priority: string;
  planned: number;
  spent: number;
  percentage_used: number;
};

function Warnings({ rows }: { rows: StatusRow[] }) {
  // Only expense kinds can be "over budget".
  const expenseRows = rows.filter(
    (r) => r.kind === "fixed" || r.kind === "variable"
  );
  const hasAnyBudget = expenseRows.some((r) => Number(r.planned) > 0);
  const flagged = expenseRows
    .filter((r) => Number(r.planned) > 0 && Number(r.percentage_used) > 80)
    .sort((a, b) => Number(b.percentage_used) - Number(a.percentage_used));

  if (!hasAnyBudget) {
    return (
      <Link
        href="/budget"
        className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-300 hover:border-indigo-500/50"
      >
        <Wallet className="h-5 w-5 text-indigo-400" />
        Set up your monthly budget to get warnings here.
      </Link>
    );
  }

  if (flagged.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        <CheckCircle2 className="h-5 w-5" />
        You&apos;re within budget across all categories this month.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {flagged.map((r) => {
        const pct = Number(r.percentage_used);
        const over = pct > 100;
        return (
          <div
            key={r.category}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              over
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">
                {over ? "Over budget" : "Almost there"}: {r.category} ({pct}%)
              </p>
              <p className="opacity-80">
                {formatINR(Number(r.spent))} of {formatINR(Number(r.planned))}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogPage() {
  const { spender } = useSpenderCtx();
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/budget-status");
      const data = await res.json();
      if (res.ok) setRows(data.budgets ?? []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadStatus();
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.categories)) {
          setCategories(
            d.categories.map((c: { name: string }) => c.name as string)
          );
        }
      })
      .catch(() => {});
  }, [loadStatus]);

  const handleSaved = useCallback(
    async (category: string) => {
      setParsed(null);
      await loadStatus();
      try {
        const res = await fetch("/api/budget-status");
        const data = await res.json();
        if (res.ok) {
          const hit = (data.budgets as StatusRow[]).find(
            (b) => b.category === category
          );
          if (hit && Number(hit.planned) > 0) {
            const pct = Number(hit.percentage_used);
            if (pct > 100) {
              toast(
                `Warning: You have exceeded your ${category} budget!`,
                "error"
              );
            } else if (pct > 80) {
              toast(`Heads up: ${category} is at ${pct}% of budget.`, "warning");
            }
          }
        }
      } catch {
        // non-critical
      }
    },
    [loadStatus]
  );

  return (
    <>
      <div className="mb-8 flex justify-center">
        <VoiceRecorder onParsed={setParsed} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Budget alerts
        </h2>
        <Warnings rows={rows} />
      </section>

      {parsed && spender && (
        <ConfirmModal
          parsed={parsed}
          spender={spender}
          categories={categories}
          onSaved={(category) => handleSaved(category)}
          onCancel={() => setParsed(null)}
        />
      )}
    </>
  );
}

export default function Page() {
  return (
    <AppShell title="Log Expense">
      <LogPage />
    </AppShell>
  );
}
