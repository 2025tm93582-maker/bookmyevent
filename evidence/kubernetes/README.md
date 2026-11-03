# Deployment on Kubernetes (Minikube)

Captured on 1 November 2026 on a MacBook Pro (Apple Silicon) with Minikube 1.39.0 (Kubernetes 1.37.0,
containerd runtime) and kubectl 1.34.1. The manifests are in `k8s/`, and `k8s/deploy.sh` builds the images,
loads them into Minikube and applies everything.

## How it is set up

- Everything runs in its own namespace, `bookmyevent`.
- MySQL is a Deployment with a 1 GB PersistentVolumeClaim, a readiness probe (`mysqladmin ping`) and an
  internal ClusterIP Service. Its init script comes from a ConfigMap made from `docker/mysql/init-databases.sh`.
- Passwords are a Kubernetes Secret created from the local `.env` by `deploy.sh`, so no secret is in git.
- Each service is a Deployment plus a LoadBalancer Service on its usual port. Each pod first runs a small
  `wait-for-mysql` init container, then the service itself with readiness and liveness probes on `/health`.
- Services find each other by Kubernetes service name, for example `http://inventory:3002`.
- `minikube tunnel` exposes the five LoadBalancer Services on `127.0.0.1:3001` to `3005`, so the same test
  scripts and Postman collection work unchanged.

## Main workflow through Kubernetes

| File | What it shows |
|---|---|
| `01-minikube-start-and-deploy.png` | `minikube start`, then `deploy.sh`: images loaded, every object created, every Deployment rolled out, six pods `1/1 Running` |
| `03-pods-running-services-pending.png` | Pods and Services before the tunnel: external IPs still pending |
| `04-minikube-tunnel.png` | The tunnel running for the five services |
| `05-services-on-localhost.png` | The five services now have external IP `127.0.0.1` |
| `06-e2e-through-kubernetes.png` | The end-to-end booking test through the cluster: 20 of 20 checks pass |

## Scaling and self-healing

| File | What it shows |
|---|---|
| `07-inventory-scaled-to-3.png` | `kubectl scale deployment inventory --replicas=3`: three Inventory pods running |
| `08-challenge1-with-3-replicas.png` | Challenge 1 against three replicas: still exactly 1 of 20 succeeds for one seat and 5 of 20 for five seats |
| `09-hold-requests-spread-over-3-pods.png` | The hold requests were split across the three pods (20, 14 and 9), so all three were taking part |
| `10-pod-deleted-e2e-still-passes.png` | One Inventory pod deleted, then the booking test still passes 20 of 20 (and uses show 2, so the data survived) |
| `11-pod-deleted-and-replaced.png` | A pod is deleted and Kubernetes immediately creates a replacement, which goes from `Init:0/1` (waiting for MySQL) to `1/1 Running` in 7 seconds, keeping three replicas |

Scaling Inventory is the interesting case: three copies of the service handle concurrent holds on the same
seat and still never double-sell it, because the decision is made by one conditional UPDATE in MySQL, not in
the service's memory. In `11-pod-deleted-and-replaced.png`, pod `sz24q` also shows one restart: after
Minikube was restarted it came up before its database was ready, failed its liveness probe and was restarted
by Kubernetes without anyone doing anything.

## A problem on the way

`02-docker-env-build-fails-on-containerd.png`: our first `deploy.sh` built the images inside Minikube with
`eval $(minikube docker-env)`. Minikube 1.39 runs containers with containerd, not Docker, so the build failed
with `404 page not found`. We changed `deploy.sh` to build with the local Docker and copy each image into
the cluster with `minikube image load`, and set `imagePullPolicy: Never` so Kubernetes uses the loaded image.
