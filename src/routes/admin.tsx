import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Activity, EyeOff, Gauge, LogOut, Server, ShieldCheck, Timer } from "lucide-react";

import { useMidnightWallet } from "@/context/MidnightProvider";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "System Console — ZeroMotion" },
      {
        name: "description",
        content:
          "Administrator console showing verification throughput, success rate and system health. No patient identity or clinical data is exposed.",
      },
      { property: "og:title", content: "System Console — ZeroMotion" },
      {
        property: "og:description",
        content: "Infrastructure metrics only — administrators never see patient data.",
      },
    ],
  }),
  component: AdminPage,
});

const METRICS = [
  { label: "Verifications (24h)", value: "1,284", icon: ShieldCheck, tone: "text-zk" },
  { label: "Avg verification time", value: "2.4s", icon: Timer, tone: "text-primary" },
  { label: "Verification rate", value: "99.7%", icon: Gauge, tone: "text-accent" },
  { label: "System uptime", value: "100%", icon: Server, tone: "text-primary" },
];

const THROUGHPUT = [42, 55, 38, 71, 64, 88, 76, 95, 82, 104, 96, 118];



function AdminPage() {
  const { disconnectWallet, resetJourney } = useMidnightWallet();
  const navigate = useNavigate();

  function signOut() {
    disconnectWallet();
    resetJourney();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="hero-bg min-h-screen">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Activity className="size-4" />
        </span>
        <span className="text-sm font-bold tracking-tight">ZeroMotion · System Console</span>
        <button
          onClick={signOut}
          className="ml-auto flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/20"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </header>

      <main className="w-full space-y-5 px-4 py-6 lg:px-8 xl:px-10">
        <div className="animate-rise">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Administrator console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            System health and verification throughput.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <EyeOff className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <p className="text-xs font-medium leading-relaxed text-foreground">
            Patient identities, KOOS scores and clinical records are outside the administrator
            scope. This role can only read aggregate system metrics.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="glass animate-rise rounded-3xl p-5">
                <Icon className={`size-4 ${m.tone}`} />
                <p className="mt-3 font-mono text-2xl font-semibold">{m.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{m.label}</p>
              </div>
            );
          })}
        </div>

        <div className="glass hud-grid rounded-3xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Verifications · last 12 hours
          </p>
          <div className="mt-5 flex h-40 items-end gap-2">
            {THROUGHPUT.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg bg-primary/80"
                style={{ height: `${(v / 120) * 100}%` }}
                title={`${v} verifications`}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Circuit version", "koos_milestone_v3"],
            ["Active clinician nodes", "6"],
            ["Failed verifications (24h)", "4"],
            ["Stored centrally", "verification records only"],
          ].map(([k, v]) => (
            <div key={k} className="glass rounded-2xl px-4 py-3.5">
              <p className="text-[11px] text-muted-foreground">{k}</p>
              <p className="mt-1 font-mono text-sm font-medium">{v}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
