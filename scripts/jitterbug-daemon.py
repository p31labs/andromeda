    "ui_ux_drift": {"CODE": 0.1, "DOCS": 0.1},
    # Phase 2.5: UI/UX fidelity modulation (from Quantum Polisher)
    polisher_path = REPO_ROOT / "quantum-polisher-report.json"
    if polisher_path.exists():
        try:
            polisher_data = json.loads(polisher_path.read_text(encoding="utf-8"))
            drift_signals = polisher_data.get("drift_signals", {})
            fidelity_count = 0
            for a_path, drift in drift_signals.items():
                relative_path = str(Path(a_path).relative_to(REPO_ROOT)) if REPO_ROOT in Path(a_path).parents else a_path
                if relative_path in artifact_map and relative_path not in overridden_paths:
                    a = artifact_map[relative_path]
                    fidelity = drift.get("ui_ux_fidelity", 50) / 100.0
                    for dim in ("CODE", "DOCS"):
                        base_boost = SIGNAL_STRENGTHS.get("ui_ux_drift", {}).get(dim, 0.0)
                        applied = base_boost * fidelity * signal_mult
                        if a.get("depressed"):
                            applied *= RECOVERY_BOOST
                        a["continuous_scores"][dim] = _clamp(a["continuous_scores"][dim] + applied)
                    fidelity_count += 1
            if fidelity_count > 0:
                print(f"  Phase 2.5: UI/UX fidelity ({fidelity_count} artifacts modulated)...", file=sys.stderr)
        except Exception:
            pass

