# elec-assistant

Spanish-first, NEC-based electrical assistant for electricians and apprentices in
El Salvador: interactive calculators, job-based purchase lists, and solar sizing.

- **[PRD.md](./PRD.md)** — product requirements (source of truth)
- **[FEATURES.md](./FEATURES.md)** — high-level feature status board

## Structure

pnpm workspace:

- `packages/engine` — pure TypeScript NEC calculation engine (no framework, no I/O)
- `packages/data` — versioned NEC value tables, citations, and (later) device
  catalog / glossary / job templates / price catalog
- `packages/web` — (later) Next.js PWA

## Develop

```sh
pnpm install
pnpm typecheck
pnpm test
```

> Results are calculation aids, not a substitute for a licensed electrician or
> inspection. NEC table values are transcribed for computation with article
> citations only; verify against an official NFPA 70 copy.
