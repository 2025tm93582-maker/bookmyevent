# Deployment with Docker Compose

Everything here was captured on 1 November 2026 on a MacBook Pro with Docker 29.5.3 and Compose 5.1.4,
from a fresh clone of the repository.

## Containerisation and Compose (Tasks 1 and 2)

| File | What it shows |
|---|---|
| `01-first-compose-up.txt` | First `docker compose up --build`: MySQL image pulled, five service images built, six containers created, MySQL creating the five databases and users, every service connecting and running its migrations |
| `02-e2e-in-containers.txt` | The end-to-end test against the containers: 20 of 20 checks pass |
| `08-fixed-all-healthy.png` | `docker compose ps` after the fix: all six containers `(healthy)` |
| `11-e2e-after-fix.png` | End-to-end test after the fix: 20 of 20 |
| `12-down-and-up-again.png` | `docker compose down`, then `up -d`: everything comes back healthy |
| `14-after-restart-data-kept-e2e-pass.png` | After the restart the test creates show 3, so shows 1 and 2 survived in the volume; 20 of 20 pass |

## Deployment problem: services started before MySQL was ready (Task 3)

**Symptom.** On the first start, all five services logged
`connect ECONNREFUSED 172.18.0.2:3306 ... Database not ready, retrying` about 4 seconds before MySQL
finished its first start (`01-first-compose-up.txt`). They only got in because each service retries
10 times, 2 seconds apart, and MySQL happened to be quick.

**Diagnosis.**

| File | Evidence |
|---|---|
| `03-ps-no-health-status.png` | `docker compose ps` only says `Up`: Docker had no way to tell whether a service worked |
| `04-inspect-health-null.png` | `docker inspect ... .State.Health` is `null`: no healthcheck was defined |
| `05-logs-database-not-ready.png` | `docker compose logs`: every service tried MySQL before it was ready |
| `06-catalog-exits-without-database.png` | With MySQL stopped, a restarted Catalog fails all 10 tries (`getaddrinfo ENOTFOUND mysql`) and stays `Exited (1)` |
| `docker-compose.before-fix.yml` | The cause: `depends_on` only waited for the MySQL container to start, not for MySQL to accept connections, and nothing restarted a service that gave up |

**Fix** (in `docker-compose.yml`):

- MySQL got a healthcheck (`mysqladmin ping` over TCP), which only passes once it accepts connections.
- Every service now uses `depends_on: mysql: condition: service_healthy`, and Booking also waits for the
  other four services to be healthy.
- Every service got a healthcheck on its own `/health`, which returns 503 when its database is unreachable.
- Every container got `restart: unless-stopped`.

**Validation.**

| File | Evidence |
|---|---|
| `07-fixed-startup-waits-for-healthy.png` | From a wiped volume: MySQL is healthy after 6.3 s, the four services after 11.3 s, and Booking starts last |
| `13-no-database-retries-after-fix.png` | `docker compose logs \| grep -c "Database not ready"` prints 0 |
| `09-catalog-restarted-without-mysql.png`, `10-catalog-recovers-when-mysql-returns.png` | The same failure test again: Catalog is restarted by Docker and is healthy again once MySQL is back, instead of staying dead |
| `11-e2e-after-fix.png` | The main booking flow still passes |

**What we learned.** A container being started is not the same as the program inside it being ready.
`depends_on` alone only orders container starts, so readiness has to be checked with healthchecks, and the
service's own retry loop is a safety net, not the plan. In a real deployment we would give every service a
health endpoint that checks its dependencies, gate start-up on it, and add a restart policy; in Kubernetes
the same idea becomes readiness and liveness probes.
