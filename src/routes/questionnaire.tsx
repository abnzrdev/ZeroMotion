import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell, LockedGate } from "@/components/AppShell";
import { useMidnightWallet } from "@/context/MidnightProvider";
import { MidnightService } from "@/lib/midnightService";
import { KOOS_ANSWERS, KOOS_ITEMS, KOOS_SUBSCALES } from "@/lib/mockData";

export const Route = createFileRoute("/questionnaire")({
  head: () => ({
    meta: [
      { title: "Knee Check-in — ZeroMotion" },
      {
        name: "description",
        content:
          "Answer 10 short questions about your knee. Your answers stay on your device and are never uploaded.",
      },
      { property: "og:title", content: "Knee Check-in — ZeroMotion" },
      {
        property: "og:description",
        content: "Step 1: a short knee check-in that stays private on your device.",
      },
    ],
  }),
  component: QuestionnairePage,
});

const FRIENDLY_SECTION: Record<string, string> = {
  Symptoms: "How it feels",
  Pain: "Pain",
  "Function, daily living": "Everyday life",
  "Sport & recreation": "Being active",
  "Quality of life": "Confidence",
};


function QuestionnairePage() {
  const navigate = useNavigate();
  const { wallet, journey, patch, runProof, unlockedSteps } = useMidnightWallet();
  const [page, setPage] = useState(0);

  const subscale = KOOS_SUBSCALES[page];
  const items = useMemo(() => KOOS_ITEMS.filter((i) => i.subscale === subscale), [subscale]);
  const answered = Object.keys(journey.koosAnswers).length;
  const progress = Math.round((answered / KOOS_ITEMS.length) * 100);
  const pageComplete = items.every((i) => journey.koosAnswers[i.id] !== undefined);
  const allComplete = answered === KOOS_ITEMS.length;

  const setAnswer = (id: string, value: number) =>
    patch({ koosAnswers: { ...journey.koosAnswers, [id]: value } });

  const computeScore = () => {
    const values = Object.values(journey.koosAnswers);
    const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    return Math.round(100 - (mean / 4) * 100);
  };

  const submit = async () => {
    const score = computeScore();
    patch({ koosScore: score });
    const receipt = await runProof(
      "Saving your check-in securely",
      "koos_completion_v1",
      () => MidnightService.proveQuestionnaireCompletion(score),
    );
    patch({ questionnaireProof: receipt });
  };

  if (!wallet) {
    return (
      <AppShell title="Knee check-in" subtitle="Step 1 · 10 quick questions">
        <LockedGate
          message="Sign in first, then we can start your check-in."
          backTo="/"
          backLabel="Go to sign-in"
        />
      </AppShell>
    );
  }

  const done = Boolean(journey.questionnaireProof);

  return (
    <AppShell title="Knee check-in" subtitle="Step 1 · 10 quick questions about your knee">
      <div className="max-w-3xl space-y-8">
        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-primary">
            <Lock className="size-3.5" /> Your answers stay on this device
          </span>
          <span className="text-xs text-muted-foreground">
            {answered} of {KOOS_ITEMS.length} answered
          </span>
          <div className="ml-auto h-1 w-full max-w-40 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {done ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Check className="size-5 text-primary" />
              <p className="text-base">
                All done — your knee score is{" "}
                <strong className="text-primary">{journey.koosScore}</strong> out of 100. It has
                been saved and ZK verified.
              </p>
            </div>
            {unlockedSteps.capture ? (
              <button
                onClick={() => navigate({ to: "/capture" })}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Next: record my movement <ArrowRight className="size-4" />
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-5 text-base">
              {KOOS_SUBSCALES.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setPage(i)}
                  className={`border-b-2 pb-1 transition ${
                    i === page
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {FRIENDLY_SECTION[s] ?? s}
                </button>
              ))}
            </div>

            <div className="animate-rise space-y-8" key={subscale}>
              {items.map((item) => (
                <div key={item.id}>
                  <p className="text-lg sm:text-xl">{item.prompt}</p>
                  <div className="mt-3.5 flex flex-wrap gap-2.5">
                    {KOOS_ANSWERS.map((a) => {
                      const active = journey.koosAnswers[item.id] === a.value;
                      return (
                        <button
                          key={a.value}
                          onClick={() => setAnswer(item.id, a.value)}
                          className={`rounded-full border px-5 py-2.5 text-base transition ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 border-t border-border pt-5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-2 text-sm text-muted-foreground disabled:opacity-40"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
              {page < KOOS_SUBSCALES.length - 1 ? (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pageComplete}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Next <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={!allComplete}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Save my answers <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

