import { createServerFn } from "@tanstack/react-start";

import type { ClinicalMetrics } from "./clinicalMinimization";

export type NvidiaInput = {
  metrics: ClinicalMetrics;
  question: string;
  audience: "patient" | "clinician" | "chat-explainer";
  /** Optional doctor<->patient conversation the model should read and explain. */
  transcript?: string;
};

/**
 * NVIDIA NIM clinical assistant.
 *
 * IMPORTANT: the payload is the anonymized clinical metrics only — no name,
 * no MRN, no raw sensor log, no video. The model physically cannot re-identify
 * the patient from what it receives.
 */
export const askNvidia = createServerFn({ method: "POST" })
  .inputValidator((input: NvidiaInput) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env["NVIDIA_API_KEY"];
    if (!apiKey) {
      return { ok: false as const, reason: "no-key" as const, text: "" };
    }

    const system =
      data.audience === "chat-explainer"
        ? "You are a medical interpreter for a knee-rehabilitation patient. You are given the conversation between the patient and their doctor plus anonymized clinical metrics. Explain what the doctor meant in plain, warm English: define every medical term, say what the patient should actually do, and flag anything they should ask about. No preamble, no drafting notes. Around 110 words. Never invent identity details or a diagnosis the doctor did not give."
        : data.audience === "clinician"
          ? "You are a clinical rehabilitation assistant. You receive ONLY anonymized knee-rehabilitation metrics — never patient identity. Reply with the finished brief only: three short labelled paragraphs (Assessment, Interpretation, Recommendation), roughly 120 words total. No preamble, no drafting notes, no word counting, no identity details."
          : "You are a warm rehabilitation coach explaining anonymized knee-rehab metrics to the patient in plain, encouraging English. Reply with the answer only — no preamble or drafting notes. Around 80 words. Explain any jargon you use. Never invent identity details.";

    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "meta/llama-3.2-90b-vision-instruct",
          temperature: 0.4,
          max_tokens: 600,
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: [
                `Anonymized clinical metrics:\n${JSON.stringify(data.metrics, null, 2)}`,
                data.transcript ? `Doctor/patient conversation:\n${data.transcript}` : "",
                `Request: ${data.question}`,
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
        }),
      });

      if (!res.ok) {
        return { ok: false as const, reason: "upstream" as const, text: await res.text() };
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const text = cleanModelOutput(raw);
      if (!text) return { ok: false as const, reason: "empty" as const, text: "" };
      return { ok: true as const, reason: "ok" as const, text };
    } catch {
      return { ok: false as const, reason: "network" as const, text: "" };
    }
  });

/** Some NIM models emit scratch/planning text before the answer — trim it. */
function cleanModelOutput(raw: string): string {
  let text = raw.trim();
  const anchor = text.search(/(^|\n)\s*(\*\*)?Assessment\b/i);
  if (anchor > 0) text = text.slice(anchor).trim();
  text = text
    .split("\n")
    .filter(
      (l) => !/^\s*(draft|final answer|check words?|count words?|okay|let'?s)\b[:.]?\s*$/i.test(l),
    )
    .join("\n")
    .trim();
  return text;
}
