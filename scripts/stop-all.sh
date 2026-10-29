#!/bin/bash
cd "$(dirname "$0")/.."

for name in catalog inventory payment notification booking; do
    if [ -f logs/$name.pid ]; then
        kill $(cat logs/$name.pid) 2>/dev/null
        rm logs/$name.pid
        echo "stopped $name"
    fi
done
