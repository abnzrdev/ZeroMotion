import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CornerDownLeft, Loader2, MessagesSquare, Sparkle, Stethoscope, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { useMidnightWallet } from "@/context/MidnightProvider";
import {
  CHAT_STORAGE_KEY,
  formatTime,
  loadThread,
  saveThread,
  transcriptOf,
  type ChatMessage,
} from "@/lib/careChat";
import { DEMO_RAW_VAULT, minimize } from "@/lib/clinicalMinimization";
import { SENSOR_STREAM } from "@/lib/mockData";
import { askNvidia } from "@/lib/nvidia.functions";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Care Messages — ZeroMotion" },
      {
        name: "description",
        content:
          "Message your doctor directly, and ask the AI assistant to translate any medical language in the conversation into plain English.",
      },
      { property: "og:title", content: "Care Messages — ZeroMotion" },
      {
        property: "og:description",
        content: "Doctor and patient chat with an AI interpreter that explains the medical terms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { journey } = useMidnightWallet();
  const callNvidia = useServerFn(askNvidia);
  const isClinician = journey.role === "clinician";
  const me: "patient" | "clinician" = isClinician ? "clinician" : "patient";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const metrics = useMemo(
    () => minimize({ ...DEMO_RAW_VAULT, sensorSamples: SENSOR_STREAM }, journey.koosScore),
    [journey.koosScore],
  );

  useEffect(() => setMessages(loadThread()), []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHAT_STORAGE_KEY) setMessages(loadThread());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const commit = (next: ChatMessage[]) => {
    setMessages(next);
    saveThread(next);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    commit([...messages, { id: `m-${Date.now()}`, author: me, text, at: Date.now() }]);
    setDraft("");
  };

  const explain = async () => {
    if (thinking) return;
    setThinking(true);
    const transcript = transcriptOf(messages);
    try {
      const res = await callNvidia({
        data: {
          metrics,
          transcript,
          audience: "chat-explainer",
          question:
            "Read the conversation above and explain to me, the patient, what my doctor actually means and what I should do next.",
        },
      });
      const text = res.ok
        ? res.text
        : "The AI interpreter is offline right now. Your doctor is asking you to keep the knee straightening work going and to re-record a session if the morning stiffness lasts longer than half an hour.";
      commit([...messages, { id: `ai-${Date.now()}`, author: "ai", text, at: Date.now() }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <AppShell
      title={isClinician ? "Patient messages" : "Talk to your doctor"}
      subtitle={
        isClinician
          ? "Direct thread with your patient — the AI interpreter only reads it when the patient asks."
          : "Ask anything. If a reply sounds too medical, let the AI assistant translate it for you."
      }
    >
      <div className="glass flex h-[calc(100vh-14rem)] min-h-[28rem] flex-col rounded-3xl">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <MessagesSquare className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {isClinician
                ? "Sarah Whitfield · ACL-R week 6"
                : "Dr. Imani Osei · Orthopaedic rehab"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Messages stay on this device · identity never sent to the AI
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => {
            const mine = m.author === me;
            const ai = m.author === "ai";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] ${mine ? "text-right" : ""}`}>
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {ai ? (
                      <>
                        <Sparkle className="size-3 text-zk" /> AI assistant · plain English
                      </>
                    ) : m.author === "clinician" ? (
                      <>
                        <Stethoscope className="size-3" /> Doctor
                      </>
                    ) : (
                      <>
                        <User className="size-3" /> Patient
                      </>
                    )}
                    <span className="font-mono normal-case tracking-normal">
                      {formatTime(m.at)}
                    </span>
                  </p>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed ${
                      ai
                        ? "bg-zk/10 text-foreground"
                        : mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-2/70 text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
          {thinking ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> AI assistant is reading the
              conversation…
            </p>
          ) : null}
          <div ref={endRef} />
        </div>

        <div className="space-y-2 border-t border-border/60 px-4 py-3">
          {!isClinician ? (
            <button
              onClick={explain}
              disabled={thinking}
              className="flex items-center gap-2 rounded-xl bg-zk/12 px-3 py-2 text-xs font-semibold text-zk disabled:opacity-50"
            >
              <Sparkle className="size-3.5" />
              Explain what my doctor said
            </button>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder={
                isClinician ? "Reply to your patient…" : "Write a message to your doctor…"
              }
              className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface/70 px-3.5 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={send}
              disabled={!draft.trim()}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="Send message"
            >
              <CornerDownLeft className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
