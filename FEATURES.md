# Feature Status Board

High-level view of where the product stands. **Convention: update this file whenever
a feature ships or changes state.** Statuses: 📋 planned · 🚧 in progress · ✅ shipped.

Scope and acceptance criteria for each feature live in [PRD.md](./PRD.md).

## Engine (calculation core)

| Feature | Status | Notes |
|---|---|---|
| Conductor ampacity + derating (310.16, 310.15, 110.14(C)) | ✅ shipped | 2026-08-15 · golden + property tests |
| Voltage drop + min-size-for-drop (Ch. 9 T8) | ✅ shipped | 2026-08-15 · DC-resistance method; AC impedance (T9) later |
| Standard breaker sizing (240.4, 240.6) | ✅ shipped | 2026-08-15 · incl. next-size-up + small-conductor caps |
| Circuit composer (load → conductor → breaker) | ✅ shipped | 2026-08-15 · `sizeCircuit`, mini-split scenario verified |
| Conduit fill (Ch. 9) | ✅ shipped | 2026-08-16 · golden + property tests; EMT / PVC Sch 40 / LFNC-B, nipple 60%, Note 7; bare EGC later (needs T8 area column) |
| Box fill (314.16) | 📋 planned | |
| Residential load calc (Art. 220) | 📋 planned | |
| Grounding (250.66, 250.122) | 🚧 in progress | 2026-08-16 · `egcSize` (T250.122) shipped for BOMs; 250.66 GEC + 250.122(B) upsizing later |
| Solar sizing (Art. 690 + panels/inverter/battery) | 📋 planned | |

## Data

| Feature | Status | Notes |
|---|---|---|
| NEC 2026 core tables (310.16, corrections, T8, 240.6) | ✅ shipped | 2026-08-15 · cross-verified vs published sources, 0 mismatches (official 2026 text paywalled; unchanged per change summaries) |
| NEC Ch. 9 Tables 1/4/5 + Table 250.122 | ✅ shipped | 2026-08-16 · cross-verified vs two independent sources each; verification caught + fixed a THW 14–8 AWG row-group error |
| Bilingual citation labels (en/es) | ✅ shipped | 2026-08-15 |
| Device catalog (wattages, synonyms, photos) | 📋 planned | |
| Glossary / regional terminology DB | 📋 planned | the moat |
| Job templates (5 seed jobs) | 📋 planned | |
| Price catalog (per-retailer, updatedAt-stamped) | 📋 planned | |

## Web app

| Feature | Status | Notes |
|---|---|---|
| Next.js PWA shell (Spanish-first, offline) | 🚧 in progress | 2026-08-16 · static-export shell live (Tailwind v4 + shadcn/ui, es-SV, imperial toggle); service worker/PWA later |
| Interactive calculators (live inputs, URL state) | 🚧 in progress | 2026-08-16 · calibre live: sliders, URL state, supuestos, citas por línea, gráfico caída-vs-distancia, modo «fijar calibre»; 4 calculators pending |
| Job flows → configurable priced BOM | 📋 planned | headline feature |
| Tooltips backed by glossary | 🚧 in progress | 2026-08-16 · seed mini-glossary (12 términos) in web; full DB (the moat) later |
| Memoria de cálculo (PDF) | 📋 planned | |

## Later ideas (build when needed)

Saved projects · NL job intake (LLM intent parser) · community contributions ·
AR app (AR measures, engine sizes) · motor circuits (Art. 430) · NEC-2008 dual citations
(El Salvador's legally adopted edition, per SIGET Acuerdo 294-E-2011).
