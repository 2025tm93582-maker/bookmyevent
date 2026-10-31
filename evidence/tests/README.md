# Tests — unit tests, end-to-end test, database isolation

**Claim:** every business rule is unit-tested, the main booking transaction works end to end across all five
services (including its failure paths), and each service's database user can reach only its own database.
Every file starts with the command and the time it ran (`db-isolation.txt` starts with the date).

## Evidence

| File | What it shows |
|---|---|
| `unit-tests-summary.txt` | `bash scripts/test-all.sh`: 44 unit tests across 5 services, **44 pass, 0 fail** |
| `catalog-unit-tests.txt` | 9 tests — BR-C1, BR-C2, id parsing |
| `inventory-unit-tests.txt` | 8 tests — BR3 hold transitions, hold validation, seat summary |
| `payment-unit-tests.txt` | 9 tests — idempotency fingerprint, mock gateway, payment validation |
| `notification-unit-tests.txt` | 6 tests — message templates, mock provider, channel validation |
| `booking-unit-tests.txt` | 12 tests — BR4, BR5, BR6, BR7 |
| `e2e-run.txt` | `node scripts/e2e-booking.mjs`: **20/20 checks pass** — main transaction, every service agrees, safe replay, 6 failure paths |
| `e2e-run.png` | Screenshot of the end-to-end run (command, output, timestamp) |
| `db-isolation.png` | Screenshot of the isolation check in the terminal |
| `workbench-db-isolation.png` | MySQL Workbench connected as `booking_user`: only `booking_db` is listed, and reading `inventory_db` is denied |
| `db-isolation.txt` | `booking_user` sees only `booking_db`; reading `inventory_db` and `payment_db` with another service's user is **denied** |

## Business rule → unit test

| Rule | Statement | Tests (in `services/<name>/tests/`) |
|---|---|---|
| BR-C1 | A show must start at least 1 hour from now | catalog `show.service.test.js` — rejects 30 min ahead, rejects the past, accepts exactly 1 hour |
| BR-C2 | A show has 1–10 price tiers, each once, every price > 0 | catalog `show.validator.test.js` — valid show, duplicate tiers, empty list, zero price |
| BR3 | A seat is held or sold to only one booking at a time | inventory `hold.service.test.js` — allowed hold transitions; a confirmed hold can never be released. Concurrency itself: `../challenge-1-concurrency/` |
| BR4 | A booking has 1–6 seats, no duplicates | booking `booking.validator.test.js` — 1–6 accepted, 0 or 7 rejected, duplicates rejected |
| BR5 | Booking closes 15 minutes before the show | booking `booking.rules.test.js` — open at 30 min, closed at 10 min, closed after start |
| BR6 | The server calculates the amount from Catalog tier prices | booking `booking.rules.test.js` — sum of tier prices, unknown seats or tiers reported |
| BR7 | A booking only moves through allowed states | booking `booking.rules.test.js` — happy path allowed, confirmed can never fail, final states cannot move |

## The end-to-end test (`e2e-run.txt`)

One correlation id (`e2e-mvwc7iph`) for the whole run, so `grep e2e-mvwc7iph logs/*.log` shows it in every service.

| Section | Checks |
|---|---|
| 1. Health | All five services return `UP` |
| 2. Set-up | Event, show with GOLD 2500 and SILVER 1200, 8 seats |
| 3. Main transaction | Book A1 + B1 → `201 CONFIRMED`; amount 3700 calculated by the server (BR6); all 5 saga steps OK |
| 4. Every service agrees | Payment: one SUCCEEDED payment of 3700 · Inventory: hold CONFIRMED, A1 and B1 SOLD · Notification: one e-ticket |
| 5. Replay | Same request, same `Idempotency-Key` → same booking, `Idempotent-Replayed: true`, still one payment |
| 6. Failure paths | Seat already sold → 409 (BR3) · declined card → 402, seat released, booking FAILED · unknown seat → 422 (BR6) · 7 seats → 400 (BR4) · missing key → 400 |

## How to reproduce

```bash
bash scripts/test-all.sh
bash scripts/start-all.sh
node scripts/e2e-booking.mjs
bash scripts/db/check-isolation.sh
```
