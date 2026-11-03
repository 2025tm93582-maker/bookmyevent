#!/bin/bash
set -e

echo "building images and loading them into minikube"
for name in catalog inventory booking payment notification; do
    docker build -q -t bookmyevent-$name:latest services/$name > /dev/null
    minikube image load bookmyevent-$name:latest
    echo "bookmyevent-$name is in minikube"
done

kubectl apply -f k8s/namespace.yaml
kubectl -n bookmyevent create secret generic bookmyevent-secrets --from-env-file=.env --dry-run=client -o yaml | kubectl apply -f -
kubectl -n bookmyevent create configmap mysql-init --from-file=docker/mysql/init-databases.sh --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/mysql.yaml
for name in catalog inventory payment notification booking; do
    kubectl apply -f k8s/$name.yaml
done

echo "waiting for every deployment to be ready"
for name in mysql catalog inventory payment notification booking; do
    kubectl -n bookmyevent rollout status deployment/$name --timeout=180s
done
kubectl -n bookmyevent get pods
