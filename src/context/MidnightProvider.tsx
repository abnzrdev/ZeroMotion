import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from "react";

import {
  MidnightService,
  PROOF_STAGES,
  type MidnightIdentity,
  type ProofReceipt,
} from "@/lib/midnightService";
import { publishLedgerEvent, subscribeLedger } from "@/lib/ledger";

export type Role = "patient" | "clinician" | "administrator";

export type JourneyStep = "questionnaire" | "capture" | "review" | "active-plan";

export type JourneyState = {
  role: Role | null;
  koosAnswers: Record<string, number>;
  koosScore: number | null;
  questionnaireProof: ProofReceipt | null;
  sensorHash: string | null;
  captureProof: ProofReceipt | null;
  clinicianTxHash: string | null;
  completedExercises: string[];
};

const STORAGE_KEY = "zm-zk-rehabcare:v2";

const EMPTY: JourneyState = {
  role: null,
  koosAnswers: {},
  koosScore: null,
  questionnaireProof: null,
  sensorHash: null,
  captureProof: null,
  clinicianTxHash: null,
  completedExercises: [],
};

/**
 * Journey state is stored PER Recovery ID (keyed by the phrase-derived
 * address), so a patient can sign out, restore their phrase on any device,
 * and get their full progress back.
 */
type AccountEntry = { journey: JourneyState; wallet?: MidnightIdentity };
type Persisted = { accounts: Record<string, AccountEntry>; last?: string };

function readStore(): Persisted {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* local store unavailable */
  }
  return { accounts: {} };
}

function writeStore(next: Persisted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota or private mode — non-fatal */
  }
}

type ProofRun = {
  active: boolean;
  stage: number;
  title: string;
  receipt: ProofReceipt | null;
};

type MidnightContextValue = {
  hydrated: boolean;
  wallet: MidnightIdentity | null;
  connecting: boolean;
  journey: JourneyState;
  proofRun: ProofRun;
  stages: typeof PROOF_STAGES;
  connectWallet: (passphrase?: string) => Promise<void>;
  disconnectWallet: () => void;
  setRole: (role: Role) => void;
  patch: (next: Partial<JourneyState>) => void;
  runProof: (
    title: string,
    circuit: string,
    proof: () => Promise<{ proofId: string; verified: boolean }>,
  ) => Promise<ProofReceipt>;
  dismissProof: () => void;
  toggleExercise: (name: string) => void;
  resetJourney: () => void;
  unlockedSteps: Record<JourneyStep, boolean>;
};

// Keep a single context instance even if this module is evaluated twice
// (dev HMR / route code-splitting can create duplicate module instances).
const GLOBAL_KEY = "__zm_midnight_context__";
const globalStore = globalThis as typeof globalThis & {
  [GLOBAL_KEY]?: Context<MidnightContextValue | null>;
};

const MidnightContext =
  globalStore[GLOBAL_KEY] ??
  (globalStore[GLOBAL_KEY] = createContext<MidnightContextValue | null>(null));

export function MidnightProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [wallet, setWallet] = useState<MidnightIdentity | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [journey, setJourney] = useState<JourneyState>(EMPTY);
  const [proofRun, setProofRun] = useState<ProofRun>({
    active: false,
    stage: 0,
    title: "",
    receipt: null,
  });

  useEffect(() => {
    const store = readStore();
    const entry = store.last ? store.accounts[store.last] : undefined;
    if (entry) {
      setJourney({ ...EMPTY, ...entry.journey });
      if (entry.wallet) setWallet(entry.wallet);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!wallet) return;
    const store = readStore();
    store.accounts[wallet.address] = { journey, wallet };
    store.last = wallet.address;
    writeStore(store);
  }, [journey, wallet, hydrated]);

  const connectWallet = useCallback(async (passphrase?: string) => {
    setConnecting(true);
    try {
      const address = await MidnightService.connectIdentity(passphrase);
      const identity: MidnightIdentity = {
        address,
        sigil: `sigil:${address.slice(16, 22)}…${address.slice(-4)}`,
        balance: { night: 1284.5502, dust: 42.118 },
        shielded: true,
        ...(passphrase ? { phrase: passphrase } : {}),
      };
      // Restoring an existing Recovery ID? Bring its journey back.
      const existing = readStore().accounts[address];
      setJourney(existing ? { ...EMPTY, ...existing.journey } : { ...EMPTY });
      setWallet(identity);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => setWallet(null), []);

  const patch = useCallback((next: Partial<JourneyState>) => {
    setJourney((prev) => ({ ...prev, ...next }));
  }, []);

  const setRole = useCallback((role: Role) => patch({ role }), [patch]);

  const runProof = useCallback<MidnightContextValue["runProof"]>(
    async (title, circuit, proof) => {
      setProofRun({ active: true, stage: 0, title, receipt: null });
      await new Promise((r) => setTimeout(r, 850));
      setProofRun((p) => ({ ...p, stage: 1 }));
      const result = await proof();
      setProofRun((p) => ({ ...p, stage: 2 }));
      const receipt = await MidnightService.submitMilestone(circuit, result);
      setProofRun({ active: true, stage: 3, title, receipt });
      // Publish the sterile commitment to the shared ledger so the clinician
      // dashboard sees the verified milestone. No raw data — proof IDs only.
      if (wallet && result.verified) {
        void publishLedgerEvent({
          type: "milestone",
          patientHash: wallet.address,
          kind: circuit.startsWith("movement") ? "movement" : "questionnaire",
          circuit,
          proofId: result.proofId,
          txHash: receipt.txHash,
          commitment: receipt.proofId,
          timestamp: receipt.timestamp,
        });
      }
      return receipt;
    },
    [wallet],
  );

  const dismissProof = useCallback(
    () => setProofRun({ active: false, stage: 0, title: "", receipt: null }),
    [],
  );

  const toggleExercise = useCallback((name: string) => {
    setJourney((prev) => ({
      ...prev,
      completedExercises: prev.completedExercises.includes(name)
        ? prev.completedExercises.filter((n) => n !== name)
        : [...prev.completedExercises, name],
    }));
  }, []);

  const resetJourney = useCallback(() => setJourney(EMPTY), []);

  // Listen for the clinician's milestone release on the shared ledger —
  // when the doctor approves this Recovery ID, the plan unlocks live here.
  useEffect(() => {
    if (!wallet) return;
    const address = wallet.address;
    return subscribeLedger((event) => {
      if (event.type === "approval" && event.patientHash === address) {
        patch({ clinicianTxHash: event.txHash });
      }
    });
  }, [wallet, patch]);

  const unlockedSteps = useMemo<Record<JourneyStep, boolean>>(
    () => ({
      questionnaire: Boolean(wallet),
      capture: Boolean(journey.questionnaireProof),
      review: Boolean(journey.captureProof),
      "active-plan": Boolean(journey.clinicianTxHash),
    }),
    [wallet, journey],
  );

  const value = useMemo<MidnightContextValue>(
    () => ({
      hydrated,
      wallet,
      connecting,
      journey,
      proofRun,
      stages: PROOF_STAGES,
      connectWallet,
      disconnectWallet,
      setRole,
      patch,
      runProof,
      dismissProof,
      toggleExercise,
      resetJourney,
      unlockedSteps,
    }),
    [
      hydrated,
      wallet,
      connecting,
      journey,
      proofRun,
      connectWallet,
      disconnectWallet,
      setRole,
      patch,
      runProof,
      dismissProof,
      toggleExercise,
      resetJourney,
      unlockedSteps,
    ],
  );

  return <MidnightContext.Provider value={value}>{children}</MidnightContext.Provider>;
}

export function useMidnightWallet() {
  const ctx = useContext(MidnightContext);
  if (!ctx) throw new Error("useMidnightWallet must be used inside <MidnightProvider>");
  return ctx;
}
