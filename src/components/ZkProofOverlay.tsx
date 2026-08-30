import { Check, Cpu, Loader2, ShieldCheck } from "lucide-react";

import { useMidnightWallet } from "@/context/MidnightProvider";
import { shortHash } from "@/lib/midnightService";

export function ZkProofOverlay() {
  const { proofRun, stages, dismissProof } = useMidnightWallet();
  if (!proofRun.active) return null;

  const done = proofRun.stage >= stages.length - 1 && proofRun.receipt;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 p-4 backdrop-blur-xl sm:items-center">
      <div className="glass animate-rise w-full max-w-md rounded-3xl p-6 glow-teal">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            {done ? <ShieldCheck className="size-5" /> : <Cpu className="size-5 animate-hud-pulse" />}
          </span>
          <div>
            <p className="text-sm font-semibold">{proofRun.title}</p>
            <p className="font-mono text-[11px] text-muted-foreground">midnight · client-side prover</p>
          </div>
        </div>

        <div className="my-5 overflow-hidden rounded-2xl border border-border bg-background/60">
          <svg viewBox="0 0 320 90" className="h-24 w-full">
            <defs>
              <linearGradient id="zk-line" x1="0" x2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--color-zk)" />
              </linearGradient>
            </defs>
            {[18, 38, 58, 78].map((y, i) => (
              <path
                key={y}
                d={`M0 ${y} H${60 + i * 24} l14 -14 H${180 + i * 18} l14 14 H320`}
                fill="none"
                stroke="url(#zk-line)"
                strokeWidth="1.4"
                className="animate-circuit"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            ))}
            {[70, 130, 200, 262].map((x, i) => (
              <circle
                key={x}
                cx={x}
                cy={18 + i * 20}
                r="3.4"
                fill="var(--color-zk)"
                className="animate-hud-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </svg>
        </div>

        <ol className="space-y-3">
          {stages.map((stage, index) => {
            const state =
              index < proofRun.stage ? "done" : index === proofRun.stage ? "active" : "idle";
            return (
              <li key={stage.label} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    state === "done"
                      ? "border-zk/50 bg-zk/20 text-zk"
                      : state === "active"
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {state === "done" ? (
                    <Check className="size-3" />
                  ) : state === "active" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                </span>
                <div>
                  <p
                    className={`text-sm ${state === "idle" ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {stage.label}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">{stage.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {done && proofRun.receipt ? (
          <div className="animate-rise mt-5 space-y-3">
            <div className="rounded-2xl border border-zk/30 bg-zk/10 p-4">
              <div className="flex items-center gap-2 text-zk">
                <Check className="size-4" />
                <span className="text-sm font-semibold">Milestone finalized</span>
              </div>
              <dl className="mt-3 space-y-1.5 font-mono text-[11px] text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <dt>circuit</dt>
                  <dd className="text-foreground">{proofRun.receipt.circuit}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>proof</dt>
                  <dd className="text-foreground">{shortHash(proofRun.receipt.proofId, 8)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>tx</dt>
                  <dd className="text-zk">{shortHash(proofRun.receipt.txHash, 8)}</dd>
                </div>
              </dl>
            </div>
            <button
              onClick={dismissProof}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Continue
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
