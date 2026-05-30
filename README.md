# Handoff: Pague os 50 centavos — Personal Credit Control App

## Overview
A mobile-first, responsive web app where a **lender** tracks money owed to them. The lender manages **debtors**, records **debts** (which auto-split into **installments**), and marks installments as paid. The home screen is built around one priority: *seeing what's owed to you right now*. Language: **Brazilian Portuguese (pt-BR)**. Auth is **magic-link only** (no passwords).

This is the same app described in `PROJECT_STRUCTURE.md` (originally code-named "LendTrack"); the product/display name is **"Pague os 50 centavos"**.

---

## About the Design Files
The files in `prototype/` are **design references created in HTML/React-via-Babel** — runnable prototypes that show the intended look, layout, copy, and behavior. **They are not production code to copy verbatim.**

The prototype loads React + Babel from a CDN and uses a global-`window` component pattern with inline JSX (`<script type="text/babel">`). That pattern exists only so the design runs in a single static file. **Your task is to recreate these designs in your real codebase** using your established stack (a normal React app with a bundler, your component conventions, your routing, your data-fetching layer), wiring the screens to the live API at `http://localhost:3000`.

Treat the prototype as the source of truth for **visuals + interaction**, and `PROJECT_STRUCTURE.md` as the source of truth for **API contracts**.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, shadows, animations, and copy are all intentional. Recreate the UI faithfully. Exact tokens are listed below and defined in `prototype/app/theme.css`.

---

## Tech notes for re-implementation
- **Framework:** Build with your normal React toolchain (Vite/Next/CRA). Drop the Babel-in-browser and `Object.assign(window, …)` exports — convert each `app/*.jsx` file into proper ES modules with `import`/`export`.
- **Styling:** The prototype uses plain inline styles + one CSS file of **CSS custom properties** (`theme.css`). The token system is framework-agnostic — keep `theme.css` (or port the tokens to your styling solution: CSS Modules, Tailwind theme, styled-components, etc.). Light/dark is driven by `data-theme="light|dark"` on `<html>`.
- **Icons:** All icons are inline SVG line glyphs defined in `app/ui.jsx` (`ICONS` map, Lucide-style paths). You can keep them or swap for your icon library (Lucide matches 1:1).
- **Fonts:** **Manrope** (Google Fonts), weights 400–800. Fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- **Money & dates:** `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`; dates formatted manually in `app/data.jsx` (`fmtDate`, `monthKey`, etc.). All dates are handled in **UTC** to match the API.
- **"Today" anchor:** the prototype hardcodes `TODAY = 2026-05-29` (in `app/data.jsx`) so seeded data looks live. In production use `new Date()`.
- **Status is derived, not stored:** `instStatus(inst)` computes `PAID | OVERDUE | PENDING` from `paidAt` + `dueDate` vs. today. The API also returns a `status` field — prefer the API's value, but the derivation logic is a useful fallback/cross-check.

---

## Design Tokens
All defined in `prototype/app/theme.css`. Colors use **OKLCH**. `--accent-h` (hue) and `--accent-c` (chroma) parameterize the whole purple system; `--radius` scales all corners.

### Brand / accent (default "Roxo")
- `--accent-h: 295`, `--accent-c: 0.20`
- Primary (light): `oklch(0.52 0.20 295)` ≈ `#7C3BE0`-ish violet
- Primary (dark): `oklch(0.66 0.19 295)` (brighter)
- Primary hover (light): `oklch(0.47 0.20 295)`

### Light theme
| Token | Value |
|---|---|
| `--bg` | `oklch(0.985 0.006 295)` (warm near-white) |
| `--surface` | `#ffffff` |
| `--surface-2` | `oklch(0.975 0.008 295)` |
| `--border` | `oklch(0.91 0.012 295)` |
| `--border-strong` | `oklch(0.85 0.015 295)` |
| `--text` | `oklch(0.22 0.025 295)` (near-black) |
| `--text-muted` | `oklch(0.52 0.02 295)` |
| `--text-faint` | `oklch(0.66 0.018 295)` |

### Dark theme (`[data-theme="dark"]`)
| Token | Value |
|---|---|
| `--bg` | `oklch(0.155 0.018 295)` (purple-tinted black) |
| `--surface` | `oklch(0.195 0.022 295)` |
| `--surface-2` | `oklch(0.23 0.026 295)` |
| `--border` | `oklch(0.30 0.025 295)` |
| `--text` | `oklch(0.96 0.008 295)` |
| `--text-muted` | `oklch(0.72 0.02 295)` |

### Status colors (semantic — keep across themes)
| Status | Meaning | Light color | Light bg ("weak") |
|---|---|---|---|
| `PAID` (Pago) | paid | `oklch(0.58 0.13 150)` green | `oklch(0.95 0.05 150)` |
| `PENDING` (Pendente) | due in future | `oklch(0.68 0.13 75)` amber | `oklch(0.95 0.06 75)` |
| `OVERDUE` (Atrasado) | past due, unpaid | `oklch(0.58 0.19 25)` red | `oklch(0.95 0.05 25)` |

(Dark variants brighten the foreground to ~0.7 L and darken the weak bg to ~0.33 L — see `theme.css`.)

### Radius
`--radius: 18px` (default "Suave"). Tweakable presets: Suave 18 / Médio 12 / Reto 6. Cards use `var(--radius)`; buttons/inputs use `calc(var(--radius) * 0.6–0.66)`; chips/pills use `99px`.

### Shadows
- `--shadow-sm`: subtle 1–3px, used on cards/rows at rest
- `--shadow-md`: 4–12px, card hover
- `--shadow-lg`: 18–40px, sheets/dialogs/drawer
- `--shadow-primary`: `0 8px 20px oklch(0.52 0.20 295 / 0.32)` — purple glow on primary buttons & the hero

### Typography scale (px)
- Page H1: 25 / weight 800 / letter-spacing −0.03em
- Section H2: 18 / 800 / −0.02em
- Card title: 15–16 / 800
- Body: 14–15 / 500–600
- Small/muted: 12.5–13.5
- Hero amount: 46 (integer), 22 (R$ symbol)
- Inputs: 16 (prevents iOS zoom)
- **Minimum text size: 12px.** Tap targets ≥ 44px (icon buttons are 42px, primary buttons taller).

### Animation
- Entrance reveals are **translate-only** (`ltRise`, ~0.4–0.45s, `cubic-bezier(0.22,1,0.36,1)`), staggered by `index*0.04s` on lists. *(Deliberately not opacity-based — see "Gotchas".)*
- Sheets: `ltScaleIn` (scale+fade up). Toast: `ltPop`. Drawer: `ltSlideInLeft`.
- Theme transition: `background 0.3s` on `body` only.

---

## Screens / Views

### 1. Auth (`app/auth.jsx`)
Single component with internal step state: `login → login-sent`, `register → register-sent`. Magic-link email is **simulated**: the "sent" screens render a dashed "📨 Simulação do e-mail" card with a button that stands in for clicking the real email link. **In production, remove the simulation card** and let the real email + deep link drive `GET /auth/confirm` and `GET /auth/verify`.

- **Layout:** centered card (max-width 400) on a `--bg` field with two soft radial purple glows (top-right, bottom-left). Logo above the card.
- **Login:** title "Bem-vindo de volta", email field, primary "Enviar link de acesso" → `POST /auth/login`. Link to register.
- **Register:** "Criar sua conta", name + email fields → `POST /auth/register`. Link to login.
- **Sent screens:** mail glyph in a circle, "Confirme seu e-mail" / "Link de acesso enviado", the email-address echoed, simulation button, "Reenviar" (`POST /auth/resend-confirmation`) + "Voltar".
- **Validation:** name required; email via regex `^[^@\s]+@[^@\s]+\.[^@\s]+$`. Errors render under the field in `--overdue`.
- **On success:** store JWT (`accessToken`) + lender; route to Dashboard. (Prototype persists to `localStorage` keys `lt-lender`, `lt-theme`.)

### 2. App shell (`app/shell.jsx`)
Navigation is **bottom tab bar** on mobile (the chosen default), with a hamburger/drawer kept as an alternate (toggleable via the `nav` Tweak). Production recommendation: **ship the bottom tabs** — with only 3 top-level destinations, visible one-tap nav in the thumb zone beats a hidden drawer.
- **BottomTabs** (mobile, fixed bottom, blurred `--surface`, hidden >= 880px): 5 balanced slots — **Painel | Devedores | [raised "+"] | Parcelas | Conta**. The center "+" is a raised circular primary button (Nova cobranca). Parcelas carries the red overdue-count badge. "Conta" opens the **AccountSheet**. Respect `env(safe-area-inset-bottom)`.
- **AccountSheet** (bottom sheet): lender card (avatar, name, email) + theme toggle + "Sair" (logout). Holds the secondary items that don't deserve a tab.
- **TopBar** (sticky, blurred `--bg`): logo "Pague os 50 centavos" (-> dashboard) · inline desktop nav (shown >= 880px) · spacer · desktop-only "Nova cobranca" button · theme toggle (sun/moon) · bell with a red **overdue-count badge** (-> Parcelas). In drawer-mode it also shows a hamburger on the left (mobile only).
- **Drawer** (alternate, left slide-in, <= 290px): logo + close · lender card · nav (Painel / Devedores / Parcelas) · "Nova cobranca" button · footer: theme toggle + "Sair". Only mounted when `nav = "Menu lateral"`.
- **FAB**: floating "+" bottom-right — only used in drawer-mode (in tabs-mode the bar's center "+" replaces it). Hidden >= 880px.
- **Page**: centered container, `max-width 680` (or `1080` "wide" for the dashboard), `padding 20px 16px 100px` (the 100px bottom clears the fixed tab bar + raised button).
- **Nav model:** prototype uses local route state (`dashboard | debtors | debtor-detail | installments | new-debt`). Map these to your router's routes. `Conta` and `Nova cobranca` are overlays, not stored destinations.

### 3. Dashboard / Painel (`app/dashboard.jsx`) — `GET /dashboard?month=YYYY-MM`
- **Greeting row:** "Olá, {firstName} 👋" + month switcher (‹ Mai 2026 ›).
- **HERO card (the priority):** purple gradient (`linear-gradient(135deg, var(--primary), oklch(0.42 0.2 calc(var(--accent-h) + 25)))`), white text, two decorative circles. Shows **"Total a receber agora"** = sum of all non-paid installments across all months, then two sub-stats: **Atrasado** (sum overdue) and **A vencer** (sum pending). Hero amount is large (46px).
- **Month summary card:** "{Month} de {year}" + "{n}% recebido", a green progress bar (`recebido / esperado`), and the two totals.
- **Stat tiles** (grid, `repeat(auto-fit, minmax(150px,1fr))`): Recebido / Pendente / Atrasado — each an icon chip + count (`n×`) + amount, colored per status. Wire to `dashboard.counts` + totals.
- **"Precisa de atenção" list:** up to 6 non-paid installments, **overdue first**, then by due date. Uses the shared `InstallmentRow`. Header has "Ver tudo" → Parcelas.

### 4. Debtors list / Devedores (`app/debtors.jsx`) — `GET /debtors`
- **Header:** "Devedores", subtitle "{n} pessoas · {total} a receber".
- **Search:** pill input filtering by name (client-side here; API has no search param).
- **Rows** (sorted: most overdue first, then highest outstanding): avatar (deterministic hue from name) · name + "{n} atrasada(s)" badge if overdue · secondary line (notes/email/phone) · paid-progress bar · right side: "deve {outstanding}" (red if overdue) **or** "✓ Quitado" + chevron.
- **Outstanding** = sum of that debtor's non-paid installments. **paidRatio** = paid count / total count.
- Tap → Debtor detail. Empty state with "Adicionar devedor".

### 5. Debtor detail (`app/debtors.jsx` → `DebtorDetail`) — `GET /debtors/:id`, `GET /debts/:id`
- **Header:** name, back arrow, edit (pencil) + delete (trash) icon buttons.
- **Summary card:** big avatar · "Saldo devedor" amount (red if overdue, green if zero) · "{paid} de {total} parcelas pagas" · progress bar · contact lines (phone with a green "Lembrar" WhatsApp action, email, notes).
- **Dívidas:** "Nova dívida" button + list of **DebtCard**s (one per debt).
  - **DebtCard** (collapsible): type icon · description (or type label) · "{type} · {n}× · {paid}/{n} pagas" · total + "{remaining} restam" or "Quitada" · chevron. A small red dot marks debts with overdue installments. Progress bar (red if any overdue, else green). Expanding reveals each installment row (number chip, amount, "Vence {date}" / "Pago em {date}", and a **Pago** button or **Pago** badge).
- **Edit / delete** use the `DebtorForm` sheet and a confirm sheet → `PUT /debtors/:id` (edit), `DELETE /debtors/:id` (cascades debts + installments; show the destructive confirm).

### 6. Create debtor — `DebtorForm` sheet (`app/debtors.jsx`) — `POST /debtors` / `PUT /debtors/:id`
Bottom sheet (mobile) / centered dialog (≥ 560px). Fields: **Nome** (required, unique per lender), E-mail (optional, unique when present), Telefone (optional), Observações (textarea, optional). Footer: Cancelar / Adicionar(Salvar). Handle `409` (duplicate name/email) inline.

### 7. Create debt / Nova cobrança (`app/debts.jsx` → `NewDebt`) — `POST /debts`
Full page (can be a route or a sheet). Fields:
- **Devedor** (select; "Novo" button opens DebtorForm) — `debtorId`.
- **Tipo** (2×2 grid of selectable cards): `CASH` (Dinheiro) · `PIX` (Pix) · `CREDIT_CARD` (Cartão de crédito) · `PIX_INSTALLMENT` (Pix parcelado). Only `CREDIT_CARD` and `PIX_INSTALLMENT` show the **Parcelas** field; others are single-installment.
- **Valor total** (R$ prefix, decimal), **Parcelas** (int, when applicable), **Primeiro vencimento** (date), **Descrição** (optional).
- **Live "Prévia das parcelas":** client-side preview mirroring the backend split — `genInstallments(total, count, firstDueISO)`: equal cents per installment, **installment #1 absorbs the rounding remainder**; due dates step by **calendar month** from the first due date. Shows up to 12 rows then "+ N parcelas".
- Submit → `POST /debts` with `{ debtorId, type, totalAmount, numberOfInstallments, firstDueDate (ISO 8601), description }`; on `201` go to that debtor's detail and toast. Handle `404` (debtor not found).

### 8. Installments view / Parcelas (`app/debts.jsx` → `InstallmentsView`) — `GET /installments?period=&date=&debtorId=`
- **Period segmented control:** Dia / Semana / Mês (maps to `period=day|week|month`). Week = Monday–Sunday containing `date`.
- **Date navigator:** ‹ {period label} › with "{total} a receber" subtitle; arrows shift by day/week/month and update `date` (`YYYY-MM-DD`).
- **Status filter chips:** Todas / Atrasadas / Pendentes / Pagas (with counts). Client-side filter over the period's results.
- **Rows:** shared `InstallmentRow`.

### Shared: `InstallmentRow` (`app/dashboard.jsx`)
Left status-colored 4px border · avatar (→ debtor) · debtor name + "Parcela {n}" · context line ("Vence em N dias · {date}" / "Atrasado há N dias" / "Vence hoje" / "Pago em {date}"; debt description prefixed) · amount · **Pago** button (`paid` variant if overdue, `soft` if pending) **or** Pago badge. Mark-paid → `PUT /installments/:id` (handle `409` "already paid").

---

## Interactions & Behavior
- **Mark as paid:** optimistic update sets `paidAt = now`, status flips to PAID, toast "Parcela marcada como paga". Call `PUT /installments/:id`; on `409` reconcile.
- **Navigation:** top nav + drawer + FAB + in-content links ("Ver tudo", row taps, "Nova dívida"). Scroll resets to top on route change.
- **Sheets/dialogs:** Esc to close, backdrop click to close, body scroll locked while open; bottom-sheet on mobile, centered dialog ≥ 560px.
- **Theme toggle:** flips `data-theme` on `<html>`, persisted.
- **Toasts:** auto-dismiss ~2.2s, status-colored icon.
- **Responsive:** single column on mobile; dashboard tiles/hero widen on desktop; inline top-nav appears ≥ 880px and the FAB hides; content max-width keeps line lengths readable.

## State Management
Prototype keeps everything in React state at the app root (`app/main.jsx`): `theme`, `lender` (+JWT), `store` (`debtors`, `debts`, `installments`), `route` + `selDebtor` + `newDebtPreset`, `drawer`, `debtorForm {open, editing}`, `confirmDel`, `mKey` (dashboard month), `toast`.

In production replace `store` with server data:
- **Auth:** persist `accessToken`; send `Authorization: Bearer <token>` on all protected routes; redirect to login on 401.
- **Data fetching:** the selectors in `app/data.jsx` (`dashboard`, `installmentsForPeriod`, `debtsByDebtor`, `debtorOutstanding`, etc.) document exactly what each screen needs — back them with real GET calls (React Query/SWR recommended). Mutations: create/update/delete debtor, create/delete debt, mark installment paid → invalidate the relevant queries.
- Drop `localStorage` seeding; keep `localStorage` only for theme + token if desired.

## API mapping (summary)
| Screen | Endpoint(s) |
|---|---|
| Login / Register / Sent | `POST /auth/login`, `POST /auth/register`, `POST /auth/resend-confirmation`, `GET /auth/confirm`, `GET /auth/verify` |
| Dashboard | `GET /dashboard?month=YYYY-MM` |
| Devedores | `GET /debtors` |
| Debtor detail | `GET /debtors/:id`, debts via `GET /debts/:id` (or include on debtor) |
| Create/Edit debtor | `POST /debtors`, `PUT /debtors/:id`, `DELETE /debtors/:id` |
| Nova cobrança | `POST /debts` |
| Parcelas / mark paid | `GET /installments?period=&date=&debtorId=`, `PUT /installments/:id` |

Full request/response shapes, validation rules, and status codes are in `PROJECT_STRUCTURE.md`.

## Assets
- **No image assets.** All icons are inline SVG (`ICONS` in `app/ui.jsx`). Avatars are generated (initials + name-derived OKLCH hue). The logo mark is a rounded square with a wallet glyph.
- **Font:** Manrope via Google Fonts (`<link>` in `LendTrack.html`).
- Emoji used in copy: 👋 (greeting), 📨 (email simulation label) — purely decorative.

## Gotchas (learned while building — keep these)
1. **Entrance animations must be translate-only, not opacity-based.** Opacity-from-0 reveals can stay invisible if the document is backgrounded/throttled (animations pause at frame 0). All reveals use `translateY` and rest visible.
2. **Don't `transition: color` on `<body>` when the color comes from a CSS variable.** Changing the variable (theme toggle) freezes the inherited color at the old value in Chromium. Only `background` is transitioned on body.
3. **OKLCH hue in `calc()` must stay unitless** when added to the unitless `--accent-h` (e.g. `calc(var(--accent-h) + 25)`, not `+ 25deg`) — mixing number and `deg` invalidates the value and silently breaks gradients/avatars.

## Files
- `prototype/LendTrack.html` — entry point (loads fonts, React/Babel, all scripts; responsive media queries inline).
- `prototype/app/theme.css` — all design tokens, themes, keyframes.
- `prototype/app/data.jsx` — seed data, formatters, **selectors that mirror the API** (read this to know what each screen consumes).
- `prototype/app/ui.jsx` — primitives: `Icon`, `Button`, `IconButton`, `StatusBadge`, `TypeChip`, `Money`, `Field`, `Avatar`, `Card`, `Sheet`, `Toast`, `Progress`, `Empty`.
- `prototype/app/auth.jsx` — auth flow + `Logo`.
- `prototype/app/shell.jsx` — `TopBar`, `BottomTabs`, `AccountSheet`, `Drawer`, `FAB`, `Page`, `PageHeader`.
- `prototype/app/dashboard.jsx` — `Dashboard`, `InstallmentRow`, `MonthSwitcher`.
- `prototype/app/debtors.jsx` — `DebtorsList`, `DebtorDetail`, `DebtCard`, `DebtorForm`.
- `prototype/app/debts.jsx` — `NewDebt` (+ `genInstallments`), `InstallmentsView`.
- `prototype/app/main.jsx` — app root, state, mutations, routing, Tweaks wiring.
- `prototype/app/tweaks-panel.jsx` — design-tweak panel (accent/radius/font); **not needed in production**.
- `PROJECT_STRUCTURE.md` — the API spec (data models, endpoints, flows).

### Running the prototype locally
It's a static site, but browsers block `fetch`/module loads from `file://`. Serve the `prototype/` folder over HTTP, e.g. `npx serve prototype` or `python3 -m http.server` from inside `prototype/`, then open `LendTrack.html`.
