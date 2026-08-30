import { createFileRoute } from "@tanstack/react-router";
import { Check, Flame, Lock, Timer, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useMidnightWallet } from "@/context/MidnightProvider";
import { shortHash } from "@/lib/midnightService";
import { ACTIVE_PLAN } from "@/lib/mockData";

export const Route = createFileRoute("/active-plan")({
  head: () => ({
    meta: [
      { title: "Active Recovery Plan — ZeroMotion" },
      {
        name: "description",
        content:
          "Your daily recovery routine, progress rings and streaks — unlocked once your doctor approves.",
      },
      { property: "og:title", content: "Active Recovery Plan — ZeroMotion" },
      {
        property: "og:description",
        content: "Step 4: interactive exercise blocks unlocked by an on-chain milestone signature.",
      },
    ],
  }),
  component: ActivePlanPage,
});

function Ring({ value, label, tone }: { value: number; label: string; tone: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 88 88" className="size-24">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
          transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
        <text x="44" y="49" textAnchor="middle" fill="currentColor" fontSize="16" fontFamily="monospace">
          {value}%
        </text>
      </svg>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ActivePlanPage() {
  const { journey, toggleExercise, unlockedSteps } = useMidnightWallet();
  const unlocked = unlockedSteps["active-plan"];

  const all = ACTIVE_PLAN.flatMap((b) => b.exercises);
  const done = all.filter(
    (e) => e.completed || journey.completedExercises.includes(e.name),
  ).length;
  const completion = Math.round((done / all.length) * 100);

  return (
    <AppShell
      title="Active Recovery Plan"
      subtitle="Step 4 · your daily routine, unlocked by your doctor"
    >
      <div className="relative">
        {!unlocked ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl border border-warning/25 bg-background/70 p-6 backdrop-blur-xl">
            <div className="max-w-sm text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-warning/15 text-warning animate-hud-pulse">
                <Lock className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">Waiting for your doctor</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your plan unlocks as soon as your doctor approves your latest verified results.
              </p>

            </div>
          </div>
        ) : null}

        <div className={`space-y-4 ${unlocked ? "" : "pointer-events-none select-none opacity-60"}`}>
          <div className="glass grid grid-cols-3 gap-2 rounded-3xl p-5 text-foreground">
            <Ring value={completion} label="Today's plan" tone="var(--color-primary)" />
            <Ring value={journey.koosScore ?? 48} label="KOOS index" tone="var(--color-zk)" />
            <Ring value={72} label="Range of motion" tone="var(--color-warning)" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {([
              [Flame, "Streak", "12 days"],
              [Timer, "Weekly load", "142 min"],
              [TrendingUp, "Phase", "II · strength"],
            ] as const).map(([I, label, value]) => {
              return (
                <div key={String(label)} className="glass flex items-center gap-3 rounded-2xl p-4">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <I className="size-4" />
                  </span>
                  <div>
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold">{value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {ACTIVE_PLAN.map((block) => (
            <div key={block.day} className="glass rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{block.day}</p>
                <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-[10px] text-muted-foreground">
                  {block.block}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {block.exercises.map((ex) => {
                  const complete = ex.completed || journey.completedExercises.includes(ex.name);
                  return (
                    <button
                      key={ex.name}
                      onClick={() => toggleExercise(ex.name)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        complete
                          ? "border-zk/30 bg-zk/10"
                          : "border-border/60 bg-background/40 hover:border-primary/30"
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                          complete ? "border-zk/50 bg-zk/20 text-zk" : "border-border"
                        }`}
                      >
                        {complete ? <Check className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">{ex.name}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {ex.focus} · tempo {ex.tempo}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-primary">{ex.sets}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {journey.clinicianTxHash ? (
            <p className="glass rounded-2xl p-4 font-mono text-[10px] text-zk">
              released by clinician signature · {shortHash(journey.clinicianTxHash, 10)}
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
