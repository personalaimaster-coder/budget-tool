"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/components/Toaster";

export function MonthReport({ month }: { month: string }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/analyze-budget", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to generate report.", "error");
        return;
      }
      setReport(data.report);
    } catch {
      toast("Something went wrong generating the report.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <button
        onClick={generate}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 font-medium text-indigo-200 transition hover:bg-indigo-500/20 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Sparkles className="h-5 w-5" />
        )}
        {loading ? "Analyzing…" : "Generate Month Report"}
      </button>

      {report && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-100 prose-strong:text-slate-100 prose-li:marker:text-indigo-400">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>
      )}
    </section>
  );
}
