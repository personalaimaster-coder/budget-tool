"use client";

import { useEffect, useState } from "react";
import { Lock, Loader2 } from "lucide-react";

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">(
    "checking"
  );
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setStatus(d.authed ? "unlocked" : "locked"))
      .catch(() => setStatus("locked"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (res.ok && data.authed) {
        setStatus("unlocked");
      } else {
        setError(data.error || "Incorrect passcode");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6">
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"
        >
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 rounded-full bg-indigo-500/15 p-3">
              <Lock className="h-7 w-7 text-indigo-400" />
            </div>
            <h1 className="text-xl font-semibold">Family Budget</h1>
            <p className="mt-1 text-sm text-slate-400">
              Enter the shared passcode to continue.
            </p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-indigo-500"
          />
          {error && (
            <p className="mt-3 text-center text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !passcode}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
