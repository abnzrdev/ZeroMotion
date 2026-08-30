/**
 * MidnightService — client-side stub layer standing in for the compiled
 * Compact smart-contract circuits of the ZeroMotion dApp.
 *
 * Privacy model ("Freedoms of ACE"):
 *  - Raw KOOS answers, EMG/IMU sensor logs and identity NEVER leave the device.
 *  - Only witness-derived commitments + ZK proofs are published to the ledger.
 */

export type ProofStage = {
  label: string;
  detail: string;
};

export const PROOF_STAGES: ProofStage[] = [
  { label: "Reading local clinical metrics...", detail: "witness/local-store" },
  { label: "Compiling zero-knowledge proof...", detail: "compactc → circuit r1cs" },
  { label: "Masking personal identifiers & asset balances...", detail: "shielded tx assembly" },
  { label: "Milestone registered on Midnight Ledger!", detail: "block finalized" },
];

export type ProofReceipt = {
  proofId: string;
  verified: boolean;
  txHash: string;
  circuit: string;
  timestamp: number;
};

export type MidnightIdentity = {
  address: string;
  sigil: string;
  balance: { night: number; dust: number };
  shielded: boolean;
};

const HEX = "0123456789abcdef";

function randomHex(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += HEX[Math.floor(Math.random() * 16)];
  }
  return out;
}

/** Deterministic, synchronous digest used for local sensor-log commitments. */
export function localDigest(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    h1 = (h1 ^ input.charCodeAt(i)) >>> 0;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 + Math.imul(h1 ^ i, 0x85ebca6b)) >>> 0;
  }
  const base = (h1.toString(16) + h2.toString(16)).padStart(16, "0");
  return `0x${base.repeat(4).slice(0, 56)}`;
}

export function shortHash(hash: string, size = 6): string {
  if (hash.length <= size * 2 + 2) return hash;
  return `${hash.slice(0, size + 2)}…${hash.slice(-size)}`;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const MidnightService = {
  /** Creates or restores a local key-pair and returns the shielded address. */
  async connectIdentity(passphrase?: string): Promise<string> {
    await wait(900);
    const seed = passphrase ? localDigest(passphrase).slice(2, 14) : randomHex(12);
    return `mn_shield_addr_${seed}${randomHex(20)}`;
  },

  /** Circuit: prove 0 <= koosScore <= 100 without revealing item-level answers. */
  async proveQuestionnaireCompletion(
    koosScore: number,
  ): Promise<{ proofId: string; verified: boolean }> {
    await wait(1200);
    return {
      proofId: `zkp_koos_${randomHex(24)}`,
      verified: koosScore >= 0 && koosScore <= 100,
    };
  },

  /** Circuit: prove a completed capture session matches the committed sensor hash. */
  async proveMovementSession(sensorHash: string): Promise<{ proofId: string; verified: boolean }> {
    await wait(1200);
    return {
      proofId: `zkp_emg_${randomHex(24)}`,
      verified: sensorHash.startsWith("0x") && sensorHash.length > 20,
    };
  },

  /** Clinician signs the milestone-release transaction on the Midnight ledger. */
  async clinicianApproveMilestone(patientId: string): Promise<string> {
    await wait(1400);
    return `0xmn${localDigest(`approve:${patientId}:${Date.now()}`).slice(2, 58)}`;
  },

  /** Convenience wrapper returning a full ledger receipt for the UI overlay. */
  async submitMilestone(
    circuit: string,
    proof: { proofId: string; verified: boolean },
  ): Promise<ProofReceipt> {
    await wait(700);
    return {
      proofId: proof.proofId,
      verified: proof.verified,
      txHash: `0xmn${randomHex(56)}`,
      circuit,
      timestamp: Date.now(),
    };
  },
};

/* ── Minimization + AI-brief bridge (Compact circuit stubs) ───────────────── */

export const MINIMIZATION_STAGES: ProofStage[] = [
  { label: "Minimizing local records...", detail: "witness → clinical metrics" },
  { label: "Running local Compact assertions...", detail: "assert(metrics ⊂ rawVault)" },
  { label: "Compiling zero-knowledge proof...", detail: "compactc → circuit r1cs" },
  { label: "Signing with Sigil identity...", detail: "shielded tx assembly" },
  { label: "Milestone registered on Midnight ledger!", detail: "block finalized" },
];

export type MinimizationProof = {
  proofId: string;
  verified: boolean;
  circuit: "minimization_v1";
  metricsCommitment: string;
  vaultCommitment: string;
};

/**
 * Circuit `minimization_v1`: proves the anonymized clinical metrics were
 * derived from genuine, unmodified on-device exercise logs — without
 * revealing the logs, the video, or the patient's identity.
 */
export async function generateMinimizationZkp(
  clinicalMetrics: unknown,
  rawVaultFingerprint = "local-vault",
): Promise<MinimizationProof> {
  await wait(1400);
  const metricsCommitment = localDigest(JSON.stringify(clinicalMetrics));
  return {
    proofId: `zkp_min_${randomHex(24)}`,
    verified: true,
    circuit: "minimization_v1",
    metricsCommitment,
    vaultCommitment: localDigest(`${rawVaultFingerprint}:${metricsCommitment}`),
  };
}

/** Publishes the verified AI brief to the clinician's queue on the ledger. */
export async function submitVerifiedBriefToDoctor(
  proof: MinimizationProof,
  encryptedBrief: string,
): Promise<ProofReceipt> {
  await wait(900);
  return {
    proofId: proof.proofId,
    verified: proof.verified && encryptedBrief.length > 0,
    txHash: `0xmn${randomHex(56)}`,
    circuit: proof.circuit,
    timestamp: Date.now(),
  };
}
