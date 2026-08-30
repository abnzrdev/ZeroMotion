import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CornerDownLeft, Loader2, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell, LockedGate } from "@/components/AppShell";
import { useMidnightWallet } from "@/context/MidnightProvider";
import {
  DEMO_RAW_VAULT,
  minimize,
  simulatedBriefing,
  type ClinicalMetrics,
} from "@/lib/clinicalMinimization";
import {
  generateMinimizationZkp,
  submitVerifiedBriefToDoctor,
} from "@/lib/midnightService";
import { SENSOR_STREAM } from "@/lib/mockData";
import { askNvidia } from "@/lib/nvidia.functions";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — ZeroMotion" },
      {
        name: "description",
        content:
          "Chat with your AI recovery assistant. It only ever sees your anonymized clinical metrics — never your name, video, or answers.",
      },
      { property: "og:title", content: "AI Assistant — ZeroMotion" },
      {
        property: "og:description",
        content: "Cloud AI intelligence on anonymized metrics only — identity never leaves the device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiAssistantPage,
});

type Line = { role: "user" | "ai"; text: string };

function AiAssistantPage() {
  const { unlockedSteps, journey, patch, runProof } = useMidnightWallet();
  const callNvidia = useServerFn(askNvidia);

  const metrics = useMemo<ClinicalMetrics>(
    () => minimize({ ...DEMO_RAW_VAULT, sensorSamples: SENSOR_STREAM }, journey.koosScore),
    [journey.koosScore],
  );

  // Quick questions grounded in the patient's actual current metrics
  const quickQuestions = useMemo<string[]>(
    () => [
      `My knee bends to ${metrics.flexion_deg}° — is that good?`,
      `What does a ${metrics.extension_lag_deg}° straightening lag mean?`,
      `My KOOS score is ${metrics.koos_total} — am I improving?`,
      "What should I be careful about this week?",
      "When can I walk without the brace?",
    ],
    [metrics],
  );

  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, typing]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [typing]);

  const ask = async (text: string) => {
    if (!text.trim() || typing) return;
    setLines((l) => [...l, { role: "user", text }]);
    setInput("");
    setTyping(true);
    const res = await callNvidia({ data: { metrics, question: text, audience: "patient" } });
    setLines((l) => [
      ...l,
      {
        role: "ai",
        text: res.ok
          ? res.text
          : simulatedBriefing(metrics),
      },
    ]);
    setTyping(false);
  };

  const sendToDoctor = async () => {
    setSending(true);
    const text = simulatedBriefing(metrics);
    const receipt = await runProof("Sending your verified summary", "minimization_v1", async () => {
      const proof = await generateMinimizationZkp(metrics, DEMO_RAW_VAULT.mrn);
      await submitVerifiedBriefToDoctor(proof, text);
      return { proofId: proof.proofId, verified: proof.verified };
    });
    patch({ captureProof: receipt });
    setSending(false);
  };

  if (!unlockedSteps.capture) {
    return (
      <AppShell title="AI Assistant" subtitle="Your personal recovery companion">
        <LockedGate
          message="The assistant reasons over your clinical record — complete the check-in first."
          backTo="/questionnaire"
          backLabel="Go to Step 1"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="AI Assistant"
      subtitle="Ask anything about your recovery — I only ever see your numbers, never your name."
    >
      <div className="glass flex h-[calc(100vh-15rem)] min-h-[28rem] flex-col overflow-hidden rounded-3xl">
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {lines.length === 0 && !typing ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div>
                <p className="text-2xl font-semibold">How can I help today?</p>
                <p className="mt-2 max-w-md text-base text-muted-foreground">
                  I've read your latest check-in. Ask me what your numbers mean, or tap a
                  question below.
                </p>
              </div>
              <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2.5">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => void ask(q)}
                    className="rounded-full border border-border/70 bg-surface/60 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {lines.map((line, i) => (
                <div key={i} className="leading-relaxed">
                  {line.role === "user" ? (
                    <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-base text-primary-foreground">
                      {line.text}
                    </p>
                  ) : (
                    <p className="w-fit max-w-[90%] whitespace-pre-wrap px-1 py-1 text-base">
                      {line.text}
                    </p>
                  )}
                </div>
              ))}
              {typing ? (
                <p className="flex items-center gap-2 px-1 text-base text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Thinking…
                </p>
              ) : null}
              <div ref={endRef} />
            </>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border/60 p-4">
          {lines.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => void ask(q)}
                  disabled={typing}
                  className="rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="flex items-center gap-2.5"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your recovery…"
              className="min-w-0 flex-1 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 text-base outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              disabled={typing || !input.trim()}
              className="rounded-2xl bg-primary p-3.5 text-primary-foreground disabled:opacity-50"
              aria-label="Send"
            >
              <CornerDownLeft className="size-5" />
            </button>
          </form>

          {/* Keep journey progression: verified summary to doctor */}
          <div className="mt-3">
            {journey.captureProof ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheck className="size-4" />
                Summary sent to your doctor · ZK verified
              </p>
            ) : (
              <button
                onClick={sendToDoctor}
                disabled={sending}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send my verified summary to my doctor
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
