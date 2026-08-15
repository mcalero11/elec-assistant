# PRD — Elec Assistant

> Working title. Naming ideas: **CalcEléctrico**, **Ohmio**, **ElectriCalc SV**.
> Status: ready-to-ship draft — 2026-08-15
> Author: Marvin Calero · Stack: Next.js + TypeScript

---

## 1. Executive Summary

**Problem Statement.** Electricians and apprentices in El Salvador size wires,
breakers, and conduit by rule of thumb, in English-only tools that don't match local
component names, don't cite the code, and can't turn a job ("instalar un aire
acondicionado") into a concrete, priced purchase list.

**Proposed Solution.** A Spanish-first, offline-capable web app with two faces over
one deterministic NEC calculation engine: (a) interactive calculators where every
number can be played with live, and (b) job flows that turn a selected or typed job
into an exact, configurable bill of materials with local prices.

**Success Criteria** (first release = the author uses it end-to-end):

1. A real AC installation is planned start-to-finish in the app (job flow →
   parameters → BOM → PDF), and every sizing result (AWG, breaker, conduit size)
   matches an independent manual NEC calculation exactly.
2. Engine golden-test suite: ≥ 50 cases taken from published worked examples
   (Mike Holt / Ugly's style), 100% passing in CI.
3. Interactivity: any input change re-renders results in < 100 ms on a mid-range
   phone; no "calculate" button anywhere.
4. Offline: with network disabled, all calculators and job flows remain fully
   functional (installable PWA; only live price refresh and irradiance lookup degrade).
5. Terminology coverage: 100% of technical terms rendered in the UI have a glossary
   entry backing their tooltip (enforced by a lint/CI check).

---

## 2. User Experience & Functionality

### User Personas

| Persona | Description | Primary need |
|---|---|---|
| **The Author** (first user) | Software engineer learning residential electrical work | Plan real installations correctly without knowing every device name |
| **Apprentice** («aprendiz») | Learning the trade, Spanish-speaking, mobile-first | Fast calcs with the *why* (code citations, tooltips) |
| **Working electrician** | Quotes and installs residential jobs in El Salvador | Job → purchase list → client-ready quote PDF, quickly |

### Core UX principles

- **Everything fits together.** One device catalog and one glossary power all
  autocompletes and tooltips; calculators chain (load calc → service size; solar
  array current → wire sizing → conduit fill) carrying their assumptions along.
- **Play with the numbers.** Every calculator input is a live control (slider,
  stepper, or field with drag-to-adjust). Results, charts, and BOMs update
  instantly. Calculator state is URL-encoded so a configuration can be shared or
  bookmarked.
- **Never blocked by a name.** Every technical term has a tooltip: plain-Spanish
  definition, regional synonyms (breaker → «térmico», «flipón», «dado»; flexible
  conduit → «poliducto»), English name, and a photo.
- **Spanish-first (es-SV)**, metric-first (meters, °C) with imperial toggle; AWG
  sizes as used locally. i18n scaffolding from day one.

### User Stories & Acceptance Criteria

**US-1 — Job flow to purchase list (headline feature)**
*As an electrician, I want to select or type a job like «instalar un aire
acondicionado» and get the exact purchase list and parameters, so that I can buy
materials and install without manual calculation.*

- Typing in the job search matches templates via fuzzy search over names **and
  regional synonyms** («aire», «AC», «minisplit» all resolve to the same template).
- The template asks only job-relevant questions with sensible defaults: BTU/tonnage
  (→ MCA/MOCP from typical nameplate presets or manual entry), one-way run length in
  meters, indoor/outdoor routing, panel space available.
- **Every method choice is configurable and re-priced live**, minimum set:
  - Conduit type: EMT vs PVC vs flexible («poliducto» / LFNC), per NEC suitability
    for the location (outdoors → wet-location rules applied automatically)
  - Bends: purchase factory elbows («curvas») **vs** field-bend with a bender
    (removes elbows from BOM, adds bender as optional one-time tool line)
  - Conductor material Cu/Al where permitted; cable-in-conduit vs cable assembly
    where the NEC allows
- Output = **parameters** (conductor AWG, breaker size, disconnect rating, conduit
  diameter, voltage drop % at the given distance, each with its NEC citation) +
  **BOM** (exact items with catalog names, quantities in meters/units, wastage
  allowance shown and editable).
- Changing any option (e.g., EMT → poliducto, 12 m → 20 m) updates parameters and
  BOM in < 100 ms with no page reload.
- Launch templates (seed set, extensible by data files, not code):
  1. Aire acondicionado mini-split (240 V circuit + disconnect + whip)
  2. Circuito para ducha eléctrica / calentador
  3. Alimentador a construcción separada (bodega/anexo) — the long-run voltage-drop case
  4. Tomacorriente 240 V para estufa/secadora
  5. Circuito de tomacorrientes o iluminación adicional

**US-2 — Priced BOM (full price catalog)**
*As an electrician, I want the purchase list priced with local retailer data so that
I can quote a client immediately.*

- Price catalog covers every item referenced by the seed templates, per retailer
  (initial: Vidrí, Freund, EPA — extensible), in USD.
- Every price displays its `updatedAt` date; prices older than 60 days render with a
  visible staleness badge — never silently.
- Any price is overridable per-quote by the user; overrides are marked as such on
  the PDF and win over catalog values.
- BOM shows per-retailer totals and a cheapest-basket suggestion; catalog data ships
  as versioned JSON updatable without an app release.

**US-3 — Interactive calculators**
*As an apprentice, I want to adjust load, distance, and temperature and watch the
required AWG and voltage drop change live, so that I build intuition for the code.*

- Calculators (each: live inputs, NEC citations on every output line, «supuestos»
  panel listing every default used):
  1. **Calibre de conductor** — ampacity with insulation type, ambient-temperature
     and bundling derating, terminal ratings *(NEC 310.16, 310.15, 110.14(C))*
  2. **Caída de tensión** — distance/current/Cu-Al/1φ-3φ; ≤3% branch, ≤5% total
     targets; outputs minimum AWG for the run, with a live distance-vs-drop chart
  3. **Protección** — breaker sizing, standard sizes, next-size-up rule
     *(NEC 240.4, 240.6)*
  4. **Relleno de tubería** — conduit fill for EMT/PVC/flexible *(NEC Ch. 9)*
  5. **Relleno de cajas** — box fill *(NEC 314.16)*
  6. **Cálculo de carga residencial** — standard and optional methods → service
     size, built on the device catalog *(NEC Art. 220)*
  7. **Puesta a tierra** — GEC and EGC sizing *(NEC 250.66, 250.122)*
- Crossing a code limit (e.g., voltage drop > 3%) flags visibly at the moment the
  slider crosses it, with the citation.
- Each calculator can hand its result to the next (e.g., "usar estos conductores en
  relleno de tubería").

**US-4 — Solar module**
*As an electrician, I want to size a PV system for a house — how many panels, which
devices, how much backup time — so that I can design and quote solar jobs.*

- Inputs: monthly kWh from the utility bill **or** device-by-device load builder
  from the catalog; grid-tied / off-grid / hybrid; peak sun hours (El Salvador
  default ≈ 5.3 h, manual override; live per-location irradiance via NASA POWER /
  PVWatts when online, cached for offline).
- Outputs: array kW and **panel count** for a chosen panel wattage; inverter sizing
  (continuous + surge); battery bank for a chosen autonomy («horas de respaldo»)
  with DoD and chemistry presets (LiFePO4/AGM); MPPT controller sizing; **DC/AC
  conductors and protection through the same engine** applying NEC Art. 690 (125%
  continuous-current rule, disconnects); optional payback estimate clearly marked
  «solo estimación».
- Solar results feed the same BOM/pricing pipeline as job flows.

**US-5 — Dictionary & tooltips**
*As a user who doesn't know the "correct" name of a component, I want to search by
any regional name and learn as I go.*

- Searchable dictionary: English name ↔ formal Spanish ↔ regional synonyms
  (es-SV primary), photo, one-line definition, related NEC articles.
- Every autocomplete matches against all synonyms; every technical term in the UI
  is a tooltip backed by the same entries (100% coverage, CI-enforced).

**US-6 — Memoria de cálculo (PDF)**
*As an electrician, I want a printable calculation memo and quote so that I can hand
it to a client or inspector.*

- One-click PDF from any job flow or calculator chain: inputs, assumptions, results
  with NEC citations, BOM with prices (+ override markers), disclaimer text, date.

### Non-Goals (protecting scope)

- **No backend, no accounts** — static/serverless PWA; build a backend only when a
  concrete need appears (sync, community contributions).
- **No LLM in any calculation or recommendation path** — job matching is
  deterministic fuzzy search over templates + synonyms. (NL parsing may be explored
  later; see Roadmap.)
- **No NEC text reproduction** — computed values and article citations only (NFPA
  copyright).
- **No multi-country code support yet** — NEC / El Salvador practice only; data
  layer stays edition- and region-tagged to keep the door open. Primary edition:
  **NEC 2026** (latest, published October 2025) — user decision 2026-08-15.
  Legal note: El Salvador formally enforces **NEC 2008** (Spanish edition),
  adopted by reference via SIGET Acuerdo No. 294-E-2011 and still current as of
  2026; NEC-2008 dual citations can be added later if inspection compatibility
  requires it (see Risks).
- **No AR app yet** — but the engine stays UI-agnostic because of it.
- **No industrial/motor circuits (Art. 430)** in the first release.
- **Not a substitute for a licensed electrician or inspection** — every output
  carries «verificar por electricista autorizado» framing.

---

## 3. AI System Requirements

**Deliberately none in the product's calculation path.** All sizing and BOM logic is
deterministic (pure functions over versioned NEC tables) so results are auditable,
testable, and citable. If natural-language job intake ("quiero llevar luz al fondo
del patio") is added later, it will be an LLM **intent parser only** — mapping free
text to an existing template + parameters, never producing numbers — evaluated
against a benchmark of ≥ 100 real phrasings with ≥ 95% correct template resolution
before shipping.

---

## 4. Technical Specifications

### Architecture Overview

Monorepo, three packages:

```
packages/
  engine/   Pure TypeScript, framework-free. Calculation functions only.
            No I/O, no React. Consumed later by AR app / API unchanged.
  data/     Versioned JSON: NEC tables (edition-tagged, values + citation keys),
            device catalog (wattages, synonyms, photos), glossary,
            job templates, price catalog (per-retailer, updatedAt-stamped).
  web/      Next.js (App Router, static export) + TypeScript. PWA with
            service worker; all calcs client-side; calculator state in URL params.
```

Data flow: UI event → engine function(inputs, data tables) → typed result
(values + citation keys + assumptions) → rendered result / BOM / PDF. Job templates
are data, not code: a template declares its questions, its engine-call graph, and
its BOM assembly rules, so new jobs ship as JSON.

### Integration Points

- **NASA POWER / NREL PVWatts** (free, no auth): solar irradiance by coordinates;
  fetched online, cached in IndexedDB for offline use. App fully functional without it.
- **Price catalog updates**: fetched as static JSON from the app's own hosting
  (no API server); falls back to the bundled snapshot offline.
- No auth, no database, no third-party analytics in the first release.

### Security & Privacy

- No accounts, no PII collected or transmitted; all user inputs stay client-side
  (URL state and IndexedDB only).
- PDFs generated client-side.
- Legal posture: NFPA copyright discipline (values + citations, audited before any
  public sharing); visible disclaimer on every output and PDF: results are
  estimates to be verified by a licensed electrician and subject to inspection
  («sujeto a inspección; verificar por electricista autorizado»). Solar payback is
  additionally marked «solo estimación».

### Quality & Testing

- **Golden tests**: every engine function validated against published worked
  examples; ≥ 50 cases at launch, growing with each new table/template. 100% pass
  required in CI.
- **Property tests**: monotonicity checks (longer distance never yields thinner
  wire; higher load never yields smaller breaker).
- **Template tests**: each job template has at least 2 fixture configurations with
  hand-verified expected BOMs.
- **Coverage lint**: CI fails if a UI term lacks a glossary entry or a BOM item
  lacks a price-catalog entry.

---

## 5. Risks & Roadmap

### Technical & Product Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Price catalog staleness** (chosen scope: full catalog) | Wrong quotes erode trust | `updatedAt` on every price, visible staleness badges at 60 days, per-quote manual overrides, catalog updatable without app release; scope catalog strictly to items the templates reference |
| Incorrect calculation shipped | Safety + credibility | Golden/property tests, NEC citations on every output, manual verification as the launch gate (Success Criterion 1) |
| NFPA copyright | Legal | Values + citations only; audit before sharing publicly |
| Terminology/synonym data doesn't exist anywhere | The moat is expensive to build | Start with the ~100 terms the seed templates need; grow opportunistically; design for community contribution later |
| Template scope creep | Never shipping | Ship with the 5 seed templates only; new templates are JSON, added after launch |
| App targets NEC 2026 while El Salvador legally enforces NEC 2008 (SIGET Acuerdo 294-E-2011) | Recommendations may exceed/conflict with what local inspection expects | Edition-tagged tables and citations; add NEC-2008 dual citations if needed; confirm practice with a local electrician before public sharing |

### Roadmap — build it when we need it (no version numbers by design)

- **Now (first release):** the 7 calculators, 5 job templates with configurable
  priced BOMs, solar module, dictionary + tooltips, PDF memos, offline PWA.
  Done when the Success Criteria in §1 are met.
- **Next (pull-based, in whatever order real use demands):** saved projects (a
  house = many circuits + a solar system), more job templates, irradiance API
  polish, price-catalog update tooling, motor circuits (Art. 430).
- **Later (ideas, not commitments):** NL job intake (LLM intent parser per §3),
  community dictionary/price contributions (this is what finally justifies a
  backend), AR mobile app — place panels and conduit runs on the real site, AR
  measures the path, the same engine sizes it.
