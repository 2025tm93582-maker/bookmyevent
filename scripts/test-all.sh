#!/bin/bash
cd "$(dirname "$0")/.."
mkdir -p evidence/tests

for name in catalog inventory payment notification booking; do
    echo "$name"
    (cd services/$name && npm test > ../../evidence/tests/$name-unit-tests.txt 2>&1)
    grep -E "(pass|fail) [0-9]+$" evidence/tests/$name-unit-tests.txt
done
