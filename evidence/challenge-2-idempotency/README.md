# Challenge 2 — Idempotency

**Claim:** repeating an unsafe request (a payment charge) with the same `Idempotency-Key` returns the same
result and never charges twice — for sequential repeats **and** for identical requests arriving at the same
moment. The same key with a different payload is rejected.

Where: Payment service, `POST /api/v1/payments` (the saga's Booking → Payment call uses `Idempotency-Key = bookingId`).

## How it works

`services/payment/src/middlewares/idempotency.middleware.js` + `repositories/idempotency/idempotency.repository.js`

```
idempotency_keys(idem_key PK, request_hash, status IN_PROGRESS|COMPLETED, response_code, response_body JSON)
```

1. **Fingerprint** the request: `sha256(method + path + body with keys sorted)` (`utils/hash.util.js`).
   Field order does not matter; any change in value does.
2. **Claim the key**: `INSERT IGNORE … status = 'IN_PROGRESS'`.
   - Inserted → this request owns the key and is processed.
   - Already there → read the stored row:
     - different fingerprint → **422 `IDEMPOTENCY_KEY_REUSED`**
     - `IN_PROGRESS` → **409 `REQUEST_IN_PROGRESS`** + `Retry-After: 1`
     - `COMPLETED` → **replay** the stored status and body, header `Idempotent-Replayed: true`, log `Idempotent replay`
3. **Store before sending**: `res.json` is wrapped so the response is saved *before* it reaches the client.
   Whatever a client received is already stored, so a retry always gets the identical answer.
   - 2xx and 4xx (e.g. `402 PAYMENT_DECLINED`) are stored and replayed — a declined card stays declined.
   - 5xx (e.g. `503 GATEWAY_UNAVAILABLE`) **releases** the key so the client may retry.

**Why simultaneous duplicates are safe:** the key is the table's PRIMARY KEY, so exactly one `INSERT` can
win. "SELECT the key, INSERT if missing" would re-create the same check-then-act race as Challenge 1.

**Second safety net:** `UNIQUE (booking_id)` on `payments` — even 20 requests with *different* keys for one
booking produce one payment (Case 4).

## Evidence

Script: `scripts/challenge2-idempotency.mjs` (fresh keys and booking ids every run).
Every file starts with the command, the time it ran and which failure switches were on.

| File | What it shows |
|---|---|
| `01-run.txt` | Normal gateway — all checks PASS |
| `02-db-state.txt` | Run `mvwcbb7h`: every booking has exactly **1** payment, every key `COMPLETED` with its stored request fingerprint, and the single payment row created by the 20-request burst |
| `03-run-slow-gateway.txt` | `PAYMENT_DELAY_MS=1500`: the burst arrives while the first request is still running → `201 × 1, 409 × 19` |
| `04-replay-logs.txt` | 22 Payment log lines `"msg":"Idempotent replay"`: 3 for the sequential key, 19 for the burst key |
| `05-gateway-down-run.txt` | `PAYMENT_FAIL_RATE=1`: only `503` and `409`, **no 500**, 0 payments — keys released on 5xx. The script's checks are written for a working gateway, so they print FAIL here; what this run proves is that nothing is charged and nothing crashes |
| `run.png` | Screenshot of the normal run (command, output, timestamp) |
| `db-state.png` | Terminal: `02-db-state.txt` |
| `workbench-db-state.png` | MySQL Workbench: exactly one payment for each of the run's four bookings |
| `slow-gateway-run.png`, `gateway-down-run.png` | Screenshots of `03` and `05` |
| `replay-logs.png` | Screenshot of the replay lines from `logs/payment.log` (time, correlation id, key, message), 22 in total |

| Case | Result (normal gateway) |
|---|---|
| 1. Same request 4× in a row | first `201`, 3 repeats `201` replayed with the **same payment id**; 1 row |
| 2. Same key, different amount | `422 IDEMPOTENCY_KEY_REUSED` |
| 3. 20 identical requests at once | `201 × 1` created + `201 (replayed) × 19`, 1 row |
| 3. same, slow gateway | `201 × 1` + `409 REQUEST_IN_PROGRESS × 19`, 1 row |
| 4. 20 requests, different keys, same booking | `201 × 1` + `409 PAYMENT_EXISTS × 19`, 1 row |

Also covered elsewhere: field order does not change the fingerprint (`services/payment/tests/hash.util.test.js`,
output in `../tests/payment-unit-tests.txt`); the same middleware on Booking rejects a missing key with `400` and
replays a repeated booking without a second payment (`../tests/e2e-run.txt`, sections 5 and 6).

## Failures found by the failure tests — and fixed

Running the burst against a failing gateway (`PAYMENT_FAIL_RATE=1`) exposed two real bugs, both now fixed:

1. **Key released between claim and read → 500.** Request A claimed the key, got 503 and deleted the key;
   request B had already failed its claim, then read the key and got `null` → crash.
   **Fix:** the middleware loops (up to 3 times): claim → if lost, read → if the key vanished, claim again.
2. **`ER_LOCK_DEADLOCK` on `INSERT IGNORE` → 500.** A `DELETE` of the key while ~19 inserts of the same key
   were waiting made InnoDB cancel one transaction as a deadlock.
   **Fix:** `claim()` treats a deadlock as "someone else holds the key", and the loop retries.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Check `SELECT` then `INSERT` the key | Race: two simultaneous requests both see "no key" |
| In-memory map of keys | Lost on restart; not shared between instances |
| Rely only on `UNIQUE(booking_id)` | Prevents a double charge but the retry gets an error, not the original response |
| Store only successful responses | A declined card could be charged on retry; 4xx results must be replayed too |

## Limitations

- **Stuck `IN_PROGRESS` keys:** if the service crashes mid-request, the key stays `IN_PROGRESS` and repeats get
  409 forever. A real system would expire such keys after a timeout.
- **No key expiry:** keys are kept indefinitely; production systems usually delete them after ~24 h.
- **Replay body field order** may differ from the original (MySQL stores JSON with normalised key order);
  the values are identical.
- **Scope:** idempotency is implemented on the Payment charge (the unsafe external call). Booking's own
  `POST /bookings` uses the same middleware pattern (see the Booking service).
