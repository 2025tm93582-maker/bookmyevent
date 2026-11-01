#!/bin/bash
if [ $# -lt 1 ]; then
    echo "usage: bash scripts/demo/restart.sh <service> [SETTING=value ...]"
    exit 1
fi

name=$1
shift
kill "$(cat logs/$name.pid)" 2>/dev/null
sleep 1
env "$@" bash scripts/start-all.sh | grep "$name"

if [ $# -gt 0 ]; then
    echo "$name restarted with $*"
else
    echo "$name restarted with normal settings"
fi
