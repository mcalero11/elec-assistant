# elec-assistant

Spanish-first, NEC-based electrical assistant for electricians and apprentices in
El Salvador: interactive calculators, job-based purchase lists, and solar sizing.

- **[PRD.md](./PRD.md)** — product requirements (source of truth)
- **[FEATURES.md](./FEATURES.md)** — high-level feature status board

## Structure

pnpm workspace:

- `packages/engine` — pure TypeScript NEC calculation engine (no framework, no I/O),
  including the declarative job-template interpreter (`runTemplate`)
- `packages/data` — versioned NEC value tables, citations, item/device catalogs,
  job templates, and the price catalog (refreshed per
  [packages/data/PRICES.md](./packages/data/PRICES.md))
- `packages/web` — Next.js App Router PWA shell (static export, Tailwind v4 +
  shadcn/ui, Spanish-first): interactive calculators and job flows

## Develop

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build            # static export → packages/web/out/
pnpm --filter @elec-assistant/web dev
```

> Results are calculation aids, not a substitute for a licensed electrician or
> inspection. NEC table values are transcribed for computation with article
> citations only; verify against an official NFPA 70 copy.
