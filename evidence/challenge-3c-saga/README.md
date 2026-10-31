# Challenge 3C — Saga with compensation

**Claim:** a booking spans four services with no shared transaction. If a step fails, the steps already done
are undone by compensating actions in reverse order, and every service ends in a consistent state.
Forcing a failure at **step 3 (confirm seats)** refunds the payment (undoes step 2) and releases the seats
(undoes step 1).

## Why a saga

Each service owns its own database (database per service), so one ACID transaction across Booking,
Inventory and Payment is impossible. Two-phase commit would need a blocking coordinator and every service
up at the same time. A saga uses one **local transaction per step** plus a **compensating action** for each
step that can be undone, and accepts that the system is briefly in between states.

## Design: orchestrated saga in Booking

`services/booking/src/services/booking/booking.service.js` → `create()`

| # | Step (service) | On success | If a later step fails, compensate with |
|---|---|---|---|
| — | Check: show + BR5 cutoff (Catalog), seat map + BR6 amount (Inventory) | booking row `PENDING` | nothing — no booking row exists yet |
| 1 | Hold seats (Inventory `POST /holds`) | `SEATS_HELD` | **Release seats** (`POST /holds/{id}/release`) |
| 2 | Charge (Payment `POST /payments`, `Idempotency-Key = bookingId`) | `PAID` | **Refund** (`POST /payments/{id}/refund`) |
| 3 | Confirm seats (Inventory `POST /holds/{id}/confirm`) | `CONFIRMED` | — last step that can be undone |
| 4 | Notify (Notification) | step logged | not compensated — a paid booking is never undone because an email failed |

**Booking states (BR7, `booking.rules.js`):**

```
PENDING ──► SEATS_HELD ──► PAID ──► CONFIRMED ──► (CANCELLED: future work)
   │             │            │
   │             └──────┬─────┘
   ▼                    ▼
REJECTED          COMPENSATING ──► FAILED
(seat taken)
PENDING ──► FAILED (Inventory unreachable before anything was held)
```

Every state change goes through `move()`: it checks the transition is allowed (BR7), then runs a
**conditional UPDATE** (`WHERE id = ? AND status = ?`), so a booking only moves from the state the saga expects.
Every step and every compensation is written to `saga_steps` — the saga's diary, returned in `GET /bookings/{id}`.

### Why compensations are safe to retry

| Compensation | Why repeating it is harmless |
|---|---|
| Release seats | Inventory returns 200 unchanged for an already-RELEASED hold; it refuses to release a CONFIRMED hold |
| Refund | Payment returns 200 unchanged for an already-REFUNDED payment (conditional `WHERE status = 'SUCCEEDED'`) |
| Charge (forward step) | Retried up to 3× on 503 / timeout / 409 with the **same Idempotency-Key** (Challenge 2) — never a double charge |

### Fault injection

Inventory reads `FAULT_CONFIRM_FAIL=true` and then fails every confirm with `500 SIMULATED_FAILURE`
(off by default; a warning is logged at start-up). Payment and Notification have `PAYMENT_FAIL_RATE` and
`NOTIFY_FAIL_RATE`.

## Evidence

Script: `scripts/challenge3c-saga.mjs` — creates a fresh event, show and 4 seats, books A1 + A2 with one
correlation id, then reads the final state from Booking, Payment and Inventory and checks they agree.
Every file starts with the command, the time it ran and which failure switches were on.

| File | Scenario | Result |
|---|---|---|
| `01-happy-path.txt` | all services normal | `201 CONFIRMED`; payment SUCCEEDED, hold CONFIRMED, seats SOLD — CONSISTENT |
| `02-failure-at-step-3.txt` | **Inventory `FAULT_CONFIRM_FAIL=true`** | `502 BOOKING_FAILED`; steps below; payment **REFUNDED**, hold **RELEASED**, seats **AVAILABLE** — CONSISTENT |
| `03-failure-correlated-logs.txt` | same run | all 18 log lines for `saga-mvwcfnrk` across 5 services, in time order |
| `04-failure-db-state.txt` | same run, read from all three databases | `booking_db`: FAILED / SEAT_CONFIRMATION_FAILED and 7 `saga_steps` rows with ms timestamps; `payment_db`: payment REFUNDED; `inventory_db`: hold RELEASED, seats AVAILABLE |
| `05-payment-down.txt` | Payment `PAYMENT_FAIL_RATE=1` | `503 PAYMENT_UNAVAILABLE`; only step 1 compensated (seats released), no payment taken — CONSISTENT |
| `05b-payment-down-retry-logs.txt` | same run | Booking log: charge attempts 1 and 2 failed → retried with the same key; 3 charge calls, 0 payments |
| `06-notification-down.txt` | Notification `NOTIFY_FAIL_RATE=1` | `201 CONFIRMED`; `NOTIFY FAILED HTTP 503`; booking stays CONFIRMED — CONSISTENT |
| `failure-at-step-3.png`, `failure-db-state.png` | screenshots of `02` and `04` | command, output, timestamp |
| `workbench-db-state.png` | MySQL Workbench, same booking | one grid across the three databases: booking FAILED, payment REFUNDED, hold RELEASED, A1 and A2 AVAILABLE |
| `happy-path.png`, `payment-down.png`, `notification-down.png` | screenshots of `01`, `05` and `06` | command, output, timestamp |

**The forced failure at step 3 (`02`, `04`):**

```
1. CHECK           OK       show 3, amount 4000
2. HOLD_SEATS      OK       hold 765838a3-…           ← step 1
3. CHARGE_PAYMENT  OK       payment aa588fd1-…        ← step 2
4. CONFIRM_SEATS   FAILED   HTTP 500 SIMULATED_FAILURE ← step 3 fails
5. REFUND_PAYMENT  OK       HTTP 200                  ← undo step 2
6. RELEASE_SEATS   OK       HTTP 200                  ← undo step 1
7. NOTIFY          OK       HTTP 201                  ← "booking could not be completed" message
```

Final state: Booking FAILED · Payment REFUNDED · hold RELEASED · seats AVAILABLE.
Compensations ran in **reverse order** (refund at .246 before release at .250 in `saga_steps`).

## Orchestration vs choreography

| | Orchestration (chosen) | Choreography |
|---|---|---|
| How | Booking calls each service and decides the next step | Services react to each other's events |
| Plus | Whole flow and its state in one place; one table shows every step; easy to test and demo | Loose coupling, no central coordinator |
| Minus | Booking knows every service | Needs a message broker; the flow is spread across services and hard to trace |
| Fits here because | 4 steps, synchronous REST required by the brief, one correlation id traces it all | — |

## Limitations (honest analysis)

- **Booking crashes mid-saga:** a booking can be left in `SEATS_HELD` or `PAID` with seats held or money taken.
  A recovery job that finds such bookings older than a few minutes and compensates them is future work.
- **Compensation fails** (e.g. Payment down during the refund): the booking stays `COMPENSATING` and the
  request returns `500 COMPENSATION_INCOMPLETE` — it is never marked FAILED while money or seats are still taken.
  The same recovery job would retry it.
- **Timeout ambiguity at step 1:** if the hold call times out, the hold may exist without Booking knowing its id.
  Holds do not expire (Challenge 3B was not chosen), so such seats stay HELD until released manually.
- **Timeout ambiguity at step 2** is handled: after a timeout Booking looks up payments by `bookingId` and
  refunds a successful one.
- **Cancellation** of a confirmed booking (`CONFIRMED → CANCELLED`) is in the state machine but not built;
  it would need Inventory to allow SOLD → AVAILABLE through a separate cancel endpoint.
