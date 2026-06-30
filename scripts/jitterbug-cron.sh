python3 scripts/quantum-polisher.py >> "$LOG" 2>&1
python3 scripts/jitterbug-daemon.py >> "$LOG" 2>&1

git add grading-index.json GRADING_REPORT.md jitterbug-state.json jitterbug-depressed-queue.json jitterbug-signals.json spoon-state.json quantum-polisher-report.json >> "$LOG" 2>&1 || true
