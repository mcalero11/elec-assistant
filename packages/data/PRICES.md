# Price catalog — reproducible research procedure

This document is the **source of truth for how `src/catalog/prices.json` gets its
numbers**. Seeding and every later refresh follow the same procedure, executed by an
AI agent (Claude Code subagent) or a human, so prices stay reproducible and auditable.

## Policy

- Currency: **USD** (El Salvador). One entry per `(itemId, retailer)` pair found.
- `updatedAt` = the date of the research run (`YYYY-MM-DD`), stamped on every entry
  written that run. Entries older than **60 days** render a staleness badge in the
  app — never blocked, never silently hidden (PRD US-2).
- **Never invent a price.** If an item cannot be found at a retailer, omit that
  entry and list the miss in the run report. If it is found nowhere, it stays
  unpriced (`sin precio` in the UI) and the coverage test
  (`packages/engine/test/catalog-coverage.test.ts`) will flag it.
- Entries are **replaced in place** on each run; git history is the price history.
- Prefer the **cheapest in-stock mainstream option** that matches the item spec.
  Exclude bundles, promos requiring membership, and clearly professional-line
  premium brands when a standard equivalent exists.
- `sourceUrl` = the product page used. Record the found product's name in `note`
  when it clarifies the unit conversion (e.g. «rollo 100 m ÷ 100»).

## Retailers

| id | Site | Access status (verified 2026-08-16 — recheck each run) |
|---|---|---|
| `vidri` | https://www.vidri.com.sv | ✅ robots.txt allows crawling. Browse `/catalogo/<id>/<slug>.html?page=N` (category listings render name, SKU, price, unit). Useful category ids: 201201 tubería, 201202 accesorios, 201904 térmicos, 201003/201103 alambre, 201205 poliducto, 250701 pegamento, 462003 dobladoras. **Dead**: `/busqueda/?q=` (404), `/search?term=`; `/producto/…` URLs 302 to the homepage for non-browser clients. |
| `freund` | https://freundferreteria.com | ⛔ **Opts out of AI access** — robots.txt disallows ClaudeBot/anthropic-ai sitewide plus `Content-Signal: ai-input=no`; enforced with HTTP 403. **Do not scrape.** Populate via manual research or an authorized arrangement only. |
| `epa` | https://sv.epaenlinea.com | ⛔ **Opts out of AI access** — robots.txt disallows ClaudeBot and `/catalogsearch/*`; enforced with HTTP 403. Same rule: manual/authorized sources only. |

**Respect access declarations.** If a retailer's robots.txt or content signals refuse
AI-agent access, the agent must not work around them (no spoofed user agents); record
the retailer as opted-out in the run report and leave its column to manual research.

## Known gaps and market notes (as of 2026-08-17)

Unpriced — listed in `KNOWN_UNPRICED` in `packages/engine/test/catalog-coverage.test.ts`
(that test forces the list to shrink the moment a price lands):

- `breaker-2p-25` — **not commercialized locally** (user-verified: stores carry 20 A
  and 30 A only). Kept in the catalog because it is the code-correct output for
  MOCP-25 nameplates; treat as special order.
- `lfnc-connector-12` — effectively unavailable (user searches return water-hose
  fittings; Vidrí delisted the ½″; the ¾″ is still sold).

Market adaptations recorded 2026-08-17 from the user's manual research:

- **A/C disconnect = «caja térmica» NEMA 3R.** Dedicated pull-out disconnects are
  not sold locally; a 2-space NEMA 3R breaker enclosure next to the unit is the
  disconnecting means. `disconnect-60-3r` was renamed accordingly and priced at
  Freund (Eaton BR24L70RP, $36.00) and Vidrí (JF Products 2 espacios 100 A, $29.95).
- **No pre-made A/C whips.** The flexible run to the condenser is assembled on site
  from poliducto + wire; the template's whip rule now emits ~2 m of `lfnc-12`
  instead of a kit item (`ac-whip-12` was removed from the catalog).
- `breaker-2p-30` now has a second retailer (Freund THQL, $17.95), so the
  cheapest-basket comparison is live for that line.

Other transcription notes: Vidrí's EMT sticks are **aluminum, 3.00 m** (galvanized
out of stock), and poliducto is sold **per yard** (converted to per-meter in the
entries, divisor recorded in `note`). Manual entries carry
`note: "… entrada manual (verificado por el usuario)"` and no `sourceUrl`.

## Unit normalization

| Catalog `unit` | Rule |
|---|---|
| `m` | Normalize to price **per meter**. Wire is often sold per meter and per 100 m roll (cheaper) — record the **per-meter** counter price; if only rolls exist, divide roll price by roll meters and say so in `note`. |
| `tramo-3m` | Price **per 10-ft (3.05 m) stick** as sold. Do not convert to meters. |
| `unidad` | Price per piece / kit as sold. |

## Item research table

Search terms are es-SV retail vocabulary; try the first term, then alternates.

| itemId | Search terms |
|---|---|
| breaker-2p-15 … breaker-2p-40 | «breaker 2 polos 15A» · «térmico 2 polos» · «flipón doble» (match the amperage; enchufable tipo CH/BR — record which in note) |
| thhn-cu-14 / -12 / -10 / -8 / -6 | «alambre thhn 14» etc. · «cable eléctrico #14» (cobre, por metro) |
| emt-tube-12 / emt-tube-34 | «tubo emt 1/2» / «tubo emt 3/4» (tramo de 10 pies) |
| emt-connector-12 / -34 | «conector emt 1/2» (de tornillo) |
| emt-coupling-12 / -34 | «unión emt 1/2» · «copla emt» |
| emt-elbow-12 / -34 | «curva emt 1/2» · «codo emt» |
| pvc-tube-12 / -34 | «tubo pvc eléctrico 1/2» · «tubo conduit pvc» (cédula 40, gris, 10 pies) |
| pvc-elbow-12 / -34 | «curva pvc eléctrica 1/2» · «codo pvc conduit» |
| pvc-adapter-12 / -34 | «adaptador terminal pvc 1/2» |
| pvc-cement | «pegamento pvc» (bote pequeño ~1/8 galón) |
| lfnc-12 / lfnc-34 | «manguera flexible eléctrica 1/2» · «poliducto 1/2» · «tubo flexible pvc» (por metro) |
| lfnc-connector-12 / -34 | «conector para manguera flexible 1/2» |
| strap-12 / strap-34 | «abrazadera emt 1/2» · «grapa para tubo 1/2» |
| disconnect-60-3r | «caja de seguridad aire acondicionado» · «disconnect 60 amp» · «desconectador a/c» (60 A, NEMA 3R, sin fusibles) |
| ac-whip-12 | «whip para aire acondicionado» · «kit conexión aire acondicionado» (1/2" × 6 pies) |
| bender-12 | «dobladora de tubo emt 1/2» · «grifa» |

## Output contract

Write `src/catalog/prices.json` in exactly this shape (it is runtime-validated by
`src/index.ts` — bad retailer ids, non-positive prices, or malformed dates throw at
load):

```json
{
  "note": "…keep the existing note…",
  "entries": [
    {
      "itemId": "emt-tube-12",
      "retailer": "vidri",
      "priceUsd": 3.85,
      "updatedAt": "2026-08-16",
      "sourceUrl": "https://www.vidri.com.sv/producto/…",
      "note": "Tubo conduit EMT 1/2 x 10'"
    }
  ]
}
```

After writing, run `pnpm -r test` from the repo root: the catalog-coverage test
must go green (every BOM-reachable item has ≥1 entry) and the data typecheck
validates the file shape.

## Run report

End every run with a summary: entries written per retailer, items found at fewer
than 2 retailers, items found nowhere, search patterns that no longer work, and any
price that changed by more than 30% since the previous run (from git diff).

## Agent prompt (copy-paste verbatim to re-run)

```text
Refresh the price catalog of this repo. Read packages/data/PRICES.md and follow it
exactly — it defines the retailers, search terms, unit normalization, output
contract, and the never-invent-a-price rule. Today's date is the updatedAt for
every entry you write. Research every item in the item research table using
WebSearch/WebFetch against vidri.com.sv, freundferreteria.com and sv.epaenlinea.com
(fall back to site:-restricted web search when a site search is unusable). Then
rewrite packages/data/src/catalog/prices.json per the output contract, run
`pnpm -r test` from the repo root, fix any shape errors it reports, and finish with
the run report described in PRICES.md.
```
