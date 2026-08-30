/**
 * On-device minimization filter.
 *
 * Takes the raw local vault (identity, KOOS item answers, EMG/IMU sample logs)
 * and strips it down to the sterile, non-identifying clinical parameters that
 * are the ONLY thing allowed to leave the device for cloud AI inference.
 */

export type RawVaultRecord = {
  patientName: string;
  dateOfBirth: string;
  mrn: string;
  videoClip: string;
  koosAnswers: Record<string, number>;
  sensorSamples: { t: number; flexion: number; extension: number; emg: number; imu: number }[];
};

export type ClinicalMetrics = {
  flexion_deg: number;
  extension_lag_deg: number;
  quadriceps_activation_emg: "weak" | "moderate" | "strong";
  emg_symmetry_pct: number;
  koos_symptoms: number;
  koos_total: number;
  session_count: number;
  phase: string;
};

/** Fields that are deliberately dropped before anything is sent off-device. */
export const WITHHELD_FIELDS = [
  "patientName",
  "dateOfBirth",
  "mrn",
  "videoClip",
  "koosAnswers[]",
  "sensorSamples[]",
  "deviceId",
  "geolocation",
] as const;

export function minimize(raw: RawVaultRecord, koosScore: number | null): ClinicalMetrics {
  const samples = raw.sensorSamples.length ? raw.sensorSamples : [{ t: 0, flexion: 104, extension: 12, emg: 58, imu: 120 }];
  const flexion = Math.max(...samples.map((s) => s.flexion));
  const extension = Math.min(...samples.map((s) => s.extension));
  const emgAvg = Math.round(samples.reduce((a, s) => a + s.emg, 0) / samples.length);
  const total = koosScore ?? 48;
  return {
    flexion_deg: flexion,
    extension_lag_deg: Math.max(0, extension),
    quadriceps_activation_emg: emgAvg < 55 ? "weak" : emgAvg < 75 ? "moderate" : "strong",
    emg_symmetry_pct: Math.min(99, emgAvg + 4),
    koos_symptoms: Math.round(total * 0.92),
    koos_total: total,
    session_count: 14,
    phase: "Phase II",
  };
}

export const DEMO_RAW_VAULT: RawVaultRecord = {
  patientName: "Sarah Whitfield",
  dateOfBirth: "1991-04-17",
  mrn: "MRN-88-421-993",
  videoClip: "capture_week6_squat.webm (18.4 MB)",
  koosAnswers: { "sym-1": 2, "sym-2": 1, "pai-1": 2, "pai-2": 3, "fun-1": 1 },
  sensorSamples: [],
};

/** Deterministic offline stand-in for the NVIDIA NIM cloud response. */
export function simulatedBriefing(metrics: ClinicalMetrics): string {
  return [
    `ASSESSMENT — ${metrics.phase}, session ${metrics.session_count}`,
    `Active knee flexion measured at ${metrics.flexion_deg}° with a residual extension lag of ${metrics.extension_lag_deg}°.`,
    `Quadriceps activation is ${metrics.quadriceps_activation_emg} at ${metrics.emg_symmetry_pct}% of the contralateral limb.`,
    `KOOS total ${metrics.koos_total} (symptoms subscale ${metrics.koos_symptoms}) — consistent with expected recovery trajectory.`,
    `RECOMMENDATION: continue terminal-knee-extension and straight-leg-raise loading; clear for Phase III progression if extension lag falls below 5°.`,
  ].join("\n");
}

export const PATIENT_BRIEFINGS: Record<string, string> = {
  "Amara Bekele":
    "Flexion 118°, extension lag 4°. Quadriceps activation strong (88% symmetry). KOOS 62, trending +9 over 3 weeks. Cleared metrics for Phase III loading.",
  "Daniel Ortiz":
    "Flexion 96°, extension lag 11°. Quadriceps activation moderate (67% symmetry). KOOS 44. Recommend two more weeks of activation work before load progression.",
  "Sofia Lindqvist":
    "Flexion 132°, extension lag 1°. Activation strong (94% symmetry). KOOS 78. Meets all discharge-track criteria.",
  "Marcus Reid":
    "No verified session in 72 h. Last recorded flexion 84°, extension lag 17°, activation weak. Adherence 41% — outreach advised.",
};
