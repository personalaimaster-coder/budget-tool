"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthLabel, nextMonthKey, prevMonthKey } from "@/lib/month";

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-2 py-2">
      <button
        onClick={() => onChange(prevMonthKey(month))}
        className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="font-semibold">{formatMonthLabel(month)}</span>
      <button
        onClick={() => onChange(nextMonthKey(month))}
        className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
