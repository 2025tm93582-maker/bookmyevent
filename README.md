# BookMyEvent — Event Ticketing Microservices

Scalable Services (SE ZG583) — Assignment 1

BookMyEvent sells tickets for events (concerts, comedy, movies, sports, theatre). It is built as **five
Node.js / Express microservices**, each with **its own MySQL database and database user**. Booking runs the
purchase as an **orchestrated saga**: hold seats → charge → confirm seats → notify, with compensation when a
step fails.

| Service | Port | Database | Responsibility |
|---|---|---|---|
| catalog | 3001 | catalog_db | Categories, events, shows and tier prices |
| inventory | 3002 | inventory_db | Seat layouts per show; atomic seat holds (Challenge 1) |
| booking | 3003 | booking_db | Booking saga orchestrator, business rules BR4–BR7 (Challenge 3C) |
| payment | 3004 | payment_db | Mock payment gateway; idempotent charges and refunds (Challenge 2) |
| notification | 3005 | notification_db | Mock email/SMS provider; each e-ticket sent at most once |

Services talk only over REST (`/api/v1/...`). Only Booking calls other services. No service reads another
service's database — each MySQL user is granted only its own database.

---

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20 or newer | `node -v` |
| MySQL server + client | 8 or newer | `mysql --version` |
| curl | any | `curl --version` |

MySQL must be running on `127.0.0.1:3306`. On macOS with Homebrew: `brew services start mysql`.

## 2. Setup (once)

From the repository root:

```bash
# 1. create the 5 databases and 5 users (asks for your MySQL root password)
mysql -u root -p < scripts/db/create-databases.sql

# 2. install dependencies and create each service's .env from .env.example
bash scripts/setup.sh
```

Each service creates its own tables on start-up (migrations in `services/<name>/src/migrations`, tracked in a
`schema_migrations` table so each runs once).

## 3. Run

```bash
bash scripts/start-all.sh      # starts all 5 services, checks /health, logs to logs/<name>.log
bash scripts/stop-all.sh       # stops them
```

Or run one service in the foreground with auto-reload:

```bash
cd services/catalog && npm run dev
```

Start order does not matter: every service retries its database connection on start-up, and Booking only
calls the others when a booking is made.

**Check it works:**

```bash
for p in 3001 3002 3003 3004 3005; do curl -s localhost:$p/health; echo; done
```

**API docs (Swagger UI)** for each service: `http://localhost:<port>/docs`, generated from
`services/<name>/openapi.yaml`.

## 4. Try a booking by hand

```bash
# event + show (must start at least 1 hour from now) + seats
curl -s -X POST localhost:3001/api/v1/events -H "Content-Type: application/json" \
  -d '{"title":"Arijit Singh Live","category":"CONCERT","durationMinutes":180}'
curl -s -X POST localhost:3001/api/v1/events/1/shows -H "Content-Type: application/json" \
  -d '{"venue":"JLN Stadium, Delhi","startsAt":"2026-12-20T19:30:00+05:30","prices":[{"tier":"GOLD","price":3500},{"tier":"SILVER","price":1500}]}'
curl -s -X POST localhost:3002/api/v1/shows/1/seats -H "Content-Type: application/json" \
  -d '{"rows":[{"row":"A","count":5,"tier":"GOLD"},{"row":"C","count":8,"tier":"SILVER"}]}'

# book (tok_visa succeeds, tok_decline is declined)
curl -s -X POST localhost:3003/api/v1/bookings -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-first-booking" -H "X-Correlation-Id: demo-001" \
  -d '{"showId":1,"seats":["A1","C1"],"customerEmail":"you@example.com","cardToken":"tok_visa"}'
```

The response contains the booking status, the amount calculated by the server, and every saga step.
`grep demo-001 logs/*.log` shows the same request in all five services.

## 5. Tests

```bash
bash scripts/test-all.sh              # unit tests of all services (node:test), saved to evidence/tests/
node scripts/e2e-booking.mjs          # end-to-end test of the main booking transaction (services must be running)
```

| Script | What it proves | Evidence |
|---|---|---|
| `scripts/e2e-booking.mjs` | Main transaction across all 5 services: booking confirmed, every service agrees, replay is safe, failure paths behave | `evidence/tests/e2e-run.txt` |
| `scripts/challenge1-concurrency.mjs` | 20 parallel holds on one seat → exactly 1 succeeds | `evidence/challenge-1-concurrency/` |
| `scripts/challenge2-idempotency.mjs` | Repeated and simultaneous charges with one key → one payment | `evidence/challenge-2-idempotency/` |
| `scripts/challenge3c-saga.mjs` | Forced failure at step 3 → refund + seat release, consistent end state | `evidence/challenge-3c-saga/` |
| `scripts/db/check-isolation.sh` | One service's DB user cannot read another service's database | `evidence/tests/db-isolation.txt` |

Each evidence folder has a README that links every file to the claim it proves.

### Failure switches (for demos and challenge scripts)

Set when starting the service, e.g. `FAULT_CONFIRM_FAIL=true node server.js` inside `services/inventory`.
All are off by default and log a warning when on.

| Service | Variable | Effect |
|---|---|---|
| inventory | `HOLD_STRATEGY=naive` | Unsafe check-then-update holds — shows the double booking (Challenge 1) |
| inventory | `FAULT_CONFIRM_FAIL=true` | Every seat confirmation fails with 500 (Challenge 3C step-3 failure) |
| payment | `PAYMENT_DELAY_MS=500` | Slow gateway |
| payment | `PAYMENT_FAIL_RATE=1` | Gateway down — charges return 503 (0–1 = probability) |
| notification | `NOTIFY_DELAY_MS`, `NOTIFY_FAIL_RATE` | Slow / failing email-SMS provider |

## 6. Configuration

All configuration comes from environment variables, read in one place per service
(`src/config/env.config.js`). Each service has a `.env.example`; `scripts/setup.sh` copies it to `.env`.

| Variable | Services | Default / example |
|---|---|---|
| `PORT` | all | 3001 … 3005 |
| `SERVICE_NAME` | all | catalog, inventory, booking, payment, notification |
| `LOG_LEVEL` | all | info |
| `DB_HOST`, `DB_PORT` | all | 127.0.0.1, 3306 |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | all | `<service>_user`, `<service>_pass`, `<service>_db` |
| `CATALOG_URL`, `INVENTORY_URL`, `PAYMENT_URL`, `NOTIFICATION_URL` | booking | `http://localhost:300x/api/v1` |
| `HTTP_TIMEOUT_MS` | booking | 2000 — timeout on every outgoing call |
| `BOOKING_CUTOFF_MINUTES` | booking | 15 — BR5 |

The passwords are local development credentials only.

## 7. Business rules — where they live and where they are tested

| Rule | Statement | Code | Test |
|---|---|---|---|
| BR-C1 | A show must start at least 1 hour from now | `catalog/src/services/show/show.service.js` → `startsTooSoon` | `catalog/tests/show.service.test.js` |
| BR-C2 | A show has 1–10 price tiers, each once, every price > 0 | `catalog/src/validators/show/show.validator.js` | `catalog/tests/show.validator.test.js` |
| BR3 | A seat is held or sold to only one booking at a time | `inventory/src/repositories/hold/hold.repository.js` → `hold` (atomic conditional UPDATE); `inventory/src/services/hold/hold.service.js` → `canMove` | `inventory/tests/hold.service.test.js`, `scripts/challenge1-concurrency.mjs` |
| BR4 | A booking has 1–6 seats, no duplicates, one show | `booking/src/validators/booking/booking.validator.js` | `booking/tests/booking.validator.test.js` |
| BR5 | Booking closes 15 minutes before the show starts | `booking/src/services/booking/booking.rules.js` → `isBookingClosed` | `booking/tests/booking.rules.test.js` |
| BR6 | The amount is calculated by the server from Catalog tier prices | `booking.rules.js` → `calculateAmount` | `booking/tests/booking.rules.test.js`, `scripts/e2e-booking.mjs` |
| BR7 | A booking only moves through allowed states | `booking.rules.js` → `canMove`; `booking.service.js` → `move` | `booking/tests/booking.rules.test.js` |

## 8. API overview

Every service exposes `GET /health` (200 UP / 503 DOWN when its database is unreachable) and `GET /docs`.

| Service | Endpoints |
|---|---|
| catalog | `GET/POST /api/v1/categories` · `GET/POST /api/v1/events` · `GET /api/v1/events/{id}` · `GET/POST /api/v1/events/{id}/shows` · `GET /api/v1/shows/{id}` |
| inventory | `GET/POST /api/v1/shows/{id}/seats` · `POST /api/v1/holds` · `GET /api/v1/holds/{id}` · `POST /api/v1/holds/{id}/confirm` · `POST /api/v1/holds/{id}/release` |
| booking | `POST /api/v1/bookings` (needs `Idempotency-Key`) · `GET /api/v1/bookings/{id}` |
| payment | `POST /api/v1/payments` (needs `Idempotency-Key`) · `GET /api/v1/payments?bookingId=` · `GET /api/v1/payments/{id}` · `POST /api/v1/payments/{id}/refund` |
| notification | `POST /api/v1/notifications` · `GET /api/v1/notifications?bookingId=` |

**One error format everywhere:**

```json
{ "error": { "code": "SEAT_UNAVAILABLE", "message": "…", "details": [], "correlationId": "…" } }
```

| Status | Meaning |
|---|---|
| 400 | Malformed request (validation, bad id, missing Idempotency-Key) |
| 402 | Payment declined |
| 404 | Not found |
| 409 | Conflicts with current state (seat taken, duplicate, request in progress) |
| 422 | Well-formed but breaks a business rule |
| 502 / 503 | A step or a dependency failed |

**Tracing:** send `X-Correlation-Id` (or one is generated). It is echoed back, written in every JSON log line
and forwarded by Booking to every service.

## 9. Repository layout

```
scripts/                 setup, start/stop, tests, end-to-end and challenge scripts
scripts/db/              create-databases.sql, check-isolation.sh
services/<name>/
    server.js            starts the app, connects to MySQL (with retry), runs migrations
    openapi.yaml         API spec served at /docs
    .env.example         configuration template
    src/app.js           middleware order: correlation id → request logger → JSON → routes → 404 → error handler
    src/config/          env, database pool + migrations, logger
    src/routes/  src/controllers/  src/validators/      API layer
    src/services/                                        business logic and rules
    src/repositories/                                    SQL only
    src/clients/         (booking) HTTP clients for the other services
    src/migrations/      numbered .sql files
    tests/               unit tests (node:test)
evidence/                outputs, DB state and logs for each challenge and the tests
logs/                    service logs when started with start-all.sh (git-ignored)
```

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `Can't connect to local MySQL server through socket` | MySQL is not running: `brew services start mysql` |
| `Access denied for user '<service>_user'` | Run `scripts/db/create-databases.sql` as root |
| `Missing required environment variable` | `.env` is missing: `bash scripts/setup.sh` or `cp .env.example .env` |
| `EADDRINUSE` | A service is already running on that port: `bash scripts/stop-all.sh` |
| A service shows DOWN | Read `logs/<name>.log` |

## 11. Known limitations

Holds do not expire; a Booking crash mid-saga or a failed compensation leaves a booking for a recovery job
(future work); idempotency keys never expire; cancellation is modelled but not built; one MySQL instance;
no authentication (out of scope). Details are in each `evidence/*/README.md`.
