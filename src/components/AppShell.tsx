import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Camera,
  ClipboardList,
  Dumbbell,
  Lock,
  Menu,
  MessagesSquare,
  Stethoscope,
  Terminal,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { SessionMenu } from "@/components/SessionMenu";
import { useMidnightWallet } from "@/context/MidnightProvider";

const NAV = [
  {
    to: "/questionnaire",
    label: "Knee check-in",
    step: "Step 1",
    icon: ClipboardList,
    gate: "questionnaire",
    roles: ["patient"],
  },
  {
    to: "/capture",
    label: "Movement check",
    step: "Step 2",
    icon: Camera,
    gate: "capture",
    roles: ["patient"],
  },
  {
    to: "/ai-assistant",
    label: "AI assistant",
    step: "Step 3",
    icon: Terminal,
    gate: "capture",
    roles: ["patient"],
  },
  {
    to: "/messages",
    label: "Messages",
    step: "Chat",
    icon: MessagesSquare,
    gate: "questionnaire",
    roles: ["patient", "clinician"],
  },
  {
    to: "/clinician",
    label: "Patient review",
    step: "Doctor",
    icon: Stethoscope,
    gate: "review",
    roles: ["clinician"],
  },
  {
    to: "/active-plan",
    label: "My plan",
    step: "Step 4",
    icon: Dumbbell,
    gate: "active-plan",
    roles: ["patient"],
  },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { unlockedSteps, journey } = useMidnightWallet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = journey.role ?? "patient";

  const nav = (
    <nav className="space-y-1.5">
      {NAV.filter((item) => (item.roles as readonly string[]).includes(role)).map((item) => {
        const unlocked = role === "clinician" ? true : unlockedSteps[item.gate];
        const active = pathname === item.to;
        const Icon = item.icon;
        const className = `flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-base font-medium transition ${
          active
            ? "bg-primary/15 text-primary"
            : unlocked
              ? "text-foreground hover:bg-primary/5"
              : "text-muted-foreground/70"
        }`;
        const inner = (
          <>
            <Icon className="size-5 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {unlocked ? (
              <span className="font-mono text-xs text-muted-foreground">{item.step}</span>
            ) : (
              <Lock className="size-4 text-warning" />
            )}
          </>
        );
        return unlocked ? (
          <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className={className}>
            {inner}
          </Link>
        ) : (
          <div key={item.to} className={`${className} cursor-not-allowed`} aria-disabled>
            {inner}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="hero-bg min-h-screen">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-xl border border-border p-2 text-muted-foreground lg:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Activity className="size-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">ZeroMotion</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <SessionMenu />
        </div>
      </header>

      <div className="flex w-full">
        <aside
          className={`${
            open ? "block" : "hidden"
          } fixed inset-x-4 top-[4.25rem] z-20 rounded-3xl p-4 glass lg:sticky lg:top-[57px] lg:block lg:h-[calc(100vh-57px)] lg:w-80 lg:shrink-0 lg:rounded-none lg:border-r lg:border-border/70 lg:bg-surface-2/60 lg:p-5 lg:backdrop-blur-none`}
        >
          <p className="mb-4 px-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Clinical journey
          </p>
          {nav}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-10 xl:px-12">
          <div className="animate-rise mb-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-1.5 text-base text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

type GateRoute =
  "/" | "/messages" | "/questionnaire" | "/capture" | "/clinician" | "/active-plan" | "/admin";

export function LockedGate({
  message,
  backTo,
  backLabel,
}: {
  message: string;
  backTo: GateRoute;
  backLabel: string;
}) {
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
        <Lock className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Step locked</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Link
        to={backTo}
        className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        {backLabel}
      </Link>
    </div>
  );
}
