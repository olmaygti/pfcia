# Stock Market Analyzer — Project Notes for Claude

## Project Overview
A stock market analyzer that automatically identifies trends in stocks to generate buy/sell signals.

## Tech Stack
- **Frontend:** React (PWA architecture), using Tailwind CSS + shadcn/ui and anychart library for plotting ticker information
- **Backend:** Express.js
- **Database:** PostgreSQL + Sequelize ORM
- **Message broker:** RabbitMQ (via `amqplib`)
- **Market Data:** EODHD API (eodhd.com), we might also use marketstack API (marketstack.com)
- **Monorepo:** JavaScript

## Repository Structure
```
/
├── frontend/     # React PWA
│   └── src/      # Source code for the frontend project
├── backend/      # Backend code w/ Express API, Sequelize Models, Services, etc
│   ├── src/      # Source code for the backend
│   └── tests/
├── lib/          # Shared utilities, types, constants
├── CLAUDE.md
└── package.json  # Root workspace config
```

## Project Workflow
- All the data will be locally stored in our database, and served from there by the backend.
- Tickers can be individually imported by selecting them in the search ticker page (TBD). This import process should fetch all the information for that ticker for the last 3 years and store it in the database, using the `/eod` endpoint of the API.
- A cron job will run every hour:
    + Using all the tracked tickers it will identify all the stock markets they belong to.
    + For each unique market, it will check if that stock market is already closed for the day.
    + If it has already closed, it will fetch ALL 100 most traded tickers of that day using the `/eod-bulk-last-day` endpoint of the API.
- Each time a new datapoint is fetched from the API, whether if it comes from a ticker import or a daily update, the system will automatically run all available indicators (yet to be defined).

## Development Guidelines

### General
- Follow DRY (Don't Repeat Yourself) principles — shared logic goes in `packages/shared`
- Use **tabs** for indentation, never spaces
- Always use camel case in code files
- PWA architecture must always be kept in mind when making frontend decisions

### Git & Delivery
- **Never commit or push changes** — only modify files; the developer handles all commits
- Always run all tests (old and new) before delivering any code
- Always run the linter before delivering any changes

### Backend
- Every backend function/module must have corresponding unit tests
- Tests live in a `tests` folder, replicating the same structure defined inside `src` folder
- Database changes are always done via **Sequelize migration files** — never alter tables manually or via `sync()`
- Every migration must have a working `down()` method
- Always create/update the matching **Sequelize model** alongside any migration
- Migration filenames follow: `YYYYMMDDHHMMSS-<action>-<table>.js` (e.g. `20250101000001-create-exchanges.js`)
- Models live in `backend/src/models/`, one file per model, exported from `models/index.js`
- Associations are defined in `models/index.js` only

---

## Database Schema

### `exchanges`
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

### `tickers`
Individual instruments being tracked. A ticker is always scoped to one exchange.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| symbol | VARCHAR(50) | Symbol without suffix (e.g. `AAPL`) |
| exchange_id | INTEGER FK | → exchanges.id |
| name | VARCHAR(255) | Company/instrument name |
| currency | CHAR(10) | Trading currency (may differ from exchange) |
| is_tracked | BOOLEAN | `true` = actively imported & updated |

EODHD symbol format: `{symbol}.{exchange.code}` (e.g. `AAPL.US`).
Unique constraint on `(symbol, exchange_id)`.

### `eod_prices`
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

### `ticker_statistics`
Computed indicator values. One row per ticker × date × indicator name.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| ticker_id | INTEGER FK | → tickers.id |
| date | DATEONLY | Date the statistic applies to |
| name | VARCHAR(100) | Indicator identifier, e.g. `7MA`, `50MA` |
| value | DECIMAL(20,8) | Computed value |

Unique constraint on `(ticker_id, date, name)`.

### `users`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | auto-increment |
| google_id | VARCHAR(255) UNIQUE | Google `sub` claim |
| email | VARCHAR(255) UNIQUE NOT NULL | From Google token |
| phone_number | VARCHAR(20) NULL | User-supplied later |
| role | ENUM('USER','ADMIN') | Default `USER` |
| created_at / updated_at | TIMESTAMP | Managed by Sequelize |

---

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

---

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
RABBIT_SERVER=localhost

# Frontend (Vite exposes vars prefixed with VITE_)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

---

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

### Key files
- `backend/src/services/authService.js` — `verifyGoogleToken`, `findOrCreateUser`, `issueJwt`
- `backend/src/middleware/authenticate.js` — JWT Bearer middleware
- `backend/src/controllers/authController.js` — `POST /api/auth/google` (via IoC)
- `frontend/src/context/AuthContext.jsx` — user state, login/logout, token persistence
- `frontend/src/pages/LoginPage.jsx` — Google Sign-In button
- `frontend/src/components/ProtectedRoute.jsx` — redirect to `/login` if unauthenticated

---

## Inversion of Control (IoC) / Dependency Injection

The backend uses a custom IoC system (inspired by Spring) located in `backend/src/ioc/`. Controllers are registered via decorators and auto-wired by `ControllerRegistry` into Express routes.

### `ApplicationContext`

Central registry for all beans (services and controllers). Behaves as a singleton per execution context.

- `ApplicationContext.constructors` — static map of `beanName → constructorFn`, populated by `@Bean` at class-load time
- `ApplicationContext.getControllers()` — returns entries in `constructors` where `target.__META__.type === 'Controller'`
- `ApplicationContext.getCurrentCtx().getBean(name)` — resolves (or lazily constructs) a bean by name
- Bean names are the uncapitalised class name: `ExchangeController` → `'exchangeController'`

Extended lifecycle API used by the broker:

| Method | Description |
|---|---|
| `registerBeanConstructor(name, fn)` | Programmatic bean registration — alternative to `@Bean()`, used by `broker/index.js` |
| `whenReady(callback)` | Defers `callback(appContext)` until after `executionStarted()` resolves; safe to call before startup |
| `executionStarted()` | Calls `initResources()` on all beans that define it, then resolves the ready promise |
| `executionFinished()` | Calls `cleanResources()` on all beans; triggered on `SIGINT` |

### `ControllerRegistry`

A singleton `@Bean` that reads all registered controllers from `ApplicationContext` and mounts them as Express routes. Called once from `app.js` during startup via `bean.registerControllers(app)`.

### Decorators

#### `@Bean({ scope?, beanName? })`
Class-level. Registers the class with `ApplicationContext.constructors`.
- `scope`: `Bean.SCOPES.SINGLETON` (default) or `Bean.SCOPES.PROTOTYPE` (new instance per `getBean` call)
- `beanName`: overrides the default uncapitalised class name
- `inject: ['depA', 'depB']` — constructor injection: resolves named beans and passes them as constructor args

#### `@Controller(basePath)`
Class-level. Marks a class as an HTTP controller. Internally calls `@Bean({ scope: PROTOTYPE })`, so each request gets a fresh instance.

```js
@Controller('/api/exchanges')
export default class ExchangeController { ... }
```

#### `@HttpMethod(method, path)`
Method-level. Declares an Express route handler.

```js
@HttpMethod('GET', '/')
async list(req, res) { ... }
```

#### `@Secured()`
Class or method level. When present on a controller class, **all** its routes are protected by the `authenticate` JWT middleware.

```js
@Controller('/api/exchanges')
@Secured()
export default class ExchangeController { ... }
```

#### `@Inject(...beanNames)`
Method-level. Before invoking the decorated method, resolves the named beans from `ApplicationContext` and attaches them to `this`. Accepts multiple names in a single call.

```js
@Inject('eodhdService', 'statisticsCalculatorService')
async importTicker(item, exchange) {
  // this.eodhdService and this.statisticsCalculatorService are both available
}
```

### Route response convention
- **Return a plain object/array** → `ControllerRegistry` sends it as JSON `200`
- **Call `res.status(X).json(...)` then bare `return`** → `ControllerRegistry` sees `undefined` and does not double-send

### How to add a new controller

1. Create `backend/src/controllers/myController.js`:
```js
import { Controller, HttpMethod, Secured } from '@/ioc';

@Controller('/api/my-resource')
@Secured()
export default class MyController {
  @HttpMethod('GET', '/')
  async list(req, res) {
    return [];
  }
}
```

2. Import it in `app.js` (side-effect import to trigger registration):
```js
import '@/controllers/myController.js';
```

---

## Messaging / Broker System (`backend/src/broker/`)

### Overview
RabbitMQ integration for event-driven communication. Two singleton beans are registered at startup: `producer` and `consumer`, both backed by `RabbitChannel` instances.

### `RabbitChannel`
Wraps `amqplib/callback_api`. Dual-mode class:
- `new RabbitChannel(true)` → producer
- `new RabbitChannel(false)` → consumer

Lifecycle hooks — called automatically by `ApplicationContext`:
- `initResources()` — connects to RabbitMQ (`RABBIT_SERVER` env var, defaults to `localhost`), creates a channel, asserts queues, starts consuming (consumer only)
- `cleanResources()` — closes the connection gracefully

Key methods:
- `send(event, payload, queue='EVENTS')` — publishes `{ event, payload }` as JSON to a queue
- `subscribe(event, processor, filter?, queue='EVENTS')` — registers a processor for an event; optional `filter(msg)` for conditional delivery

### `@Listen(...events)` decorator (`backend/src/broker/decorators/listen.js`)
Applied to a **class**. Registers it as a processor for the given events after the app reaches ready state.

```js
// Simple event subscription
@Listen('MY_EVENT')
export default class MyProcessor {
  async process(msg) { /* msg = { event, payload } */ }
}

// With filter for conditional delivery
@Listen({ eventName: 'MY_EVENT', filter: (msg) => msg.payload.type === 'foo' })
export default class MyFilteredProcessor {
  async process(msg) { ... }
}
```

The class is instantiated directly by `@Listen` (not via the DI container) and must implement `async process(msg)`.

### App startup flow
1. `import '@/broker'` in `app.js` — registers `producer` and `consumer` beans via `ApplicationContext.registerBeanConstructor`
2. `import '@/events'` in `app.js` — imports all processor classes, triggering `@Listen` which schedules subscriptions deferred via `whenReady()`
3. `ApplicationContext.executionStarted()` (called in `init()` in `app.js`):
   - Calls `initResources()` on every bean that has it → connects to RabbitMQ
   - Resolves the ready promise → fires all pending `@Listen` subscriptions
4. On `SIGINT`: `executionFinished()` calls `cleanResources()` on each bean → closes connections

### Adding a new event processor
1. Create a class in `backend/src/events/` decorated with `@Listen('EVENT_NAME')`
2. Implement `async process(msg)` — `msg` is the full `{ event, payload }` object
3. Export it from `backend/src/events/index.js`

### Emitting an event from a controller / service
Inject the `producer` bean and call `send`:
```js
@Inject('producer')
async myMethod(req, res) {
  this.producer.send('MY_EVENT', { ...payload });
  return { success: true };
}
```

### Event name constants
All event name strings live in `backend/src/events/events.js` and are exported as the `EVENTS` enum from `@/events`:
```js
import { EVENTS } from '@/events';
this.producer.send(EVENTS.STAT_CREATED, { ... });
```

---

## Testing

### Testing classes that use `@Inject`

`@Inject(...beanNames)` wraps the decorated method. At call time it resolves each named bean from `ApplicationContext` and assigns it to `this` before invoking the original method. **Setting the dep manually on the instance does NOT work** — the decorator always overwrites it.

The one correct approach: **register mocks in `ApplicationContext.constructors` at module level**.

```js
// ❌ WRONG — controller.myService = mockMyService (decorator overwrites at call time)
// ❌ WRONG — jest.mock('@/ioc')  (bypasses real wiring, gives false confidence)
// ❌ WRONG — mock internal deps of the injected class (e.g. axios inside EodhdService)
```

#### Testing a service (retrieved via IoC)

```js
import '@/services/myService.js';             // trigger @Bean registration
import ApplicationContext from '@/ioc/applicationContext.js';

const mockDep = { doThing: jest.fn() };

ApplicationContext.constructors = {           // module-level, runs once
  ...ApplicationContext.constructors,
  myDep: async () => mockDep,
};

beforeEach(async () => {
  jest.clearAllMocks();
  service = await ApplicationContext.getCurrentCtx().getBean('myService');
});
afterEach(async () => { await ApplicationContext.flushCurrentCtx(); });
```

#### Testing a controller (instantiated directly)

```js
import ApplicationContext from '@/ioc/applicationContext.js';
import MyController from '../../src/controllers/myController.js';

const mockMyService = { doThing: jest.fn() };

ApplicationContext.constructors = {           // module-level, runs once
  ...ApplicationContext.constructors,
  myService: async () => mockMyService,
};

beforeEach(() => {
  jest.clearAllMocks();
  controller = new MyController();            // @Inject fires at method call time — no IoC retrieval needed
});
afterEach(async () => { await ApplicationContext.flushCurrentCtx(); });
```

#### Helpers used in controller tests

```js
function makeReq({ params = {}, query = {}, body = {} } = {}) {
  return { params, query, body };
}
function makeRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}
```

#### Mocking `@/utils` logger in tests

`ApplicationContext` calls `logger.debug` at construction time, so partial logger mocks crash the suite. Always mock all pino methods:

```js
jest.mock('@/utils', () => ({
  logger: {
    trace: jest.fn(), debug: jest.fn(), info: jest.fn(),
    warn: jest.fn(),  error: jest.fn(), fatal: jest.fn(),
  },
}));
```

---

## Important Files
- `backend/src/app.js` — wires everything; side-effect imports for services, controllers, broker, and events must stay
- `backend/src/ioc/applicationContext.js` — bean registry and lifecycle
- `backend/src/ioc/controllerRegistry.js` — wires controllers into Express
- `backend/src/ioc/decorators/` — `bean.js`, `controller.js`, `httpMethod.js`, `secured.js`, `inject.js`
- `backend/src/ioc/index.js` — barrel export of all IoC exports
- `backend/src/broker/rabbitChannel.js` — RabbitMQ channel abstraction (producer/consumer)
- `backend/src/broker/decorators/listen.js` — `@Listen` decorator
- `backend/src/broker/index.js` — registers `producer` and `consumer` beans; re-exports `@Listen`
- `backend/src/events/` — event processor classes (`@Listen`-decorated) + `EVENTS` enum
- `backend/src/models/` — Sequelize models, one per file; associations in `index.js`
- `backend/src/services/` — business logic services (`@Bean`-registered)
- `frontend/src/config/apiUrls.js` — API endpoint definitions
- `frontend/src/lib/api.js` — dynamic API client from apiUrls.js

> This file should be updated as new conventions, architectural decisions, or gotchas are discovered during development.
