"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyPlus, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { IncomeSection } from "@/components/IncomeSection";
import { BudgetEditor } from "@/components/BudgetEditor";
import { MonthReport } from "@/components/MonthReport";
import { toast } from "@/components/Toaster";
import { currentMonthKey, formatMonthLabel, prevMonthKey } from "@/lib/month";
import { formatINR } from "@/lib/categories";
import type { StatusRow } from "@/lib/types";

function BudgetPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrying, setCarrying] = useState(false);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [plannedTotal, setPlannedTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets?month=${month}`);
      const data = await res.json();
      if (res.ok) setRows(data.categories ?? []);
      else toast(data.error || "Failed to load budget.", "error");
    } catch {
      toast("Failed to load budget.", "error");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function carryForward() {
    const from = prevMonthKey(month);
    setCarrying(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "carry_forward",
          fromMonth: from,
          toMonth: month,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Nothing to carry forward.", "error");
        return;
      }
      toast(`Copied ${formatMonthLabel(from)}'s budget. Adjust and save.`, "success");
      await load();
    } finally {
      setCarrying(false);
    }
  }

  const leftover = incomeTotal - plannedTotal;

  return (
    <div className="space-y-6">
      <MonthSwitcher month={month} onChange={setMonth} />

      <button
        onClick={carryForward}
        disabled={carrying}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
      >
        {carrying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CopyPlus className="h-4 w-4" />
        )}
        Carry forward {formatMonthLabel(prevMonthKey(month))}&apos;s budget
      </button>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-500">Income</p>
          <p className="mt-1 text-sm font-semibold text-emerald-400">
            {formatINR(incomeTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-500">Planned</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            {formatINR(plannedTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-xs text-slate-500">Leftover</p>
          <p
            className={`mt-1 text-sm font-semibold ${
              leftover < 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {formatINR(leftover)}
          </p>
        </div>
      </div>

      <IncomeSection month={month} onTotalChange={setIncomeTotal} />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <BudgetEditor
          month={month}
          rows={rows}
          onReload={load}
          onPlannedTotalChange={setPlannedTotal}
        />
      )}

      <div className="border-t border-slate-800 pt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          AI month report
        </h2>
        <MonthReport month={month} />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell title="Budget">
      <BudgetPage />
    </AppShell>
  );
}
