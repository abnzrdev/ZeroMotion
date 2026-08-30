import { createFileRoute } from "@tanstack/react-router";
import { CornerDownLeft, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell, LockedGate } from "@/components/AppShell";
import { useMidnightWallet } from "@/context/MidnightProvider";
import { FALLBACK_RESPONSE, TRANSLATOR_RESPONSES, TRANSLATOR_SUGGESTIONS } from "@/lib/mockData";

export const Route = createFileRoute("/ai-translator")({
  head: () => ({
    meta: [
      { title: "Local AI Clinical Translator — ZeroMotion" },
      {
        name: "description",
        content:
          "A private on-device language model that turns clinical jargon like extension lag and KOOS scores into supportive plain English.",
      },
      { property: "og:title", content: "Local AI Clinical Translator — ZeroMotion" },
      {
        property: "og:description",
        content: "AI reasoning executed 100% locally. Zero data uploaded.",
      },
    ],
  }),
  component: TranslatorPage,
});

type Line = { role: "user" | "ai" | "system"; text: string };

function TranslatorPage() {
  const { unlockedSteps, journey } = useMidnightWallet();
  const [lines, setLines] = useState<Line[]>([
    { role: "system", text: "zm-local-llm v0.4 · 3.1B params · loaded from device storage" },
    { role: "system", text: `context: koos=${journey.koosScore ?? "n/a"} · sensor_log=local · records=on-device` },
    { role: "ai", text: "I'm your local translator. Ask me what any clinical note means for you." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, typing]);

  const ask = (text: string) => {
    if (!text.trim() || typing) return;
    setLines((l) => [...l, { role: "user", text }]);
    setInput("");
    setTyping(true);
    const reply = TRANSLATOR_RESPONSES.find((r) => r.match.test(text))?.text ?? FALLBACK_RESPONSE;
    setTimeout(() => {
      setLines((l) => [...l, { role: "ai", text: reply }]);
      setTyping(false);
    }, 900);
  };

  if (!unlockedSteps.capture) {
    return (
      <AppShell title="Local AI Clinical Translator" subtitle="Private on-device reasoning terminal">
        <LockedGate
          message="The translator reads your local clinical record — complete the KOOS questionnaire first."
          backTo="/questionnaire"
          backLabel="Go to Step 1"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Local AI Clinical Translator"
      subtitle="A private language model reasoning over records that never leave this device"
    >
      <div className="space-y-4">
        <div className="glass flex items-center gap-3 rounded-2xl border-zk/30 px-4 py-3 text-xs text-zk">
          <ShieldCheck className="size-4 shrink-0" />
          AI Reasoning executed 100% locally. Zero data uploaded.
        </div>

        <div className="glass overflow-hidden rounded-3xl">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-destructive/70" />
            <span className="size-2.5 rounded-full bg-warning/70" />
            <span className="size-2.5 rounded-full bg-zk/70" />
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">
              ~/phoenix/local-llm — inference.tty
            </span>
          </div>

          <div className="hud-grid max-h-[52vh] min-h-72 space-y-3 overflow-y-auto bg-background/60 p-4 font-mono text-[12.5px] leading-relaxed">
            {lines.map((line, i) => (
              <div key={i} className="animate-rise">
                {line.role === "system" ? (
                  <p className="text-muted-foreground">{`# ${line.text}`}</p>
                ) : line.role === "user" ? (
                  <p className="text-primary">
                    <span className="text-muted-foreground">patient@local:~$ </span>
                    {line.text}
                  </p>
                ) : (
                  <p className="whitespace-pre-wrap text-foreground">
                    <span className="text-zk">llm ▸ </span>
                    {line.text}
                  </p>
                )}
              </div>
            ))}
            {typing ? (
              <p className="text-zk">
                llm ▸ <span className="animate-caret">▍</span>
                <span className="ml-2 text-muted-foreground">reasoning locally…</span>
              </p>
            ) : null}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-border/60 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a clinical note or metric…"
              className="min-w-0 flex-1 rounded-xl border border-input bg-background/60 px-3 py-2.5 font-mono text-xs outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              Translate <CornerDownLeft className="size-3.5" />
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
          {TRANSLATOR_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <Sparkles className="size-3" /> {s}
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
