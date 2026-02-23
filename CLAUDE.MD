# Stock Market Analyzer

## Project Overview
A stock market analyzer that automatically identifies trends in stocks to generate buy/sell signals.

## Tech Stack
- **Frontend:** React (PWA architecture), using Tailwind CSS + shadcn/ui and anychart library for plotting ticker information
- **Backend:** Express.js
- **Database:** PostgreSQL + Sequelize ORM
- **Market Data:** EODHD API (eodhd.com), we might also use marketstack API (marketstack.com)
- **Monorepo:** JavaScript

## Repository Structure
```
/
├── frontend/     # React PWA
│   └── src/      # Source code for the frontend project
├── backend/      # Backend code w/ Express API, Sequelize Models, Services, etc
│   └── src/      # Source code for the backend
│   └── tests/
├── lib/          # Shared utilities, types, constants
├── CLAUDE.MD
└── package.json      # Root workspace config
```

## Project workflow
- All the data will be locally stored in our database, and served from there by the backend.
- Tickers can be individually imported by selecting them in the search ticker page (TBD). This import process should fetch all the information for that ticker for the last 3 years and store it in the database, using the `/eod` endpoint of the API
- A cron job will run every hour:
    + Using all the tracked tickers it will identify all the stock markets they belong to.
    + For each unique market, it will check if that stock market is already closed for the day.
    + If it has already closed, it will fetch ALL 100 most traded tickers of that day using the `/eod-bulk-last-day` endpoint of the API
- Each time a new datapoint is fetched from the API, whether if it comes from a ticker import or a daily update, the system will automatically run all available indicators (yet to be defined)

## Development Guidelines

### General
- Follow DRY (Don't Repeat Yourself) principles — shared logic goes in `packages/shared`
- Use **tabs** for indentation, never spaces
- Always use camel case in code files.
- PWA architecture must always be kept in mind when making frontend decisions

### Git & Delivery
- **Never commit or push changes** — only modify files; the developer handles all commits
- Always run all tests (old and new) before delivering any code
- Always run the linter before delivering any changes

### Backend
- Every backend function/module must have corresponding unit tests
- Tests live in a `tests` folder, replicating the same structure defined inside `src` folder.
- Database changes are always done via **Sequelize migration files** — never alter tables manually or via `sync()`
- Every migration must have a working `down()` method
- Always create/update the matching **Sequelize model** alongside any migration
- Migration filenames follow: `YYYYMMDDHHMMSS-<action>-<table>.js` (e.g. `20250101000001-create-exchanges.js`)
- Models live in `backend/src/models/`, one file per model, exported from `models/index.js`
- Associations are defined in `models/index.js` only

### Database Schema

#### `exchanges`
Stores stock exchange metadata, seeded from EODHD's exchange list.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| code | VARCHAR(20) UNIQUE | EODHD exchange code (e.g. `US`, `LSE`) |
| name | VARCHAR(255) | Human-readable name |
| operating_mic | VARCHAR(100) | ISO 10383 MIC(s) |
| country | VARCHAR(100) | |
| country_iso2 | CHAR(2) | |
| country_iso3 | CHAR(3) | |
| currency | CHAR(10) | Default exchange currency |
| close_utc | VARCHAR(5) | Market close time in UTC `HH:MM`. NULL for 24/7 or virtual markets |
| close_utc_winter | VARCHAR(5) | UTC close time during winter/standard time |
| close_utc_summer | VARCHAR(5) | UTC close time during summer/daylight saving time |

The `exchanges` table is pre-seeded in its migration with all 70 exchanges from the EODHD exchange list. The cron job uses `close_utc_winter` / `close_utc_summer` (selecting the right one based on current date) to determine whether a market has closed for the day.

#### `tickers`
Individual instruments being tracked. A ticker is always scoped to one exchange.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| symbol | VARCHAR(50) | Symbol without suffix (e.g. `AAPL`) |
| exchange_id | INTEGER FK | → exchanges.id |
| name | VARCHAR(255) | Company/instrument name |
| currency | CHAR(10) | Trading currency (may differ from exchange) |
| is_tracked | BOOLEAN | `true` = actively imported & updated |

EODHD symbol format: `{symbol}.{exchange.code}` (e.g. `AAPL.US`)
Unique constraint on `(symbol, exchange_id)`.

#### `eod_prices`
End-of-day OHLCV data from the EODHD `/eod` and `/eod-bulk-last-day` endpoints.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| ticker_id | INTEGER FK | → tickers.id |
| date | DATEONLY | Trading date `YYYY-MM-DD` |
| open | DECIMAL(15,4) | Raw (not adjusted) |
| high | DECIMAL(15,4) | Raw (not adjusted) |
| low | DECIMAL(15,4) | Raw (not adjusted) |
| close | DECIMAL(15,4) | Raw (not adjusted) |
| adjusted_close | DECIMAL(15,4) | Adjusted for splits & dividends |
| volume | BIGINT | Adjusted for splits |

Unique constraint on `(ticker_id, date)`.


## Key Commands

### Install dependencies
```bash
npm install
```

### Run backend (development)
```bash
npm run dev --workspace=backend
```

### Run frontend (development)
```bash
npm run dev --workspace=frontend
```

### Run all tests
```bash
npm test --workspaces
```

### Run linter
```bash
npm run lint --workspaces
```

### Run database migrations
```bash
npm run db:migrate --workspace=backend
```

### Undo last migration
```bash
npm run db:migrate:undo --workspace=backend
```

## Services

Services live in `backend/src/services/`. Each service is a plain module that exports async functions. They contain no Express or DB logic — only external integrations or business logic.

### `eodhd.js`
Wraps the EODHD REST API. Requires `EODHD_API_KEY` env var.

| Function | Description |
|---|---|
| `fetchTickerEod(symbol, exchange, from?, to?)` | Fetches EOD OHLCV data for a single ticker from `/eod/{symbol}.{exchange}`. Defaults to last 3 years if dates are omitted. |
| `fetchBulkLastDay(exchange)` | Fetches last-day EOD data for all tickers in a market from `/eod-bulk-last-day/{exchange}`. |

Both functions always request `fmt=json`. Errors (network, missing API key) are thrown and must be handled by the caller.

## External APIs
- **EODHD** (`eodhd.com`): Primary source for stock market data. API key stored in environment variable `EODHD_API_KEY`.
  - `GET /eod/{SYMBOL}.{EXCHANGE}?api_token=...&fmt=json&from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `GET /eod-bulk-last-day/{EXCHANGE}?api_token=...&fmt=json`

## Environment Variables
A single `.env` file at the **monorepo root** is the source of truth (never commit it).
Both the backend and Vite are configured to load from this file:
- Backend: `dotenv.config({ path: '../../.env' })` (relative to `backend/src/`)
- Frontend: `envDir: '..'` in `vite.config.js` (one level up from `frontend/`)

Copy `.env.example` → `.env` at the root and fill in all values:
```
EODHD_API_KEY=your_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/stocks
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id_here
JWT_SECRET=your_jwt_secret_here

# Frontend (Vite exposes vars prefixed with VITE_)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

## Authentication

Google-only auth using **frontend token verification** (no Passport).

### Auth flow
1. Frontend renders `<GoogleLogin>` button (`@react-oauth/google`)
2. User clicks → Google returns a signed **ID token** (`credential`)
3. Frontend POSTs `{ credential }` to `POST /api/auth/google`
4. Backend verifies with `google-auth-library`, extracts `sub` (googleId), `email`
5. Backend `findOrCreate` User by `googleId`; new users get `role = USER`
6. Backend signs its own JWT (`jsonwebtoken`) with `{ sub: userId, email, role }`, 7-day expiry
7. Frontend stores JWT in `localStorage`, attaches as `Authorization: Bearer <token>`
8. Protected routes use the `authenticate` middleware to verify JWTs

### `users` table

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| google_id | VARCHAR(255) UNIQUE | Google `sub` claim |
| email | VARCHAR(255) UNIQUE NOT NULL | From Google token |
| phone_number | VARCHAR(20) NULL | User-supplied later |
| role | ENUM('USER','ADMIN') | Default `USER` |
| created_at / updated_at | TIMESTAMP | Managed by Sequelize |

### Key files
- `backend/src/services/auth.js` — `verifyGoogleToken`, `findOrCreateUser`, `issueJwt`
- `backend/src/middleware/authenticate.js` — JWT Bearer middleware
- `backend/src/routes/auth.js` — `POST /api/auth/google`
- `frontend/src/context/AuthContext.jsx` — user state, login/logout, token persistence
- `frontend/src/pages/LoginPage.jsx` — Google Sign-In button
- `frontend/src/components/ProtectedRoute.jsx` — redirect to `/login` if unauthenticated

## Notes
> This file should be updated as new conventions, architectural decisions, or gotchas are discovered during development.