export type KoosItem = {
  id: string;
  subscale: "Symptoms" | "Pain" | "Function, daily living" | "Sport & recreation" | "Quality of life";
  prompt: string;
};

const SCALES: Record<string, string[]> = {
  Symptoms: [
    "Do you have swelling in your knee?",
    "How severe is your knee stiffness after first waking?",
  ],
  Pain: [
    "How often do you experience knee pain?",
    "Pain when going up or down stairs",
  ],
  "Function, daily living": [
    "Difficulty rising from sitting",
    "Difficulty walking on a flat surface",
  ],
  "Sport & recreation": ["Difficulty squatting", "Difficulty twisting or pivoting on the injured knee"],
  "Quality of life": [
    "How troubled are you by a lack of confidence in your knee?",
    "In general, how much difficulty do you have with your knee?",
  ],
};

export const KOOS_ITEMS: KoosItem[] = Object.entries(SCALES).flatMap(([subscale, prompts]) =>
  prompts.map((prompt, index) => ({
    id: `${subscale.slice(0, 3).toLowerCase()}-${index + 1}`,
    subscale: subscale as KoosItem["subscale"],
    prompt,
  })),
);

export const KOOS_ANSWERS = [
  { value: 0, label: "None" },
  { value: 1, label: "Mild" },
  { value: 2, label: "Moderate" },
  { value: 3, label: "Severe" },
  { value: 4, label: "Extreme" },
];

export const KOOS_SUBSCALES = Object.keys(SCALES) as KoosItem["subscale"][];

export type SensorSample = { t: number; flexion: number; extension: number; emg: number; imu: number };

export const SENSOR_STREAM: SensorSample[] = Array.from({ length: 40 }, (_, i) => {
  const t = i / 4;
  const wave = Math.sin(t * 1.1);
  return {
    t: Number(t.toFixed(1)),
    flexion: Math.round(62 + wave * 38 + Math.sin(t * 3) * 4),
    extension: Math.round(14 - wave * 9),
    emg: Math.round(48 + Math.abs(wave) * 40 + Math.sin(t * 7) * 8),
    imu: Math.round(120 + wave * 26),
  };
});

export type PatientRecord = {
  name: string;
  sigil: string;
  hash: string;
  cohort: string;
  phase: string;
  koosClaim: string;
  emgClaim: string;
  adherence: number;
  lastProof: string;
  status: "pending" | "approved";
};

export const CLINIC_LEDGER: PatientRecord[] = [
  {
    name: "Amara Bekele",
    sigil: "sigil:0xa41f…9c2e",
    hash: "0x8f2ad4c1b7e05a99",
    cohort: "ACL-R · week 6",
    phase: "Phase II",
    koosClaim: "Verified: KOOS ≤ 100",
    emgClaim: "Verified: EMG Session Complete",
    adherence: 92,
    lastProof: "4 min ago",
    status: "pending",
  },
  {
    name: "Daniel Ortiz",
    sigil: "sigil:0x7bd3…41aa",
    hash: "0x1cd90ba7e4413f02",
    cohort: "TKA · week 3",
    phase: "Phase I",
    koosClaim: "Verified: KOOS ≤ 100",
    emgClaim: "Verified: ROM ≥ 90°",
    adherence: 78,
    lastProof: "31 min ago",
    status: "pending",
  },
  {
    name: "Sofia Lindqvist",
    sigil: "sigil:0xe902…77b1",
    hash: "0x55e1f0aa9d3c8b64",
    cohort: "Meniscus · week 9",
    phase: "Phase III",
    koosClaim: "Verified: KOOS ≤ 100",
    emgClaim: "Verified: EMG Session Complete",
    adherence: 96,
    lastProof: "2 h ago",
    status: "approved",
  },
  {
    name: "Marcus Reid",
    sigil: "sigil:0x3a10…0d5f",
    hash: "0xb7712ce4408a91da",
    cohort: "Patellar · week 2",
    phase: "Phase I",
    koosClaim: "Awaiting proof",
    emgClaim: "Awaiting proof",
    adherence: 41,
    lastProof: "3 d ago",
    status: "pending",
  },
];


export type Exercise = {
  name: string;
  sets: string;
  focus: string;
  tempo: string;
  completed: boolean;
};

export const ACTIVE_PLAN: { day: string; block: string; exercises: Exercise[] }[] = [
  {
    day: "Morning block",
    block: "Activation",
    exercises: [
      { name: "Quad set with towel", sets: "3 × 10", focus: "VMO firing", tempo: "5s hold", completed: true },
      { name: "Heel slides", sets: "3 × 12", focus: "Flexion ROM", tempo: "2-1-2", completed: true },
      { name: "Straight-leg raise", sets: "3 × 8", focus: "Extension lag", tempo: "slow", completed: false },
    ],
  },
  {
    day: "Afternoon block",
    block: "Loading",
    exercises: [
      { name: "Wall sit", sets: "4 × 30s", focus: "Isometric strength", tempo: "hold", completed: false },
      { name: "Step-down eccentric", sets: "3 × 10", focus: "Control", tempo: "3s down", completed: false },
      { name: "Terminal knee extension", sets: "3 × 15", focus: "End-range", tempo: "2-1-2", completed: false },
    ],
  },
  {
    day: "Evening block",
    block: "Recovery",
    exercises: [
      { name: "Hamstring stretch", sets: "3 × 45s", focus: "Mobility", tempo: "hold", completed: false },
      { name: "Cryotherapy", sets: "1 × 12 min", focus: "Swelling", tempo: "—", completed: false },
    ],
  },
];

export const TRANSLATOR_SUGGESTIONS = [
  "15-degree extension lag",
  "KOOS score: 48",
  "Quadriceps EMG amplitude 62% of contralateral limb",
  "Effusion grade 2, stroke test positive",
  "What does Phase II mean for me?",
];

export const TRANSLATOR_RESPONSES: { match: RegExp; text: string }[] = [
  {
    match: /extension lag|extension/i,
    text: "Your knee extension has improved by 3 degrees today! That means the swelling is going down, and your quadriceps are starting to fire correctly. Keep the straight-leg raises going — that last bit of straightening is what makes walking feel normal again.",
  },
  {
    match: /koos/i,
    text: "A KOOS of 48 sits right where we expect at week six. It's a combined score of how your knee feels during daily life — not a grade. You were at 41 two weeks ago, so your day-to-day comfort is measurably better even if it doesn't feel dramatic yet.",
  },
  {
    match: /emg|quadricep|amplitude/i,
    text: "Your thigh muscle is switching on at about 62% of the strength of your other leg. That's normal for this stage after surgery. The muscle isn't damaged — it's just waiting for the signal to get louder, and the activation drills you're doing are exactly what turns the volume up.",
  },
  {
    match: /effusion|swelling|stroke test/i,
    text: "There's still a bit of fluid inside the joint — that's the puffiness you feel around the kneecap. It's your knee's normal response to work. Ice after your afternoon block and elevate for ten minutes; it should settle within a day or two.",
  },
  {
    match: /phase/i,
    text: "Phase II means you've earned load. Your clinician has cryptographically signed off that your range of motion and muscle activation are safe for weight-bearing strength work. New exercises unlock, but nothing painful — discomfort is fine, sharp pain is not.",
  },
];

export const FALLBACK_RESPONSE =
  "I've read that against your local record. In plain terms: your knee is progressing on schedule, and nothing in today's metrics falls outside the safe band your clinician set. Ask me about your KOOS score, extension, swelling, or muscle activation for a specific breakdown.";
