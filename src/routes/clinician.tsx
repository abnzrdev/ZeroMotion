import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Cpu, Loader2, Radio, Signature } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell, LockedGate } from "@/components/AppShell";
import { useMidnightWallet } from "@/context/MidnightProvider";
import {
  publishLedgerEvent,
  reduceLedger,
  subscribeLedger,
  type LedgerEvent,
  type LedgerMilestone,
} from "@/lib/ledger";
import { MidnightService, shortHash } from "@/lib/midnightService";
import { CLINIC_LEDGER } from "@/lib/mockData";
import { PATIENT_BRIEFINGS } from "@/lib/clinicalMinimization";

export const Route = createFileRoute("/clinician")({
  head: () => ({
    meta: [
      { title: "Clinician Review — ZeroMotion" },
      {
        name: "description",
        content:
          "Review verified rehabilitation progress for your patients and release the next recovery phase.",
      },
      { property: "og:title", content: "Clinician Review — ZeroMotion" },
      {
        property: "og:description",
        content: "Approve verified rehabilitation milestones and unlock the next phase.",
      },
    ],
  }),
  component: ClinicianPage,
});

function ClinicianPage() {
  const navigate = useNavigate();
  const { journey, patch, wallet } = useMidnightWallet();
  const [signing, setSigning] = useState<string | null>(null);
  const [approved, setApproved] = useState<Record<string, string>>({});
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([]);
  const [ledgerLive, setLedgerLive] = useState(false);

  // Live feed of sterile proof commitments from every patient device.
  useEffect(() => subscribeLedger((ev) => setLedgerEvents((prev) => [...prev, ev]), setLedgerLive), []);

  const { milestones, approvals } = useMemo(() => reduceLedger(ledgerEvents), [ledgerEvents]);

  // Group the latest milestone per patient.
  const ledgerRows = useMemo(() => {
    const byPatient = new Map<string, { q?: LedgerMilestone; m?: LedgerMilestone }>();
    for (const m of Object.values(milestones)) {
      const g = byPatient.get(m.patientHash) ?? {};
      if (m.kind === "questionnaire") g.q = m;
      else g.m = m;
      byPatient.set(m.patientHash, g);
    }
    return [...byPatient.entries()]
      .sort((a, b) => {
        const ta = Math.max(a[1].q?.timestamp ?? 0, a[1].m?.timestamp ?? 0);
        const tb = Math.max(b[1].q?.timestamp ?? 0, b[1].m?.timestamp ?? 0);
        return tb - ta;
      })
      .map(([addr, ms]) => {
        return {
          name:
            addr === wallet?.address
              ? "Your record (this device)"
              : `Patient ${shortHash(addr, 8)}`,
          sigil: shortHash(addr, 6),
          hash: ms.q?.commitment ?? ms.m?.commitment ?? "0x—",
          cohort: addr === wallet?.address ? "This device" : "Shielded ledger",
          phase: "Phase II",
          koosClaim: ms.q ? "Verified: KOOS ≤ 100" : "Awaiting verification",
          emgClaim: ms.m ? "Verified: EMG Session Complete" : "Awaiting verification",
          adherence: 88,
          lastProof: "live",
          status: (approvals[addr] ? "approved" : "pending") as "approved" | "pending",
          address: addr,
        };
      });
  }, [milestones, approvals, wallet]);

  const selfRow = wallet
    ? {
        name: "Your record",
        sigil: wallet.sigil,
        hash: journey.sensorHash ?? "0x—",
        cohort: "This device",
        phase: "Phase II",
        koosClaim: journey.questionnaireProof ? "Verified: KOOS ≤ 100" : "Awaiting verification",
        emgClaim: journey.captureProof ? "Verified: EMG Session Complete" : "Awaiting verification",
        adherence: 88,
        lastProof: "just now",
        status: (journey.clinicianTxHash ? "approved" : "pending") as "approved" | "pending",
        address: wallet.address,
      }
    : null;

  const rows = [...(selfRow ? [selfRow] : []), ...ledgerRows, ...CLINIC_LEDGER];

  const approve = async (id: string, isSelf: boolean, patientHash?: string) => {
    setSigning(id);
    const tx = await MidnightService.clinicianApproveMilestone(patientHash ?? id);
    setApproved((a) => ({ ...a, [id]: tx }));
    if (isSelf) patch({ clinicianTxHash: tx });
    // Publish the release to the shared ledger — the patient's device unlocks
    // their next recovery phase the moment this transaction lands.
    if (patientHash) {
      void publishLedgerEvent({
        type: "approval",
        patientHash,
        txHash: tx,
        timestamp: Date.now(),
      });
    }
    setSigning(null);
  };

  if (journey.role === "administrator") {
    return (
      <AppShell title="Clinician Review" subtitle="Restricted to clinical staff">
        <LockedGate
          message="Administrators can't see patient identities or clinical records. Open the system console for infrastructure metrics."
          backTo="/admin"
          backLabel="Go to system console"
        />
      </AppShell>
    );
  }

  if (journey.role === "patient") {
    return (
      <AppShell title="Clinician Review" subtitle="Clinical staff only">
        <LockedGate
          message="This queue belongs to your care team. Your verified progress is sent here automatically — message your doctor if you have a question."
          backTo="/messages"
          backLabel="Open messages"
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Clinician Review" subtitle="Verified patient progress">
      <div className="space-y-4">
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-semibold ${
            ledgerLive
              ? "border-zk/30 bg-zk/10 text-zk"
              : "border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          <Radio className={`size-4 ${ledgerLive ? "animate-pulse" : ""}`} />
          {ledgerLive
            ? "Shielded ledger connected — new verified milestones appear here instantly"
            : "Connecting to shielded ledger…"}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Pending", rows.filter((r) => r.status === "pending").length, "text-warning"],
            ["Verified today", 18, "text-zk"],
            ["Patients", rows.length, "text-primary"],
          ].map(([label, value, tone]) => (
            <div key={String(label)} className="glass rounded-2xl p-4">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className={`mt-1 font-mono text-2xl ${tone}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {rows.map((row, i) => {
            const id = `${row.sigil}-${i}`;
            const patientAddr = "address" in row ? (row.address as string | undefined) : undefined;
            const ledgerApproval = patientAddr ? approvals[patientAddr]?.txHash : undefined;
            const tx = approved[id] ?? ledgerApproval ?? (i === 0 ? journey.clinicianTxHash : null);
            const ready =
              row.koosClaim.startsWith("Verified") && row.emgClaim.startsWith("Verified");
            const released = Boolean(tx) || row.status === "approved";
            return (
              <div key={id} className="glass animate-rise rounded-3xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{row.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.cohort} · {row.phase}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] ${
                      released ? "bg-zk/15 text-zk" : "bg-warning/15 text-warning"
                    }`}
                  >
                    {released ? "Released" : "Pending"}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_16rem]">
                  <div className="rounded-2xl bg-surface-2/60 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      <Cpu className="size-3" /> NVIDIA AI briefing
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {PATIENT_BRIEFINGS[row.name] ??
                        "Anonymized metrics received: flexion, extension lag and quadriceps activation are within the safe band set for this phase."}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 ${ready ? "bg-zk/10" : "bg-warning/10"}`}>
                    <p
                      className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                        ready ? "text-zk" : "text-warning"
                      }`}
                    >
                      <BadgeCheck className="size-3.5" />
                      {ready ? "ZK verified" : "Awaiting verification"}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      circuit minimization_v1
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {shortHash(row.hash, 7)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full bg-primary" style={{ width: `${row.adherence}%` }} />
                    </div>
                    {row.adherence}% adherence
                  </div>

                  {tx ? (
                    <span className="ml-auto font-mono text-[10px] text-zk">
                      signed · {shortHash(tx, 8)}
                    </span>
                  ) : (
                    <button
                      disabled={!ready || signing === id}
                      onClick={() =>
                        approve(id, i === 0, "address" in row ? (row.address as string) : undefined)
                      }
                      className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                    >
                      {signing === id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Signature className="size-3.5" />
                      )}
                      Approve &amp; release next phase
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {journey.clinicianTxHash ? (
          <button
            onClick={() => navigate({ to: "/active-plan" })}
            className="w-full rounded-2xl bg-zk px-4 py-3 text-sm font-semibold text-zk-foreground"
          >
            Open active recovery plan
          </button>
        ) : null}
      </div>
    </AppShell>
  );
}
