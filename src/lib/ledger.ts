/**
 * Demo milestone ledger — the "Midnight ledger" stand-in that makes proof
 * commitments visible across windows and devices.
 *
 * Privacy model: only sterile commitments are published (proof IDs, circuit
 * names, opaque hashes). No raw answers, no sensor logs, no identity — the
 * same data the real ZK circuit would emit.
 *
 * Transport: ntfy.sh (public pub/sub with a 12h message cache). The clinician
 * dashboard subscribes via SSE; patients publish on proof submission.
 */

export const LEDGER_TOPIC = "zeromotion-demo-ku94md";

export type LedgerMilestone = {
  type: "milestone";
  /** Shielded Recovery ID address (the anonymous patient identifier). */
  patientHash: string;
  kind: "questionnaire" | "movement";
  circuit: string;
  proofId: string;
  txHash: string;
  /** Sterile commitment hash — the only thing that crossed the wire. */
  commitment: string;
  timestamp: number;
};

export type LedgerApproval = {
  type: "approval";
  patientHash: string;
  txHash: string;
  timestamp: number;
};

export type LedgerEvent = LedgerMilestone | LedgerApproval;

const NTFY = "https://ntfy.sh";

export async function publishLedgerEvent(event: LedgerEvent): Promise<boolean> {
  try {
    const res = await fetch(`https://ntfy.sh/${LEDGER_TOPIC}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
    return res.ok;
  } catch {
    return false; // ledger unreachable — the on-device proof is still valid
  }
}

type NtfyMessage = { event: string; message: string };

/**
 * Subscribe to the shared ledger. Replays the last 12h of milestones, then
 * streams live events. Returns an unsubscribe function.
 */
export function subscribeLedger(
  onEvent: (event: LedgerEvent) => void,
  onStatus?: (connected: boolean) => void,
): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") return () => {};
  const es = new EventSource(`https://ntfy.sh/${LEDGER_TOPIC}/sse?since=12h`);
  es.onopen = () => onStatus?.(true);
  es.onerror = () => onStatus?.(false);
  es.onmessage = (ev) => {
    try {
      const outer = JSON.parse(ev.data) as { event: string; message: string };
      if (outer.event !== "message") return;
      const inner = JSON.parse(outer.message) as LedgerEvent;
      if (inner.type === "milestone" || inner.type === "approval") onEvent(inner);
    } catch {
      /* ignore malformed frames */
    }
  };
  return () => es.close();
}

/** Keep only the newest event per (patient, kind). */
export function reduceLedger(events: LedgerEvent[]): {
  milestones: Record<string, LedgerMilestone>;
  approvals: Record<string, LedgerApproval>;
} {
  const milestones: Record<string, LedgerMilestone> = {};
  const approvals: Record<string, LedgerApproval> = {};
  for (const ev of events) {
    if (ev.type === "milestone") {
      const key = `${ev.patientHash}:${ev.kind}`;
      const prev = milestones[key];
      if (!prev || ev.timestamp > prev.timestamp) milestones[key] = ev;
    } else {
      const prev = approvals[ev.patientHash];
      if (!prev || ev.timestamp > prev.timestamp) approvals[ev.patientHash] = ev;
    }
  }
  return { milestones, approvals };
}
