# LendTrack — Project Structure

Personal credit control app. A **lender** registers, logs in via magic link, and manages **debtors** (people who owe money). For each debtor, the lender creates **debts** that are automatically split into **installments**. The lender tracks which installments have been paid.

---

## Auth Flow

Magic-link only, no passwords.

1. `POST /auth/register` → account created, confirmation email sent
2. `GET /auth/confirm?token=...` → account confirmed
3. `POST /auth/login` → login email sent
4. `GET /auth/verify?token=...` → returns JWT `accessToken`

All protected routes require `Authorization: Bearer <accessToken>`.

---

## Data Models

### Lender (the logged-in user)
| Field | Type | Notes |
|---|---|---|
| id | string | cuid |
| email | string | unique |
| name | string \| null | |
| confirmed | boolean | must confirm via email before login |
| createdAt | Date | |

### Debtor
| Field | Type | Notes |
|---|---|---|
| id | string | cuid |
| name | string | unique per lender |
| email | string \| null | unique per lender when present |
| phone | string \| null | |
| notes | string \| null | free-text observations |
| lenderId | string | FK → Lender |
| createdAt | Date | |

### Debt
| Field | Type | Notes |
|---|---|---|
| id | string | cuid |
| description | string \| null | |
| type | `CASH` \| `CREDIT_CARD` \| `PIX` \| `PIX_INSTALLMENT` | |
| totalAmount | string (decimal) | e.g. `"1500.00"` |
| debtorId | string | FK → Debtor |
| createdAt | Date | |

### Installment
| Field | Type | Notes |
|---|---|---|
| id | string | cuid |
| number | number | 1-based index within the debt |
| amount | string (decimal) | installment #1 absorbs any rounding remainder |
| dueDate | Date | UTC |
| paidAt | Date \| null | set when marked as paid |
| status | `PENDING` \| `PAID` \| `OVERDUE` | |
| debtId | string | FK → Debt |

---

## API Endpoints

Base URL: `http://localhost:3000`

### Auth

#### `POST /auth/register`
Creates a new lender account and sends a confirmation email.

**Request body**
```json
{
  "email": "user@example.com",
  "name": "João Silva"
}
```
- `email`: required, valid email, max 254 chars
- `name`: required, min 1, max 100 chars

**Responses**
- `201` `{ "message": "Registration successful. Check your email." }`
- `400` `{ "error": "..." }` — validation error
- `409` `{ "error": "Email already registered" }`

---

#### `POST /auth/resend-confirmation`
Resends the confirmation email. Always returns 200 regardless of whether the email exists.

**Request body**
```json
{ "email": "user@example.com" }
```

**Response**
- `200` `{ "message": "If this account exists and isn't confirmed yet, you'll receive an email." }`

---

#### `GET /auth/confirm?token=<token>`
Confirms the account using the token from the email link.

**Responses**
- `200` `{ "message": "Account confirmed successfully." }`
- `400` `{ "error": "Invalid or expired token" | "Token expired" }`

---

#### `POST /auth/login`
Requests a login magic link email.

**Request body**
```json
{ "email": "user@example.com" }
```

**Responses**
- `200` `{ "message": "Login link sent. Check your email." }`
- `400` `{ "error": "Account not found" | "Account not confirmed" }`

---

#### `GET /auth/verify?token=<token>`
Verifies the login token and returns a JWT.

**Response `200`**
```json
{
  "accessToken": "<jwt>",
  "lender": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "João Silva"
  }
}
```
- `400` `{ "error": "Invalid or expired token" | "Token expired" }`

---

### Debtors
> All routes require `Authorization: Bearer <token>`

#### `GET /debtors`
Lists all debtors for the authenticated lender.

**Response `200`** — array of Debtor objects

---

#### `POST /debtors`
Creates a new debtor.

**Request body**
```json
{
  "name": "Maria Souza",
  "email": "maria@example.com",
  "phone": "+55 11 91234-5678",
  "notes": "Vizinha do bloco B"
}
```
- `name`: required, max 100 chars, unique per lender
- `email`: optional, valid email, max 254 chars, unique per lender when present
- `phone`: optional, max 20 chars
- `notes`: optional, max 500 chars

**Responses**
- `201` — Debtor object
- `409` `{ "error": "Debtor with this name already exists" | "Debtor with this email already exists" }`

---

#### `GET /debtors/:id`
Gets a single debtor by ID.

**Responses**
- `200` — Debtor object
- `404` `{ "error": "Debtor not found" }`

---

#### `PUT /debtors/:id`
Updates a debtor. All fields optional.

**Request body**
```json
{
  "name": "Maria S.",
  "email": null,
  "phone": null,
  "notes": "Atualizei o contato"
}
```

**Responses**
- `200` — updated Debtor object
- `404` `{ "error": "Debtor not found" }`
- `409` `{ "error": "Name already in use by another debtor" | "Email already in use by another debtor" }`

---

#### `DELETE /debtors/:id`
Deletes a debtor and all their debts/installments (cascade).

**Responses**
- `200` `{ "message": "Debtor deleted successfully." }`
- `404` `{ "error": "Debtor not found" }`

---

### Debts
> All routes require `Authorization: Bearer <token>`

#### `POST /debts`
Creates a debt and automatically generates installments.

**Request body**
```json
{
  "debtorId": "clx...",
  "type": "PIX_INSTALLMENT",
  "totalAmount": 1500.00,
  "numberOfInstallments": 3,
  "firstDueDate": "2026-06-01T00:00:00.000Z",
  "description": "Empréstimo junho"
}
```
- `type`: required — `CASH` | `CREDIT_CARD` | `PIX` | `PIX_INSTALLMENT`
- `totalAmount`: required, positive, max `99999999.99`
- `numberOfInstallments`: optional, default `1`, max `1000`
- `firstDueDate`: required, ISO 8601 datetime
- `debtorId`: required
- `description`: optional

**Response `201`**
```json
{
  "debt": { "id": "...", "type": "PIX_INSTALLMENT", "totalAmount": "1500.00", ... },
  "installments": [
    { "id": "...", "number": 1, "amount": "500.00", "dueDate": "...", "status": "PENDING" },
    { "id": "...", "number": 2, "amount": "500.00", "dueDate": "...", "status": "PENDING" },
    { "id": "...", "number": 3, "amount": "500.00", "dueDate": "...", "status": "PENDING" }
  ]
}
```
- `404` `{ "error": "Debtor not found" }`

---

#### `GET /debts/:id`
Gets a single debt by ID.

**Responses**
- `200` — Debt object
- `404` `{ "error": "Debt not found" }`

---

#### `PUT /debts/:id`
Updates description and/or type of a debt.

**Request body**
```json
{
  "description": "Empréstimo atualizado",
  "type": "CASH"
}
```

**Responses**
- `200` — updated Debt object
- `404` `{ "error": "Debt not found" }`

---

#### `DELETE /debts/:id`
Deletes a debt and all its installments (cascade).

**Responses**
- `200` `{ "message": "Debt deleted successfully." }`
- `404` `{ "error": "Debt not found" }`

---

### Installments
> All routes require `Authorization: Bearer <token>`

#### `GET /installments?period=<period>&date=<date>&debtorId=<id>`
Lists installments for a given period.

**Query params**
- `period`: required — `day` | `week` | `month`
- `date`: required — `YYYY-MM-DD` (any date within the desired period)
- `debtorId`: optional — filter by a specific debtor

**Period ranges**
- `day` → only the given date
- `week` → Monday–Sunday of the week containing `date`
- `month` → full calendar month of `date`

**Response `200`** — array of Installment objects

---

#### `PUT /installments/:id`
Marks an installment as paid.

**Responses**
- `200` — updated Installment object (status: `"PAID"`, paidAt set)
- `404` `{ "error": "Installment not found" }`
- `409` `{ "error": "Installment is already paid" }`

---

### Dashboard
> Requires `Authorization: Bearer <token>`

#### `GET /dashboard?month=<YYYY-MM>`
Financial summary for a calendar month.

**Response `200`**
```json
{
  "month": "2026-05",
  "totalExpected": "1500.00",
  "totalReceived": "900.00",
  "totalPending": "400.00",
  "totalOverdue": "200.00",
  "counts": {
    "paid": 3,
    "pending": 2,
    "overdue": 1,
    "total": 6
  }
}
```

---

## Key UI Flows

### Onboarding
1. Register form → email + name
2. "Check your email" confirmation screen
3. Confirm link opens app → account active
4. Login form → email only
5. "Check your email" screen
6. Magic link → logged in, JWT stored

### Main App
- **Dashboard** — monthly financial summary (totals + counts), period switcher
- **Debtors list** — searchable list of debtors with outstanding balance
- **Debtor detail** — debtor info + list of their debts and installments
- **Create debtor** — name (required), email, phone, notes
- **Create debt** — select debtor, type, amount, installments count, first due date, description
- **Installments view** — filter by day / week / month, mark as paid

### Status Colors
| Status | Meaning |
|---|---|
| `PENDING` | Due in the future, not yet paid |
| `PAID` | Paid (paidAt is set) |
| `OVERDUE` | Past due date, not paid |
