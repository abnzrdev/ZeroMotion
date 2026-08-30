import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  HeartPulse,
  Loader2,
  Stethoscope,
  User,
} from "lucide-react";
import { useState } from "react";

import { useMidnightWallet, type Role } from "@/context/MidnightProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZeroMotion — Private Knee Recovery" },
      {
        name: "description",
        content:
          "Sign in as patient, doctor or administrator. Knee scoring, motion capture and AI guidance run on your device, with ZK-verified progress.",
      },
      { property: "og:title", content: "ZeroMotion — Private Knee Recovery" },
      {
        property: "og:description",
        content:
          "A privacy-first recovery app: health data stays on your device, only ZK-verified results are shared.",
      },
    ],
  }),
  component: SignInPage,
});

const ROLES: {
  id: Role;
  short: string;
  icon: typeof User;
}[] = [
  { id: "patient", short: "Patient", icon: HeartPulse },
  { id: "clinician", short: "Doctor", icon: Stethoscope },
  { id: "administrator", short: "Admin", icon: BarChart3 },
];

function SignInPage() {
  const navigate = useNavigate();
  const { wallet, connecting, connectWallet, disconnectWallet, journey, setRole } =
    useMidnightWallet();

  const selected = journey.role;

  const go = () => {
    if (!selected) return;
    if (selected === "patient") navigate({ to: "/questionnaire" });
    else if (selected === "administrator") navigate({ to: "/admin" });
    else navigate({ to: "/clinician" });
  };

  return (
    <div className="grid h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/30 lg:grid-cols-12">
      {/* Brand panel — full bleed */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-surface-2 p-10 lg:col-span-5 lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_0%_0%,oklch(0.93_0.105_96/70%)_0%,transparent_50%)]" />
          <div className="absolute bottom-0 right-0 h-full w-full bg-[radial-gradient(circle_at_100%_100%,oklch(0.76_0.14_62/25%)_0%,transparent_50%)]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-12 rotate-3 items-center justify-center rounded-xl bg-primary font-display text-2xl font-bold text-primary-foreground shadow-[0_10px_24px_-12px_oklch(0.5_0.105_152/60%)]">
            Z
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">ZeroMotion</span>
        </div>

        <div className="relative z-10 space-y-6">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary">
            Private knee recovery
          </span>
          <h1 className="font-display text-5xl font-bold leading-[1.08] xl:text-6xl">
            Secure Recovery{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Through Privacy.
            </span>
          </h1>
          <p className="max-w-sm text-lg leading-relaxed text-muted-foreground">
            Pick your role, sign in, and your recovery starts right here. Your data never
            leaves your device — only proof does.
          </p>
        </div>

        <p className="relative z-10 text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
          ZK verified · Data stays on your device
        </p>
      </div>

      {/* Role selection — fits viewport */}
      <div className="flex min-h-0 flex-col items-center justify-center overflow-y-auto p-6 sm:p-10 lg:col-span-7">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex size-9 rotate-3 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
              Z
            </span>
            <span className="font-display text-lg font-bold tracking-tight">ZeroMotion</span>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-3xl font-bold">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Select your identity to continue.
            </p>
          </div>

          <div className="space-y-3">
            {ROLES.map((role) => {
              const active = selected === role.id;
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => setRole(role.id)}
                  className={`group flex w-full items-center rounded-2xl border bg-card/40 p-4 text-left transition-all duration-300 hover:bg-card/70 ${
                    active
                      ? "border-primary/60 shadow-[0_14px_30px_-16px_oklch(0.5_0.105_152/45%)]"
                      : "border-primary/10 hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="size-6" strokeWidth={1.5} />
                  </span>
                  <span className="ml-4 min-w-0 flex-1 font-display text-lg font-bold">
                    {role.short}
                  </span>
                  <ArrowRight
                    className={`ml-3 size-5 shrink-0 transition-colors ${
                      active ? "text-primary" : "text-foreground/20 group-hover:text-primary"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-5 min-h-[88px]">
            {selected === "patient" ? (
              <PatientGate
                wallet={wallet}
                connecting={connecting}
                connectWallet={connectWallet}
                disconnectWallet={disconnectWallet}
                go={go}
              />
            ) : selected ? (
              <StaffGate
                wallet={wallet}
                connecting={connecting}
                connectWallet={connectWallet}
                disconnectWallet={disconnectWallet}
                go={go}
                roleLabel={selected === "administrator" ? "Administrator" : "Doctor"}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Patient ---------------------------------- */

function PatientGate({
  wallet,
  connecting,
  connectWallet,
  disconnectWallet,
  go,
}: {
  wallet: { sigil: string } | null;
  connecting: boolean;
  connectWallet: (passphrase?: string) => Promise<void>;
  disconnectWallet: () => void;
  go: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "returning">("choose");
  const [phrase, setPhrase] = useState("");

  if (wallet) {
    return (
      <div className="animate-rise space-y-3">
        <p className="text-sm text-muted-foreground">
          You're all set — your private Recovery ID is on this device.
        </p>
        <button
          onClick={go}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-base font-bold text-background transition hover:bg-primary"
        >
          Start my recovery <ArrowRight className="size-5" />
        </button>
        <button
          onClick={disconnectWallet}
          className="w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Not you? Start over
        </button>
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <div className="animate-rise space-y-3">
        <button
          disabled={connecting}
          onClick={() => connectWallet(`patient-${Date.now()}`)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-base font-bold text-background transition hover:bg-primary disabled:opacity-60"
        >
          {connecting ? <Loader2 className="size-5 animate-spin" /> : <HeartPulse className="size-5" />}
          I'm new here
        </button>
        <button
          onClick={() => setMode("returning")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border px-6 py-3.5 text-base font-semibold text-foreground transition hover:border-accent"
        >
          <User className="size-5 text-accent" />
          I've used ZeroMotion before
        </button>
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-3">
      <p className="text-sm text-muted-foreground">
        Type the recovery phrase you saved last time.
      </p>
      <textarea
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        rows={2}
        placeholder="e.g. river sunset meadow …"
        className="w-full resize-none rounded-2xl border border-input bg-secondary p-3.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
      <div className="flex gap-3">
        <button
          onClick={() => setMode("choose")}
          className="rounded-2xl border-2 border-border px-5 py-3 text-sm font-semibold text-muted-foreground"
        >
          Back
        </button>
        <button
          disabled={connecting || phrase.trim().length < 4}
          onClick={() => connectWallet(phrase.trim())}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-3 text-base font-bold text-background disabled:opacity-50"
        >
          {connecting ? <Loader2 className="size-5 animate-spin" /> : null}
          Continue
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Doctor / Admin ------------------------------ */

function StaffGate({
  wallet,
  connecting,
  connectWallet,
  disconnectWallet,
  go,
  roleLabel,
}: {
  wallet: { sigil: string } | null;
  connecting: boolean;
  connectWallet: (passphrase?: string) => Promise<void>;
  disconnectWallet: () => void;
  go: () => void;
  roleLabel: string;
}) {
  if (wallet) {
    return (
      <div className="animate-rise space-y-3">
        <button
          onClick={go}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:opacity-90"
        >
          Continue as {roleLabel}
          <ArrowRight className="size-4" />
        </button>
        <button
          onClick={disconnectWallet}
          className="w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Not you? Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={connecting}
      onClick={() => connectWallet()}
      className="animate-rise flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-60"
    >
      {connecting ? <Loader2 className="size-4 animate-spin" /> : null}
      Sign in as {roleLabel}
    </button>
  );
}
