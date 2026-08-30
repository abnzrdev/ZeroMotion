import { createFileRoute } from "@tanstack/react-router";
import { Activity, Check, Circle, Cpu, Radio, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

import { AppShell, LockedGate } from "@/components/AppShell";
import { useMidnightWallet } from "@/context/MidnightProvider";
import { MidnightService, localDigest } from "@/lib/midnightService";
import { SENSOR_STREAM } from "@/lib/mockData";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Movement Check — ZeroMotion" },
      {
        name: "description",
        content:
          "Record a 10-second knee exercise on your device. Nothing is uploaded — only a ZK-verified result is shared.",
      },
      { property: "og:title", content: "Movement Check — ZeroMotion" },
      {
        property: "og:description",
        content: "Step 2: record a short exercise on your device and share only a ZK-verified result.",
      },
    ],
  }),
  component: CapturePage,
});

function CapturePage() {
  const { journey, patch, runProof, unlockedSteps } = useMidnightWallet();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [frame, setFrame] = useState(8);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!recording) return;
    timer.current = setInterval(() => {
      setElapsed((e) => {
        const next = Number((e + 0.1).toFixed(1));
        if (next >= 10) {
          setRecording(false);
          return 10;
        }
        return next;
      });
      setFrame((f) => (f + 1) % SENSOR_STREAM.length);
    }, 100);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [recording]);

  useEffect(() => {
    if (elapsed >= 10 && !journey.sensorHash) {
      patch({
        sensorHash: localDigest(
          SENSOR_STREAM.map((s) => `${s.t}:${s.flexion}:${s.emg}:${s.imu}`).join("|"),
        ),
      });
    }
  }, [elapsed, journey.sensorHash, patch]);

  const sample = SENSOR_STREAM[frame] ?? SENSOR_STREAM[0]!;
  const window = SENSOR_STREAM.slice(Math.max(0, frame - 18), frame + 1);

  const submit = async () => {
    if (!journey.sensorHash) return;
    const receipt = await runProof(
      "Saving your session securely",
      "movement_session_v1",
      () => MidnightService.proveMovementSession(journey.sensorHash!),
    );
    patch({ captureProof: receipt });
  };

  if (!unlockedSteps.capture) {
    return (
      <AppShell title="Movement check" subtitle="Step 2 · a 10-second knee exercise">
        <LockedGate
          message="Finish your knee check-in first, then we can record your movement."
          backTo="/questionnaire"
          backLabel="Go to my check-in"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Movement check"
      subtitle="Step 2 · follow along for 10 seconds — everything stays on your device"
    >
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="glass relative overflow-hidden rounded-3xl">
          <div className="hud-grid relative aspect-4/3 w-full bg-background/70 sm:aspect-video">
            <div className="absolute inset-x-0 top-0 h-px bg-primary/70 animate-scanline" />

            <svg viewBox="0 0 400 300" className="absolute inset-0 size-full">
              <g stroke="var(--color-primary)" strokeWidth="2" fill="none" opacity="0.9">
                <line x1="200" y1="60" x2="200" y2="140" />
                <line x1="200" y1="140" x2={170 + sample.extension} y2="210" />
                <line x1={170 + sample.extension} y1="210" x2={150 + sample.flexion / 3} y2="270" />
              </g>
              {[
                [200, 60],
                [200, 140],
                [170 + sample.extension, 210],
                [150 + sample.flexion / 3, 270],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="6" fill="var(--color-zk)" className="animate-hud-pulse" />
              ))}
              <circle
                cx={170 + sample.extension}
                cy={210}
                r="30"
                fill="none"
                stroke="var(--color-warning)"
                strokeOpacity="0.6"
                strokeDasharray="4 6"
              />
              <text x={210 + sample.extension} y={205} fill="var(--color-warning)" fontSize="12" fontFamily="monospace">
                {sample.flexion}° flex
              </text>
            </svg>

            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 font-mono text-[10px]">
              <span className={`size-2 rounded-full ${recording ? "bg-destructive animate-hud-pulse" : "bg-muted-foreground"}`} />
              {recording ? "REC" : "STANDBY"} · {elapsed.toFixed(1)}s / 10.0s
            </div>
            <div className="absolute right-4 top-4 rounded-full border border-zk/30 bg-zk/10 px-3 py-1 font-mono text-[10px] text-zk">
              private · nothing is uploaded
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-4">
            {journey.sensorHash && !recording ? (
              <>
                <span className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                  <Check className="size-4" /> Session recorded
                </span>
                <button
                  onClick={() => {
                    setElapsed(0);
                    patch({ sensorHash: null, captureProof: null });
                    setRecording(true);
                  }}
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Record again
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (recording) return setRecording(false);
                    setElapsed(0);
                    patch({ sensorHash: null, captureProof: null });
                    setRecording(true);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    recording
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {recording ? <Square className="size-4" /> : <Circle className="size-4" />}
                  {recording ? "Stop" : "Start my 10-second exercise"}
                </button>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-100"
                    style={{ width: `${(elapsed / 10) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>

        </div>

        <div className="space-y-4">
          <div className="glass rounded-3xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="size-3.5 text-primary" /> Muscle activity
            </div>
            <p className="mt-1 font-mono text-2xl text-primary">{sample.emg}%</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={window}>
                  <defs>
                    <linearGradient id="emg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={[0, 120]} />
                  <Area
                    type="monotone"
                    dataKey="emg"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#emg)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-3xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Radio className="size-3.5 text-zk" /> Knee bend range
            </div>
            <div className="mt-1 flex items-baseline gap-3 font-mono">
              <span className="text-2xl text-zk">{sample.flexion}°</span>
              <span className="text-xs text-muted-foreground">straightening gap {sample.extension}°</span>
            </div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={window}>
                  <YAxis hide domain={[0, 200]} />
                  <Line
                    type="monotone"
                    dataKey="imu"
                    stroke="var(--color-zk)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="flexion"
                    stroke="var(--color-warning)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-3xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu className="size-3.5 text-accent" /> Saved privately on this device
            </div>
            {journey.sensorHash ? (
              <>
                {journey.captureProof ? (
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
                    <Check className="size-4" /> Session ZK verified
                  </div>
                ) : (
                  <button
                    onClick={submit}
                    className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                  >
                    Share my verified results
                  </button>
                )}
              </>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Finish the 10-second exercise and we'll save it here for you.
              </p>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
