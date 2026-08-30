# Device wattages — verification procedure

This document is the **source of truth for how the device catalog gets its typical
values and their verification stamps**: `typicalVa` in
`src/catalog/appliance-presets.ts` and `typicalMcaA`/`typicalMocpA` in
`src/catalog/ac-presets.ts`. It mirrors PRICES.md: a written procedure, a
never-invent rule, per-entry provenance, and a shrinking known-gap list
(`KNOWN_UNVERIFIED_APPLIANCES` / `KNOWN_UNVERIFIED_AC` in
`packages/engine/test/wattage-verification.test.ts`).

## Policy

- **Never invent a wattage.** A `verifiedAt` stamp (ISO `YYYY-MM-DD`, the date of
  the research run) requires one of:
  - a **citable published spec sheet or manual** for a model actually sold in
    El Salvador (`source` = the URL), or
  - a **user-confirmed nameplate** (`source: 'placa — verificado por el usuario'`).
- "Typical" means representative of mainstream units in the Salvadoran market.
  Brands to check: **Cetron, Mabe, Whirlpool, Frigidaire, Oster, LG, Samsung**;
  A/C: **Comfee, Midea, TCL, Pioneer, Mirage**.
- Stamps are **replaced in place** on re-verification; git history is the audit trail.
- **Respect access declarations** (same rule as PRICES.md): if a manufacturer or
  retailer site refuses AI-agent access via robots.txt or content signals, do not
  work around it; record the miss in the run report and leave that entry to manual
  research.

### W vs VA

- **Resistive appliances** (ducha, termo, estufa, horno, plancha): nameplate W is
  taken as VA 1:1.
- **Motor / electronic loads** (bomba, refri, congelador, lavadora, micro, tv):
  prefer nameplate `A × V`; if only W is published, record the conversion in the
  ledger row.
- **Motors sized by the code itself**: where the NEC prescribes Table 430.248 FLC
  over nameplate (430.6(A)(1); motor loads enter the calc via 120.11), the table
  value is itself a citable source — stamp with the table reference. Research
  showing real nameplates BELOW the table value supports the stamp (the table is
  deliberately conservative); nameplates above it would be a finding to log.
- **A/C entries**: never use spec-sheet "cooling watts" (that is thermal output,
  not electrical draw). The appliance `ac-*` VA values are **derived**:
  `typicalVa ≈ (typicalMcaA ÷ 1.25) × 230 V`, rounded to 10 VA (440.4(B) rationale,
  see the appliance-presets.ts docblock; enforced by
  `packages/engine/test/properties.test.ts`). They are **derived-verified**: verify
  the MCA/MOCP preset against spec sheets, then stamp **both twins with the same
  date** (`wattage-verification.test.ts` enforces the lockstep; the appliance twin
  keeps `source: 'derivado de ac-presets.ts …'`).

### Changing a value is a separate, deliberate step

Verification runs that **confirm** current values only add stamps — they never touch
engine goldens. A run that finds a value materially off logs it under **Proposed
value changes** below and stops there. Applying a proposed change is its own commit
that updates `packages/engine/test/golden/load-calc.json` in step (goldens hard-code
preset-driven totals, e.g. ac-12k 1840 + bomba 1200 → 7795) and re-derives any
hand-computed case that names the old value.

## Ledger

Status: `por verificar` until a run stamps the entry. Values current as of 2026-08-30.

### appliance-presets.ts (typicalVa)

| id | VA | V | category | rationale / observed (2026-08-30 run) | candidate sources | status |
|---|---|---|---|---|---|---|
| ducha | 4,400 | 120 | fixed | observed 3,960–5,500 W across 6 models; the CA staples (Corona Gorducha, Thermoducha, Lorenzetti) cluster 5,400–5,500 W — 4,400 sits between the ~4,000 W economy models and that cluster | see proposal below | por verificar — hallazgo registrado |
| termo | 4,500 | 240 | fixed | 4,500 W is THE standard element (Camco 02583, Rheem XE40M06ST45U1 dual 4,500 W) | — | ✅ 2026-08-30 |
| estufa | 9,600 | 240 | range | US smooth-top spec sheets say 12–13 kW connected (Frigidaire FCRE306/GCRE306); LATAM coil-tops (Mabe EME7630) publish only surface watts (6,600 W), total unpublished | see proposal below | por verificar — hallazgo registrado |
| horno | 4,000 | 240 | range | observed 3.7–4.5 kW connected across 3 Frigidaire single ovens — 4.0 mid-cluster | — | ✅ 2026-08-30 |
| secadora | 5,000 | 240 | dryer | observed 5,400–5,600 W where published (GE GTD33 5,600 W/24 A; Whirlpool element 5,400 W); Samsung/LG publish only 30 A. 120.54's 5 kVA floor masks the gap only at exactly 5,000 | see proposal below | por verificar — hallazgo registrado |
| refri | 500 | 120 | covered | nameplate running current is LOW: Mabe manuals 1.1–1.32 A ≈ 125–150 VA (LG/Samsung don't publish amps); 500 VA carries defrost/start margin, and `covered` contributes 0 demand anyway | — | por verificar — hallazgo registrado |
| congelador | 500 | 120 | fixed | Mabe manuals: 0.85–1.5 A ≈ 100–175 VA (5–15 ft³); a Frigidaire retail listing says 5 A (secondary source) | see proposal below | por verificar — hallazgo registrado |
| micro | 1,200 | 120 | covered | observed INPUT 1,150–1,600 W (LG LMC0975 1,600 W/14 A; Samsung AME0114 1,600 W; AMW831K 1,150 W) — 1,000 W-output units draw ~1,600 W input | see proposal below | por verificar — hallazgo registrado |
| lavadora | 1,200 | 120 | covered | Mabe rates 6.0–8.0 A @ 110–127 V ≈ 720–1,016 VA; Whirlpool tech manual states 248/709 input W | see proposal below | por verificar — hallazgo registrado |
| lavaplatos | 1,200 | 120 | fixed | Frigidaire FFCD2413U: 10.0 A @ 120 V = 1,200 VA (connected load 1.44 kW, 15 A circuit) | — | ✅ 2026-08-30 |
| plancha | 1,200 | 120 | covered | remarkably uniform 1,200 W (Oster GCSTBS family manual; B+D IR1850/IRBD200) | — | ✅ 2026-08-30 |
| tv | 150 | 120 | covered | Samsung CU7000 max consumption: 43″ 130 W, 50″ 145 W, 55″ 150 W | — | ✅ 2026-08-30 |
| bomba | 1,200 | 120 | motor | NEC Tabla 430.248 FLC ½ HP 115 V = 9.8 A ≈ 1,176 VA (the code-mandated basis per 430.6(A)(1)/120.11); real nameplates run 3–5.5 A (Truper 4.7 A, Pretul 3 A, Pedrollo PKm 60 5.5 A) — table is conservative, as designed | — | ✅ 2026-08-30 (base de tabla NEC) |
| ac-9k / ac-12k / ac-18k / ac-24k | 1,290 / 1,840 / 2,580 / 3,130 | 240 | ac | **derived** from ac-presets MCA (rule above) — verify the MCA preset instead | — | ac-12k/ac-18k ✅ 2026-08-30 (lockstep); ac-9k/ac-24k pendientes |

### ac-presets.ts (typicalMcaA / typicalMocpA)

| id | MCA | MOCP | rationale / observed (2026-08-30 run) | candidate sources | status |
|---|---|---|---|---|---|
| ac-9k | 7 | 15 | observed MCA 9–13 A (Midea 9, Senville 10, TCL 10, Pioneer 13) — **7 A is below every published value**; MOCP 15 unanimous | see proposal below | por verificar — hallazgo registrado |
| ac-12k | 10 | 15 | observed MCA 9–13 A, MOCP 15 A across 5 models (Midea 9, TCL 10–11, Senville 12, Pioneer 13) — 10/15 squarely in range | — | ✅ 2026-08-30 |
| ac-18k | 14 | 20 | observed MCA 12–19 A, MOCP mode 20 A across 6 models (TCL 12–13/20, MrCool 15/20, Senville 15/20; Midea 17/25, Pioneer 19/30 higher) — 14/20 representative | — | ✅ 2026-08-30 |
| ac-24k | 17 | 25 | observed MCA 13–24.9 A; MOCP **dominant 30 A** (TCL 17/30, MrCool 18/30, Midea 20/30, Pioneer 22/30; only Senville pairs 24.9/25) — MCA 17 fine, MOCP 25 underrepresents | see proposal below | por verificar — hallazgo registrado |
| ac-36k | 24 | 40 | observed MCA 25–33 A (Midea/MrCool/Senville-AURA 25, Senville-LETO 33) — 24 just below the floor; MOCP 30–40 observed, median 35, 40 covers worst case | see proposal below | por verificar — hallazgo registrado |

Cross-check target (out of scope to merge): `src/catalog/presets.ts` carries
overlapping hand-derived values (`ducha-3500`/`ducha-4400` in W,
`estufa`/`secadora` in demand A). When a ledger row gets verified, eyeball those
for contradiction and note it here if found.

## Proposed value changes

Logged by the 2026-08-30 run — **not applied**; each needs a deliberate commit that
updates `golden/load-calc.json` in step, and ideally the user's nameplate check first.

| id | current | proposal | evidence |
|---|---|---|---|
| ducha | 4,400 VA | consider **5,400** | CA staples cluster 5,400–5,500 W (Corona Gorducha 5,500/5,400; Thermoducha 5,500; Lorenzetti Maxi 5,500); economy models 3,960–4,320 W exist, so 4,400 undersizes the common case |
| estufa | 9,600 VA | needs a LATAM total-connected figure | US smooth-tops publish 12–13 kW; Mabe coil-top totals unpublished (surface alone 6,600 W — oven elements could plausibly land near 9.6 kW, unconfirmed) |
| secadora | 5,000 VA | consider **5,400** | GE 5,600 W/24 A, Whirlpool element 5,400 W; at exactly 5,000 the 120.54 floor hides the difference |
| micro | 1,200 VA | consider **1,500** | 1,000 W-output units draw ~1,600 W input (LG/Samsung); only the 800 W-output class lands near 1,150 |
| congelador | 500 VA | consider **300** | Mabe nameplates 100–175 VA; Frigidaire retail «5 A» (600 VA) is the only high figure and is secondary |
| lavadora | 1,200 VA | consider **1,000** | Mabe 6–8 A @ 110–127 V ≈ 720–1,016 VA; Whirlpool input 248–709 W |
| ac-9k MCA | 7 A | propose **10 A** (MOCP 15 confirmed) | every published 9k MCA is 9–13 A; 7 A would undersize the derived VA too (1,290 → ~1,840) |
| ac-24k MOCP | 25 A | propose **30 A** (MCA 17 confirmed) | 30 A dominant across TCL/MrCool/Midea/Pioneer; only Senville pairs 24.9/25 |
| ac-36k | MCA 24 / MOCP 40 | propose **MCA 25 / MOCP 35** | observed MCA floor is 25 (3 of 4 models); MOCP median 35 (30/35/35/40) |

## Run reports

### 2026-08-30 run report

Three research passes (resistive/kitchen, motor/electronic, mini-split MCA/MOCP)
against published manufacturer spec sheets, manuals, and submittals (Lorenzetti,
Corona, Boccherini, Thermoducha, Rheem/Camco, Frigidaire, GE, Whirlpool, Mabe,
Oster, Black+Decker, Samsung, LG, Truper/Pretul, Pedrollo, Midea, TCL, Pioneer,
MrCool, Senville).

- **Stamped (8 appliance + 2 AC entries):** termo, horno, plancha, lavaplatos, tv,
  bomba (NEC-table basis), and the ac-12k/ac-18k twin pairs. Sets shrunk 17→9 and
  5→3.
- **Findings without a clean match:** logged above as proposed changes; no value
  was edited, goldens untouched.
- **Misses:** LG/Samsung refrigerator pages publish kWh, not rated amps; Comfee
  publishes no MCA/MOCP anywhere public; Mirage fichas list only running amperaje;
  AJ Madison served 403; Samsung/LG dryer sheets state «240 V / 30 A» without watts.
- **Compliance:** freundferreteria.com and sv.epaenlinea.com not fetched (AI
  opt-out); vidri.com.sv not fetched (challenge — no workaround attempted).

## Agent prompt (copy-paste verbatim to run a verification pass)

```text
Run a wattage verification pass on this repo. Read packages/data/WATTAGES.md and
follow it exactly. For each `por verificar` ledger row, research published spec
sheets (WebSearch/WebFetch) for models sold in El Salvador from the listed brands.
Stamp `verifiedAt` (today) + `source` in appliance-presets.ts / ac-presets.ts ONLY
where the published spec matches the current value within rounding; A/C entries:
verify the MCA preset and stamp both twins with the same date. Log mismatches under
"Proposed value changes" — do NOT edit any typicalVa/typicalMcaA value. Remove newly
stamped ids from KNOWN_UNVERIFIED_* in
packages/engine/test/wattage-verification.test.ts, update the ledger statuses, add a
dated run report, then run `pnpm -r test` and `pnpm -r typecheck` from the repo
root. Engine goldens must pass unchanged — a golden diff means a value was
accidentally edited.
```
