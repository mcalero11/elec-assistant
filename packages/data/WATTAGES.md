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

| id | VA | V | category | rationale for current value | candidate sources | status |
|---|---|---|---|---|---|---|
| ducha | 4,400 | 120 | fixed | mainstream 120 V shower heads (Lorenzetti/Corona/Boccherini class) cluster at 4,200–4,600 W | manufacturer spec pages; retailer listings naming W | por verificar |
| termo | 4,500 | 240 | fixed | standard tank heating element is 4,500 W | Whirlpool/Rheem spec sheets | por verificar |
| estufa | 9,600 | 240 | range | typical 30″ electric range nameplate ≈ 9.6 kW | Mabe/Whirlpool/Frigidaire spec sheets | por verificar |
| horno | 4,000 | 240 | range | wall ovens cluster 3.4–4.8 kW | Mabe/Whirlpool spec sheets | por verificar |
| secadora | 5,000 | 240 | dryer | electric dryers 5.0–5.6 kW; 120.54 floor is 5 kVA anyway | Whirlpool/LG/Samsung spec sheets | por verificar |
| refri | 500 | 120 | covered | nameplate rated current ~2–4 A × 120 V | Mabe/LG/Samsung spec sheets (rated A) | por verificar |
| congelador | 500 | 120 | fixed | chest freezers similar compressor class to refri | Frigidaire/Mabe spec sheets | por verificar |
| micro | 1,200 | 120 | covered | countertop input power 1.0–1.5 kW (input, not cooking W) | Oster/Whirlpool/LG spec sheets | por verificar |
| lavadora | 1,200 | 120 | covered | washer motor + controls; nameplate A × 120 V | Mabe/LG/Samsung spec sheets | por verificar |
| lavaplatos | 1,200 | 120 | fixed | dishwasher with heater 1.2–1.5 kW | Whirlpool/Frigidaire spec sheets | por verificar |
| plancha | 1,200 | 120 | covered | household irons 1,100–1,400 W | Oster/Black+Decker spec sheets | por verificar |
| tv | 150 | 120 | covered | mid-size LED TV 100–200 W | LG/Samsung spec sheets | por verificar |
| bomba | 1,200 | 120 | motor | ½ HP motor ≈ 9.8 A × 120 V ≈ 1,180 VA | Truper/Pedrollo/Foset pump spec sheets | por verificar |
| ac-9k / ac-12k / ac-18k / ac-24k | 1,290 / 1,840 / 2,580 / 3,130 | 240 | ac | **derived** from ac-presets MCA (rule above) — verify the MCA preset instead | — | por verificar (lockstep) |

### ac-presets.ts (typicalMcaA / typicalMocpA)

| id | MCA | MOCP | rationale for current value | candidate sources | status |
|---|---|---|---|---|---|
| ac-9k | 7 | 15 | 9k BTU inverter units cluster MCA 6–8 A | Comfee/Midea/TCL/Pioneer submittal sheets | por verificar |
| ac-12k | 10 | 15 | 12k inverter units cluster MCA 9–11 A | same | por verificar |
| ac-18k | 14 | 20 | 18k inverter units cluster MCA 13–16 A | same | por verificar |
| ac-24k | 17 | 25 | 24k inverter units cluster MCA 16–19 A | same | por verificar |
| ac-36k | 24 | 40 | 36k inverter units cluster MCA 22–26 A | same | por verificar |

Cross-check target (out of scope to merge): `src/catalog/presets.ts` carries
overlapping hand-derived values (`ducha-3500`/`ducha-4400` in W,
`estufa`/`secadora` in demand A). When a ledger row gets verified, eyeball those
for contradiction and note it here if found.

## Proposed value changes

_None yet. A verification run that finds a mismatch logs it here (id, current
value, found value, source, affected goldens) instead of editing data._

## Run reports

_None yet._

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
