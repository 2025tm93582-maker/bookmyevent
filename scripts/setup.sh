#!/bin/bash
cd "$(dirname "$0")/.."

for name in catalog inventory payment notification booking; do
    echo "setting up $name"
    if [ ! -f services/$name/.env ]; then
        cp services/$name/.env.example services/$name/.env
    fi
    (cd services/$name && npm install --silent)
done
