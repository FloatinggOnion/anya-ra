#!/bin/bash
# Measures cold startup time for Anya-RA release build
# Usage: ./scripts/measure-startup.sh

echo "Building release binary..."
cd "$(dirname "$0")/.."
pnpm tauri build

BINARY="./src-tauri/target/release/anya-ra"

if [ ! -f "$BINARY" ]; then
  echo "Binary not found at $BINARY"
  exit 1
fi

echo ""
echo "Measuring cold startup time (5 runs)..."
TIMES=()

for i in {1..5}; do
  echo "Run $i:"
  START=$(date +%s%N)
  "$BINARY" &
  PID=$!
  sleep 2
  END=$(date +%s%N)
  kill $PID 2>/dev/null
  ELAPSED=$(( (END - START) / 1000000 ))
  TIMES+=($ELAPSED)
  echo "  Elapsed: ${ELAPSED}ms"
  sleep 1
done

echo ""
TOTAL=0
for T in "${TIMES[@]}"; do
  TOTAL=$((TOTAL + T))
done
AVG=$((TOTAL / ${#TIMES[@]}))
echo "Average startup time: ${AVG}ms"

if [ $AVG -lt 500 ]; then
  echo "✓ PASS: Startup time meets <500ms target"
else
  echo "✗ FAIL: Startup time exceeds 500ms target (${AVG}ms)"
fi
