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
| Box fill (314.16) | ✅ shipped | 2026-08-28 · golden + property tests; check + size modes, (B)(1)–(B)(5) incl. EGC quarter rule; Tables 314.16(A)/(B)(1) cross-verified vs two NFPA-licensed reprints |
| Residential load calc (Art. 120, ex-220) | ✅ shipped | 2026-08-28 · both methods (standard + optional 120.82) with per-line bilingual breakdowns, golden + property tests; NEC 2026 moved load calcs to new Art. 120 with 22 VA/m² lighting + 8 kVA optional tier (cross-verified) |
| Grounding (250.66, 250.122) | ✅ shipped | 2026-08-28 · `egcSize` (250.122 + (B)/(D) proportional upsizing) and `gecSize` (Table 250.66 + 250.66(A) rod cap, cross-verified vs zing2/dakotaprep/expertce/ELR) both golden-tested |
| Solar sizing (Art. 690 + panels/inverter/battery) | 📋 planned | |

## Data

| Feature | Status | Notes |
|---|---|---|
| NEC 2026 core tables (310.16, corrections, T8, 240.6) | ✅ shipped | 2026-08-15 · cross-verified vs published sources, 0 mismatches (official 2026 text paywalled; unchanged per change summaries) |
| NEC Ch. 9 Tables 1/4/5 + Table 250.122 | ✅ shipped | 2026-08-16 · cross-verified vs two independent sources each; verification caught + fixed a THW 14–8 AWG row-group error |
| Bilingual citation labels (en/es) | ✅ shipped | 2026-08-15 · 2026-08-17: + plain-language reasons (`reasonEs/reasonEn`, `citationReason()`) for beginner-facing chips |
| Device catalog (wattages, synonyms, photos) | 🚧 in progress | 2026-08-28 · AC nameplate presets (5, MCA/MOCP) + 17 appliance wattage presets (es-SV synonyms, Art. 120 categories, typical values pending user verification); photos later |
| Glossary / regional terminology DB | 🚧 in progress | 2026-08-17 · 36 entries in data (definición + sinónimos es-SV + inglés + artículos NEC), CI coverage lint; photos + growth toward ~100 terms pending — the moat |
| Job templates (5 seed jobs) | ✅ shipped | 2026-08-28 · 5/5 (PRD launch scope): aire mini-split (4 fixtures), ducha/calentador (3), tomacorriente 240 V (3), tomas/iluminación (3), alimentador a bodega (3: caso de caída larga con EGC subido por 250.122(B), toggle Cu/Al, GEC + 2 varillas por 250.32/250.66); todas con goldens a mano + sweep de alcanzabilidad en CI; precios de ítems nuevos pendientes (Vidrí cerró acceso — PRICES.md) |
| Price catalog (per-retailer, updatedAt-stamped) | 🚧 in progress | 2026-08-28 · 33 entries: 30 Vidrí (reproducible run) + 3 manual Freund/Vidrí (user-verified); ~45 ítems nuevos de plantillas 2–5 en `KNOWN_UNPRICED` (Vidrí ahora sirve challenge de Cloudflare a clientes no-navegador); cheapest-basket live on dual-priced lines |
| Price crawler (Playwright headful, multi-agent) | 📋 planned | 2026-08-28 · later this phase: rerun the reproducible PRICES.md procedure driving a REAL browser (Playwright headful) at human pace, optionally parallelized across agents, since plain HTTP clients now get challenged; scoped to retailers whose robots.txt permits crawling (Vidrí) — Freund/EPA declare an explicit AI opt-out (`ai-input=no`) and stay manual per the PRICES.md policy |

## Web app

| Feature | Status | Notes |
|---|---|---|
| Next.js PWA shell (Spanish-first, offline) | ✅ shipped | 2026-08-17 · installable offline PWA: content-hashed precache service worker (all routes + assets), manifest + maskable icons, query-string-aware navigation fallback — success criterion 4 |
| Mission-control panel (app shell + dashboard) | ✅ shipped | 2026-08-17 · sidebar nav + breadcrumb + dark-default theme toggle (print stays light); home = status strip (real package data), module launchers, quick-launch chips; blue/amber technical palette, Geist Mono numerals, WCAG AA both themes |
| Interactive calculators (live inputs, URL state) | ✅ shipped | 2026-08-28 · 5/5 live: calibre (sliders, gráfico, «fijar calibre»), relleno de tubería (mín/verificar, niple, Nota 7), tierra (T250.122 + 250.122(B)), cajas (mín/verificar, desglose), carga (métodos estándar y opcional lado a lado, aparatos con presets, encadena a calibre) |
| Job flows → configurable priced BOM | ✅ shipped | 2026-08-28 · schema-driven `TemplateRunner` renders any template (widgets, URL keys, defaults y disabled desde el schema; back-compat de URLs viejas con test); headline: «aire» → 4 preguntas → parámetros citados + BOM con precios re-cotizado en vivo |
| Tooltips backed by glossary | ✅ shipped | 2026-08-17 · Term ids compile-time checked against the data glossary; popovers (tap-friendly on mobile) show definición, sinónimos, inglés y artículos NEC; coverage CI-enforced (success criterion 5 v1); auto-linking (`GlossaryText`) wraps terms in labels/BOM/supuestos |
| Beginner-readable provenance (chips + supuestos) | ✅ shipped | 2026-08-17 · citation chips lead with the plain-Spanish reason («ajuste por agrupamiento»), full NEC cite on tap; correction/adjustment tables cited only when their factor ≠ 1; assumption prose rewritten plain with structured `citations` chips |
| Glossary page (`/glosario`) | ✅ shipped | 2026-08-17 · searchable by término/sinónimo es-SV/inglés, NEC chips per entry; linked from sidebar |
| Memoria de cálculo (PDF) | 🚧 in progress | 2026-08-16 · «Exportar PDF» print-stylesheet on the job flow; full memoria document later |

## Infrastructure

| Feature | Status | Notes |
|---|---|---|
| Homelab deployment (nec.mcalero.dev) | ✅ shipped | 2026-08-30 · CI builds linux/arm64 nginx image → public GHCR on main merges; box release = `apps/nec/deploy.sh` in homelab-infrastructure (pull + up); SW-safe cache headers; Cloudflare-proxied, LE cert at origin |

## Later ideas (build when needed)

Saved projects · recent calculations on the panel (localStorage `ea-recent`, cap 8) ·
NL job intake (LLM intent parser) · community contributions ·
AR app (AR measures, engine sizes) · motor circuits (Art. 430) · NEC-2008 dual citations
(El Salvador's legally adopted edition, per SIGET Acuerdo 294-E-2011).
