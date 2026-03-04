# PFCIA — Project Notes for Claude

## Stack
Full-stack app: React (Vite) + Node/Express + Postgres. Monorepo with `backend/` and `frontend/` workspaces.

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

---

## `ApplicationContext` — extended API

Beyond the core DI behaviour, `ApplicationContext` exposes lifecycle hooks used by the broker:

| Method | Description |
|---|---|
| `registerBeanConstructor(name, fn)` | Programmatic bean registration — alternative to `@Bean()`, used by `broker/index.js` |
| `whenReady(callback)` | Defers `callback(appContext)` until after `executionStarted()` resolves; safe to call before startup |
| `executionStarted()` | Calls `initResources()` on all beans that define it, then resolves the ready promise |
| `executionFinished()` | Calls `cleanResources()` on all beans; triggered on `SIGINT` |

---

## Testing

### Testing classes that use `@Inject`

`@Inject('beanName')` wraps the decorated method. At call time it calls
`ApplicationContext.getCurrentCtx().getBean(beanName)` and assigns the result to `this[beanName]`
before invoking the original method. **Setting the dep manually on the instance does NOT work** —
the decorator always overwrites it.

The one correct approach: **register mocks in `ApplicationContext.constructors` at module level**.
That's it. Nothing else needed.

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

---

## Important Files
- `backend/src/broker/rabbitChannel.js` — RabbitMQ channel abstraction (producer/consumer)
- `backend/src/broker/decorators/listen.js` — `@Listen` decorator
- `backend/src/broker/index.js` — registers `producer` and `consumer` beans; re-exports `@Listen`
- `backend/src/events/` — event processor classes (`@Listen`-decorated)
- `backend/src/app.js` — wires everything; `import '@/broker'` and `import '@/events'` are side-effect imports that must stay
