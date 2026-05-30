# Project context for Claude

## What this is

Frontend for "Pague os 50 centavos" — a personal credit control app in pt-BR. A lender manages debtors, creates debts that auto-split into installments, and marks installments as paid. Companion backend is at `I:\dev-things\pague-os-50-centavos` (Fastify 4 + Prisma + PostgreSQL).

## Running locally

```bash
# Frontend
npm run dev        # http://localhost:5174

# Backend (separate terminal)
# in I:\dev-things\pague-os-50-centavos
npm run dev        # http://localhost:3000
```

## Stack

React 19 + Vite + TypeScript 5 strict, React Router v7, TanStack Query v5, Axios, js-cookie. No CSS framework — inline styles + OKLCH CSS custom properties in `src/styles/index.css`.

## Key architectural decisions

- **JWT** stored in cookie `pague50_token` via `src/lib/cookies.ts`. Lender info in localStorage. Never JWT in localStorage.
- **Status** is always re-derived client-side via `deriveInstStatus()` in `src/lib/utils.ts` — the API's `status` field can lag (e.g. PENDING items past due date). All display and sorting uses the derived value.
- **`getApiError(e)`** in `src/lib/api.ts` extracts the error string from Axios errors. **`translateApiError(msg, fallback)`** in `src/lib/utils.ts` maps English backend messages to Portuguese. Use both in every `onError` handler.
- **Currency input** (`src/lib/currency.ts`): store as integer centavos (`amountCents` state), display via `formatCents`, parse input via `parseCurrencyDigits`. Avoids float precision issues.
- **Cooldowns** (`src/hooks/useCooldown.ts`): persists expiry in localStorage so the countdown survives page refresh. Pass a unique `storageKey`.
- **Animations**: translate-only (`ltRise`). Never opacity-from-0 — it freezes content in backgrounded/throttled tabs (Chromium bug). Only `background` is transitioned on `body` (not `color`) for the same reason.
- **OKLCH hue in `calc()`** must be unitless: `calc(var(--accent-h) + 25)` not `+ 25deg`.

## Navigation structure

- **Mobile (< 880px):** fixed `BottomTabs` — Painel | Devedores | [raised +] | Parcelas | Conta. "Conta" opens `AccountSheet` (theme + logout).
- **Desktop (≥ 880px):** `BottomTabs` hidden. `Header` shows inline nav + "Nova cobrança" button + `UserMenu` dropdown (user info + theme + logout).
- Shared `NAV` constant in `src/constants/nav.ts`.

## Auth flow (magic link)

```
Register → /login?confirmed=true
Login email → backend GET /auth/verify → 302 /auth/callback?accessToken=...
CallbackPage → stores JWT + lender → navigate /dashboard
```

`AccountSheet` (mobile) and `UserMenu` dropdown (desktop) both handle theme toggle + logout.

## Backend notes

- Fastify 4.x — use `@fastify/cors@9` (v10+ requires Fastify 5).
- `reply.redirect(url)` not `reply.redirect(302, url)` (deprecated).
- Zod schemas in `src/interface/http/schemas/` — AND AJV JSON schemas on routes. Both must allow `null` for optional fields (use `type: ['string', 'null']` in JSON schema, `.nullable()` in Zod).
- `InstallmentEnriched` debtor is nested at `inst.debt.debtor.name` — not `inst.debtor.name`.
- Backend runs on port 3000. Frontend on port 5174.

## File locations for common tasks

| Task | File |
|---|---|
| Add/change API error translation | `src/lib/utils.ts` → `API_ERROR_MAP` |
| Change theme colors | `src/styles/index.css` → `--accent-h`, `--accent-c` |
| Add a nav route | `src/constants/nav.ts` + `src/router/index.tsx` |
| Add an icon | `src/components/ui/Icon.tsx` → `ICONS` map |
| Change installment status logic | `src/lib/utils.ts` → `deriveInstStatus` |
| Add a new page | `src/pages/`, register in `src/router/index.tsx` |
| Add a new API hook | `src/hooks/`, call `src/api/` |

## Prototype

`prototype/` has the original HTML/Babel design reference. Not production code — used only as visual/interaction spec. Run with `npx serve prototype` then open `LendTrack.html`.
