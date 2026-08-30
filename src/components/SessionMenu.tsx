import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, LogOut } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMidnightWallet } from "@/context/MidnightProvider";

const ROLE_LABEL: Record<string, string> = {
  patient: "Patient",
  clinician: "Doctor",
  admin: "Administrator",
};

export function SessionMenu() {
  const { wallet, journey, disconnectWallet } = useMidnightWallet();
  const navigate = useNavigate();

  function signOut() {
    // Journey progress stays saved under this Recovery ID — signing back in
    // with the same phrase (or on this device) brings it all back.
    disconnectWallet();
    navigate({ to: "/", replace: true });
  }

  if (!wallet) {
    return (
      <Link
        to="/"
        className="rounded-xl border border-primary/40 px-3.5 py-2 text-sm font-semibold text-primary"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {wallet.phrase ? <RecoveryPhraseDialog phrase={wallet.phrase} /> : null}
      <span className="hidden rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:inline-block">
        {ROLE_LABEL[journey.role ?? ""] ?? "Signed in"}
      </span>
      <button
        onClick={signOut}
        className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/15"
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </div>
  );
}

/** Lets the patient re-view their 12-word phrase after signing in. */
function RecoveryPhraseDialog({ phrase }: { phrase: string }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Show recovery phrase"
          className="flex items-center gap-1.5 rounded-xl border border-primary/40 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          <KeyRound className="size-4" />
          <span className="hidden sm:inline">Recovery phrase</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-lg font-bold">Your recovery phrase</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These 12 words restore your Recovery ID on any device. Keep them private.
            </p>
          </div>
          <div className="relative rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="grid grid-cols-3 gap-1">
              {phrase.split(" ").map((word, i) => (
                <span
                  key={`${word}-${i}`}
                  className={`flex items-center gap-1.5 rounded-lg bg-background/80 px-2 py-1.5 text-xs ${
                    revealed ? "" : "select-none blur-[5px]"
                  }`}
                >
                  <span className="w-4 text-right text-[10px] font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="font-mono text-sm font-medium">{word}</span>
                </span>
              ))}
            </div>
            {!revealed && (
              <button
                onClick={() => setRevealed(true)}
                className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/30 text-sm font-semibold text-foreground backdrop-blur-[1px] transition hover:bg-background/20"
              >
                Tap to reveal
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {copied ? "Copied ✓" : "Copy phrase"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border px-3 py-2 text-sm font-medium"
            >
              Done
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            This phrase stays on this device. ZeroMotion never sees it and cannot recover it for
            you.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

