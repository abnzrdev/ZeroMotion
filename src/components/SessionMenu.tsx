import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { useMidnightWallet } from "@/context/MidnightProvider";

const ROLE_LABEL: Record<string, string> = {
  patient: "Patient",
  clinician: "Doctor",
  admin: "Administrator",
};

export function SessionMenu() {
  const { wallet, journey, disconnectWallet, resetJourney } = useMidnightWallet();
  const navigate = useNavigate();

  function signOut() {
    disconnectWallet();
    resetJourney();
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
