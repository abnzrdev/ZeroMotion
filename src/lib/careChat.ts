/**
 * Doctor <-> patient care chat.
 *
 * Messages live in browser storage only. The AI never joins the conversation
 * uninvited — the patient explicitly asks it to read the thread and explain
 * the medical language in plain English.
 */

export type ChatAuthor = "patient" | "clinician" | "ai";

export type ChatMessage = {
  id: string;
  author: ChatAuthor;
  text: string;
  at: number;
};

export const CHAT_STORAGE_KEY = "zm-zk-rehabcare:care-chat:v1";

const HOUR = 3_600_000;

export const SEED_THREAD: ChatMessage[] = [
  {
    id: "seed-1",
    author: "clinician",
    text: "Reviewed your verified session. Terminal extension lag is still 12°, and quadriceps activation reads weak on the EMG symmetry index. Hold Phase II loading, add TKE isometrics 3×15 with a 5 s hold, and avoid open-chain resisted extension for now.",
    at: Date.now() - 5 * HOUR,
  },
  {
    id: "seed-2",
    author: "patient",
    text: "Thank you doctor. I did the exercises yesterday but my knee felt stiff in the morning.",
    at: Date.now() - 4 * HOUR,
  },
  {
    id: "seed-3",
    author: "clinician",
    text: "Morning stiffness under 30 minutes is expected effusion behaviour at week 6. If it persists past that, ice and elevate, then re-run the capture so we get a fresh proof.",
    at: Date.now() - 3 * HOUR,
  },
];

export function loadThread(): ChatMessage[] {
  if (typeof window === "undefined") return SEED_THREAD;
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return SEED_THREAD;
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) && parsed.length ? parsed : SEED_THREAD;
  } catch {
    return SEED_THREAD;
  }
}

export function saveThread(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    /* private mode — thread stays in memory */
  }
}

export function transcriptOf(messages: ChatMessage[], limit = 12): string {
  return messages
    .filter((m) => m.author !== "ai")
    .slice(-limit)
    .map((m) => `${m.author === "clinician" ? "Doctor" : "Patient"}: ${m.text}`)
    .join("\n");
}

export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
