"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, Wallet, ReceiptText, UserCog } from "lucide-react";
import { PasscodeGate } from "@/components/PasscodeGate";
import { Toaster } from "@/components/Toaster";
import { SpenderModal } from "@/components/SpenderModal";
import { useSpender } from "@/hooks/useSpender";
import type { Spender } from "@/lib/categories";

type SpenderCtx = {
  spender: Spender | null;
  setSpender: (s: Spender) => void;
  clearSpender: () => void;
};

const Ctx = createContext<SpenderCtx | null>(null);

export function useSpenderCtx(): SpenderCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSpenderCtx must be used inside AppShell");
  return v;
}

const TABS = [
  { href: "/", label: "Log", icon: Mic },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: ReceiptText },
];

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          const active = pathname === t.href;
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                active ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Inner({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { spender, setSpender, clearSpender, ready } = useSpender();
  if (!ready) return null;

  return (
    <Ctx.Provider value={{ spender, setSpender, clearSpender }}>
      <div className="mx-auto min-h-[100dvh] w-full max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {spender && (
              <p className="text-sm text-slate-400">You are {spender}</p>
            )}
          </div>
          {spender && (
            <button
              onClick={clearSpender}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              <UserCog className="h-4 w-4" />
              Switch
            </button>
          )}
        </header>
        {children}
      </div>
      <BottomNav />
      {!spender && <SpenderModal onSelect={setSpender} />}
      <Toaster />
    </Ctx.Provider>
  );
}

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PasscodeGate>
      <Inner title={title}>{children}</Inner>
    </PasscodeGate>
  );
}
