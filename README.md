# ZeroMotion

**A knee-rehab patient proves they completed their recovery milestone — without revealing their raw KOOS answers, EMG/IMU sensor logs, or health history.**

Built for the **Midnight Hackathon** (Integrate + AI + Mobile). ZeroMotion upgrades a conventional Web2 rehab-tracking app with one meaningful private feature: milestone progress is *proved*, not *uploaded*.

---

## 1. Problem → Solution

**FOR** a post-op knee-rehab patient
**WHO** must keep sharing intimate health data with clinicians, insurers, and apps to stay in their program
**WE** prove the recovery milestone was genuinely met
**WITHOUT REVEALING** the underlying questionnaire answers, sensor traces, or identity.

Remove Midnight and the value proposition breaks: the clinician would be back to reading raw patient data.

## 2. Demo

Preview: https://id-preview--6d2cbb24-089d-4016-85cd-20aefa817351.lovable.app

Run the demo in **two browser windows** (one normal, one private):

| Window | Role | Does |
| --- | --- | --- |
| A | Patient | Creates a local Recovery ID → 10-item KOOS → motion capture → generates ZK proofs |
| B | Clinician | Sees the verified claim + adherence, signs the milestone release |

Patient window then unlocks the Active Recovery Plan. That is the complete loop.

## 3. The core loop

```
USER ACTION            COMPACT PROOF                       VISIBLE OUTCOME
KOOS + capture   →   prove 0 ≤ KOOS ≤ 100                →  clinician sees
on device            prove session matches sensor hash      "Progress verified"
(never uploaded)     (witness stays local)                  → signs next phase
```

## 4. Architecture in one view

```
Browser (all health data lives here)
├── src/context/MidnightProvider.tsx  local-first journey state (localStorage)
├── src/lib/midnightService.ts        Compact circuit interface / proof stubs
│     proveQuestionnaireCompletion(koosScore)   → zkp_koos_…
│     proveMovementSession(sensorHash)          → zkp_emg_…
│     clinicianApproveMilestone(patientId)      → ledger tx
├── src/components/ZkProofOverlay.tsx proof-generation UX
└── src/routes/*                      questionnaire · capture · ai-translator ·
                                      clinician · active-plan
Midnight ledger  ←  proof + commitment + tx hash only
```

## 5. Why Midnight / what stays private

| Stays on device | Goes to the ledger |
| --- | --- |
| Item-level KOOS answers | `zkp_koos_…` proof + validity bit |
| EMG / IMU sensor stream | Sensor-log commitment hash |
| AI translator conversation | nothing |
| Patient identity + balances | Shielded Sigil address |

Selective disclosure: the patient chooses to reveal their name to their own clinician; the raw clinical data is never disclosed to anyone.

## 6. Build / run / test

```bash
bun install
bun run dev      # http://localhost:8080
bun run build    # production build
```

## 7. Limitations & next step

- The Compact circuits are represented by a typed stub layer (`src/lib/midnightService.ts`) with the exact call signatures the compiled contract exposes; proof timing and receipts are simulated.
- Next: compile the two circuits (`koos_range`, `session_commitment`) with `compactc`, wire the Lace wallet provider in place of the local key-pair, and publish to the Midnight local devnet.
