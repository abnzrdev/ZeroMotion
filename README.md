# ZeroMotion

**A knee-rehabilitation companion where recovery milestones are *proved*, not *uploaded*.**

A post-op patient completes their KOOS questionnaire and movement capture **on their own device** — then generates zero-knowledge proofs that the milestone was genuinely met. The clinician sees a verified claim and signs off. Nobody — not the clinician, not the app, not anyone — ever sees the raw answers, sensor traces, or health history.

Built for the **Midnight Hackathon** (Integrate + AI + Mobile track).

**Live:** https://zeromotion.vercel.app
**Repo:** https://github.com/abnzrdev/ZeroMotion

---

## The core idea

```
USER ACTION (on device)     COMPACT PROOF                      VISIBLE OUTCOME
──────────────────────     ──────────────────────────         ─────────────────────────
KOOS + motion capture   →   prove 0 ≤ KOOS ≤ 100          →    clinician sees
(never uploaded)            prove session matches               "Progress verified"
                            sensor hash                         →  signs next phase
                            (witness stays local)               →  plan unlocked
```

Remove the zero-knowledge layer and the value proposition breaks: the clinician would be back to reading raw patient data.

## Features

| Route | What it does |
| --- | --- |
| `/` | Landing — pick a role (patient / clinician) |
| `/questionnaire` | 10-item KOOS questionnaire, completed fully on device |
| `/capture` | Motion-capture session; sensor log stays local, only a commitment hash leaves |
| `/active-plan` | Recovery plan, unlocked after milestone verification |
| `/ai-assistant` | Patient + clinician AI briefings powered by **NVIDIA NIM** (`meta/llama-3.2-90b-vision-instruct`) — receives *only* anonymized metrics |
| `/messages` | Doctor ↔ patient chat with a "chat explainer" that translates medical jargon into plain English |
| `/ai-translator` | Plain-English AI translator for clinical content |
| `/clinician` | Clinician dashboard — verified claims, adherence, milestone sign-off |
| `/admin` | Administration |

## Privacy model

| Stays on device (never uploaded) | Leaves the device |
| --- | --- |
| Item-level KOOS answers | ZK proof + validity bit |
| EMG / IMU sensor stream | Sensor-log commitment hash |
| AI conversations | nothing |
| Patient identity | Shielded address (only if the patient chooses to disclose) |

The AI layer is privacy-preserving by construction: `src/lib/nvidia.functions.ts` runs server-side and sends **only anonymized clinical metrics** — no name, no MRN, no raw sensor log, no video. The model physically cannot re-identify the patient from what it receives.

## Architecture

```
Browser (all health data lives here)
├── src/context/MidnightProvider.tsx   local-first journey state (localStorage)
├── src/lib/midnightService.ts         proof interface: proveQuestionnaireCompletion,
│                                      proveMovementSession, clinicianApproveMilestone
├── src/lib/clinicalMinimization.ts    clinical minimization before anything leaves
├── src/lib/nvidia.functions.ts        server-side NVIDIA NIM calls (server fn, key never exposed)
├── src/components/ZkProofOverlay.tsx  proof-generation UX
└── src/routes/*                       questionnaire · capture · ai-assistant ·
                                        ai-translator · messages · clinician · active-plan
Midnight ledger  ←  proof + commitment + tx hash only
```

## Tech stack

- **TanStack Start** (SSR) + **TanStack Router** + React 19
- **Tailwind CSS v4** + shadcn/ui (Radix primitives)
- **Nitro** server engine — Cloudflare preset for Lovable hosting, `vercel` preset when building on Vercel
- **Bun** for installs and scripts
- **NVIDIA NIM** (`meta/llama-3.2-90b-vision-instruct`) for AI briefings via server functions

## Getting started

```bash
bun install
cp .env.example .env.local   # then add your NVIDIA_API_KEY
bun run dev                  # http://localhost:8080
```

Get a free API key at [build.nvidia.com](https://build.nvidia.com) (key starts with `nvapi-`). Without a key the AI features gracefully fall back to simulated briefings — everything else works.

### Environment variables

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NVIDIA_API_KEY` | no | server-side only | NVIDIA NIM chat completions for AI briefings |

## Build & deploy

```bash
bun run build                                            # production build
vercel build --prod && vercel deploy --prebuilt --prod   # deploy to Vercel
```

The Nitro preset is chosen automatically: `vercel` when building on Vercel (`VERCEL` env set), Cloudflare otherwise.

## Project structure

```
src/
├── context/     MidnightProvider — local-first state
├── lib/         midnightService (proof interface), nvidia.functions (AI),
│                clinicalMinimization (anonymization), mockData
├── components/  AppShell, ZkProofOverlay, ui/ (shadcn)
└── routes/      index · questionnaire · capture · active-plan ·
                 ai-assistant · ai-translator · messages · clinician · admin
```

## Demo walkthrough

Run in **two browser windows** (one normal, one private):

| Window | Role | Does |
| --- | --- | --- |
| A | Patient | Creates a local Recovery ID → 10-item KOOS → motion capture → generates ZK proofs |
| B | Clinician | Sees the verified claim + adherence, signs the milestone release |

The patient window then unlocks the Active Recovery Plan. That's the complete loop.

## Limitations

- The Compact circuits are represented by a typed stub layer (`src/lib/midnightService.ts`) with the exact call signatures the compiled contract exposes; proof timing and receipts are simulated.
- Next steps: compile the two circuits (`koos_range`, `session_commitment`) with `compactc`, wire the Lace wallet provider in place of the local key-pair, and publish to the Midnight local devnet.
