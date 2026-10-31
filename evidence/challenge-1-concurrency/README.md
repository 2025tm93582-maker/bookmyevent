# Challenge 1 — Concurrency control

**Claim:** however many requests arrive at the same moment, a seat is never held by more than one booking (BR3).
Capacity N always means exactly N successful holds, and the database stays consistent.

## The contended resource

One row per seat per show in Inventory's `show_seats` table:

| show_id | seat_no | status | hold_id |
|---|---|---|---|
| 925917 | A1 | AVAILABLE → HELD → SOLD | the hold that owns it |

## Why a plain check-then-update fails

```
time   Request 1                         Request 2
 t1    SELECT status → AVAILABLE
 t2                                      SELECT status → AVAILABLE   (1 hasn't written yet)
 t3    UPDATE status = HELD  → 201
 t4                                      UPDATE status = HELD  → 201   ← double booking
```

The gap between the read (t1) and the write (t3) is the **race window**. Every request that reads inside
that window sees `AVAILABLE` and goes ahead. Checking "more carefully" in application code cannot close the
window, because the check and the write are two separate steps.

## The fix: one atomic conditional UPDATE

`services/inventory/src/repositories/hold/hold.repository.js` → `hold()`

```sql
START TRANSACTION;
UPDATE show_seats
   SET status = 'HELD', hold_id = ?
 WHERE show_id = ? AND seat_no IN (?) AND status = 'AVAILABLE';
-- affectedRows < seats requested → ROLLBACK, 409 SEAT_UNAVAILABLE
-- otherwise INSERT INTO holds (...) and COMMIT
```

- The check (`status = 'AVAILABLE'`) and the write happen in **one statement**. InnoDB locks each row as it
  updates it; a second request waits for the lock, then finds the condition false and updates 0 rows.
- `affectedRows` tells us whether *all* requested seats were won. If not, the transaction rolls back, so a
  multi-seat hold is all-or-nothing (no customer is left with half their seats).
- The `holds` row is inserted in the same transaction, so seats are never `HELD` without a matching hold.
- A rare `ER_LOCK_DEADLOCK` between two multi-seat requests is mapped to `409 SEAT_UNAVAILABLE`, not a 500.

## Evidence

Script: `scripts/challenge1-concurrency.mjs` — fires 20 `POST /api/v1/holds` requests with `Promise.all`
against a fresh show and counts how many succeed.
Every file starts with the command, the time it ran and which failure switches were on.

| File | What it shows |
|---|---|
| `01-atomic-run.txt` | Atomic mode: Case 1 `201 × 1, 409 × 19`; Case 2 `201 × 5, 409 × 15` — **PASS** |
| `02-atomic-db-state.txt` | Show 925917 (N = 1): `A1 HELD`, `holds = 1`. Show 938299 (N = 5): A1–A5 each `HELD` by a different hold, `holds = 5` — consistent |
| `03-naive-run.txt` | Naive check-then-update: Case 1 `201 × 20`; Case 2 `201 × 20` — **FAIL** |
| `04-naive-db-state.txt` | Show 998740: one seat but `holds = 20`. Show 982045: 5 seats but `holds = 20` — over-allocated and inconsistent |
| `atomic-run.png`, `naive-run.png` | Screenshots of the two runs (command, output, timestamp) |
| `db-state.png` | Terminal: both database-state files (`02` and `04`) |
| `workbench-db-state.png` | MySQL Workbench, all four shows in one grid: atomic 1 seat / 1 hold and 5 seats / 5 holds; naive 1 seat / 20 holds and 5 seats / 20 holds |

| Mode | Case 1 (N = 1, 20 requests, 1 seat) | Case 2 (N = 5, 20 requests, 4 per seat) |
|---|---|---|
| Atomic (default) | 1 success, 19 × `SEAT_UNAVAILABLE` | 5 successes (A1–A5, one each), 15 rejected |
| Naive (demo only) | 20 successes for the same seat | 20 successes for 5 seats |

In the naive run all 20 writes overwrote each other: the seat ends with one `hold_id`, yet 20 holds exist.
Nineteen customers were told they own a seat that the database assigns to someone else.

## How to reproduce

```bash
# atomic (default)
cd services/inventory && npm run dev
node scripts/challenge1-concurrency.mjs        # from the repo root

# naive comparison (never the default)
cd services/inventory && HOLD_STRATEGY=naive npm run dev
node scripts/challenge1-concurrency.mjs
```

The script prints the show id of each case (used for the database check) and exits with code 1 if the
number of successful holds is not exactly the capacity.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| `SELECT … FOR UPDATE`, then UPDATE | Correct, but two statements; multi-seat requests must lock rows in a fixed order to avoid deadlocks |
| Optimistic locking (`version` column) | Correct, but losers need retry logic in the client or service |
| Unique constraint on a `seat_allocations` table | Correct; a good extra safety net, but needs a separate table and delete-on-release |
| Lock in application memory (JS `Map` / mutex) | Fails as soon as two Inventory instances run — each has its own memory |

## Limitations (honest analysis)

- **Naive mode adds `sleep(50)`** between the read and the write. It stands in for real-world delay (network,
  load) so the race shows up every run; without it the race still exists but appears less often on a laptop.
- **Holds do not expire.** If a customer abandons payment, the seat stays `HELD` until Booking releases it.
  Time-bound holds (Challenge 3B) were not chosen; a cleanup job is future work.
- **One MySQL instance.** Correctness relies on that database's row locks. Running several Inventory
  instances is safe (the lock is in the database, not the service), but a sharded or replicated seat store
  would need a different design.
- **The failure explanation is read without a lock.** After a failed hold, Inventory re-reads the seats to
  report *which* ones were taken. That read only shapes the error message; the decision was already made by
  the atomic UPDATE.
