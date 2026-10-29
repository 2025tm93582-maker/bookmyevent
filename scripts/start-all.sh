#!/bin/bash
cd "$(dirname "$0")/.."
mkdir -p logs

start() {
    name=$1
    port=$2
    if curl -sf localhost:$port/health > /dev/null; then
        echo "$name is already running"
        return
    fi
    (cd services/$name && exec node server.js >> ../../logs/$name.log 2>&1) &
    echo $! > logs/$name.pid
    echo "started $name"
}

check() {
    name=$1
    port=$2
    if curl -sf localhost:$port/health > /dev/null; then
        echo "$name is UP on port $port"
    else
        echo "$name is DOWN, see logs/$name.log"
    fi
}

start catalog 3001
start inventory 3002
start payment 3004
start notification 3005
start booking 3003

sleep 3

check catalog 3001
check inventory 3002
check payment 3004
check notification 3005
check booking 3003
