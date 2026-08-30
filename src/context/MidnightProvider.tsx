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

const STORAGE_KEY = "zm-zk-rehabcare:v1";

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
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { journey?: JourneyState; wallet?: MidnightIdentity };
        if (parsed.journey) setJourney({ ...EMPTY, ...parsed.journey });
        if (parsed.wallet) setWallet(parsed.wallet);
      }
    } catch {
      /* local store unavailable — journey stays in memory only */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ journey, wallet }));
    } catch {
      /* quota or private mode — non-fatal */
    }
  }, [journey, wallet, hydrated]);

  const connectWallet = useCallback(async (passphrase?: string) => {
    setConnecting(true);
    try {
      const address = await MidnightService.connectIdentity(passphrase);
      setWallet({
        address,
        sigil: `sigil:${address.slice(16, 22)}…${address.slice(-4)}`,
        balance: { night: 1284.5502, dust: 42.118 },
        shielded: true,
      });
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
      return receipt;
    },
    [],
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
