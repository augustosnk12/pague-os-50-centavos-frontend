# Pague os 50 centavos — Frontend

Mobile-first personal credit control app in Brazilian Portuguese. A lender registers, logs in via magic link, and tracks money owed by debtors through debts and installments.

**Backend repo:** [pague-os-50-centavos](https://github.com/augustosnk12/pague-os-50-centavos)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite + TypeScript 5 (strict) |
| Styling | Inline styles + OKLCH CSS custom properties (`src/styles/index.css`) |
| Routing | React Router v7 |
| Server state | TanStack Query v5 |
| HTTP | Axios |
| Auth storage | js-cookie (JWT) + localStorage (lender info) |
| Forms | React Hook Form + Zod (via backend validation) |

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:5174
```

Requires the backend running at `http://localhost:3000`. Copy `.env.example` to `.env` and adjust if needed.

---

## Project structure

```
src/
  api/              # Axios API calls per domain
  components/
    layout/         # AppLayout, Header, BottomTabs, AccountSheet
    shared/         # InstallmentRow, DebtCard, DebtorForm, MonthSwitcher, StatTile
    ui/             # Button, Input, Modal, Icon, Avatar, Badge, …
  constants/        # nav.ts (shared NAV array)
  contexts/         # AuthContext, ThemeContext, ToastContext
  hooks/            # TanStack Query hooks per domain + useCooldown
  lib/              # axios, utils, currency, validation, period, api (getApiError)
  pages/            # auth/, dashboard/, debtors/, debts/, installments/
  router/           # AppRouter, PrivateRoute
  styles/           # index.css (design tokens, keyframes, responsive classes)
  types/            # Installment, Debt, Debtor, Lender, Dashboard
```

---

## Auth flow

Magic-link only — no passwords.

1. `POST /auth/register` → confirmation email sent
2. User clicks email link → `GET /auth/confirm?token=` → backend redirects to `/login?confirmed=true`
3. `POST /auth/login` → login email sent
4. User clicks email link → `GET /auth/verify?token=` → backend redirects to `/auth/callback?accessToken=...`
5. `CallbackPage` stores JWT in cookie (`pague50_token`) + lender in localStorage → navigates to `/dashboard`

---

## Design tokens

All tokens in `src/styles/index.css`. Theme driven by two root variables:

- `--accent-h: 295` — hue angle (purple)
- `--accent-c: 0.20` — chroma

Light/dark switched via `data-theme="dark"` on `<html>`. Only `background` is transitioned on `body` to avoid a Chromium CSS variable freeze bug.

---

## Key conventions

- **Status derivation:** `deriveInstStatus()` in `src/lib/utils.ts` always computes status from `paidAt` + `dueDate` vs today — don't trust the API `status` field alone for display logic.
- **API errors:** use `getApiError(e)` from `src/lib/api.ts` + `translateApiError()` from `src/lib/utils.ts` for all `onError` handlers.
- **Currency input:** `parseCurrencyDigits` + `formatCents` from `src/lib/currency.ts` — store as integer centavos, display via `toLocaleString('pt-BR')`.
- **Animations:** translate-only (`ltRise`) — never opacity-from-0, which freezes in backgrounded tabs.
- **Protected routes:** wrapped in `<PrivateRoute>` + `<AppShell>` in `src/router/index.tsx`. Axios interceptor redirects to `/login` on 401.
