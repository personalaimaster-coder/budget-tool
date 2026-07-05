"use client";

import { SPENDERS, type Spender } from "@/lib/categories";

export function SpenderModal({
  onSelect,
}: {
  onSelect: (s: Spender) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-xl">
        <h2 className="text-xl font-semibold">Who is using this device?</h2>
        <p className="mt-1 text-sm text-slate-400">
          We&apos;ll tag your expenses with this name.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {SPENDERS.map((s) => (
            <button
              key={s}
              onClick={() => onSelect(s)}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-6 transition hover:border-indigo-500 hover:bg-slate-800"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-lg font-bold text-indigo-300">
                {s[0]}
              </span>
              <span className="font-medium">{s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
