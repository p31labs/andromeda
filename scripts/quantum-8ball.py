#!/usr/bin/env python3
"""
Quantum Magic 8 Ball - Decision Engine for AuDHD operator
Reads spoon state, health logs, cognitive passport, and system state
to recommend optimal next action with weighting.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SPOON_STATE_PATH = REPO_ROOT / "spoon-state.json"
MEDICAL_LOG_PATH = REPO_ROOT / "medical-log.json"
COGNITIVE_PASSPORT_PATH = Path.home() / ".p31" / "cognitive-passport.json"
# If not exists, we can use a default in repo for now
DEFAULT_COGNITIVE_PASSPORT_PATH = REPO_ROOT / "cognitive-passport.json"

def load_json(path, default=None):
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception:
        return default

def main():
    # Load spoon state
    spoon_data = load_json(SPOON_STATE_PATH, {"level": 4})
    spoon_level = spoon_data.get("level", 4)
    
    # Load medical log
    medical_data = load_json(MEDICAL_LOG_PATH, {
        "serum_calcium_mg_dL": 8.0,
        "albumin_g_dL": 4.0,
        "last_updated": None,
        "notes": ""
    })
    calcium = medical_data.get("serum_calcium_mg_dL", 8.0)
    
    # Load cognitive passport (optional)
    cognitive = None
    if COGNITIVE_PASSPORT_PATH.exists():
        cognitive = load_json(COGNITIVE_PASSPORT_PATH)
    elif DEFAULT_COGNITIVE_PASSPORT_PATH.exists():
        cognitive = load_json(DEFAULT_COGNITIVE_PASSPORT_PATH)
    
    # Default cognitive passport values if not found
    if cognitive is None:
        cognitive = {
            "executive_function": {
                "task_initiation_weight": 0.8,
                "task_switching_cost": 0.7,
                "sequential_processing_preference": True,
                "asynchronous_communication_required": True
            },
            "sensory": {
                "fluorescent_lighting_penalty": 0.6,
                "unpredictable_wait_time_penalty": 0.7,
                "background_noise_threshold_db": 50,
                "preferred_work_hours": ["09:00", "12:00", "14:00", "17:00"]
            },
            "health_metrics": {
                "critical_lab_thresholds": {
                    "serum_calcium_mg_dL": 7.8,
                    "albumin_g_dL": 4.0,
                    "creatinine_mg_dL": 1.2
                },
                "chronic_conditions": ["hypoparathyroidism", "AuDHD"],
                "medication_adherence_required": True,
                "alertness_schedule": {
                    "peak": ["10:00", "14:00"],
                    "trough": ["15:00", "17:00"]
                }
            },
            "risk_tolerance": {
                "medical": 0.1,
                "financial": 0.4,
                "codebase_stability": 0.7
            },
            "preferred_parallelism": {
                "max_concurrent_tasks": 2,
                "auto_approve_threshold": 0.85
            }
        }
    
    # Extract useful values
    crit_ca = cognitive["health_metrics"]["critical_lab_thresholds"]["serum_calcium_mg_dL"]
    peak_hours = cognitive["health_metrics"]["alertness_schedule"]["peak"]
    trough_hours = cognitive["health_metrics"]["alertness_schedule"]["trough"]
    task_init_weight = cognitive["executive_function"]["task_initiation_weight"]
    task_switch_cost = cognitive["executive_function"]["task_switching_cost"]
    parallel_max = cognitive["preferred_parallelism"]["max_concurrent_tasks"]
    
    # Current time for peak/trough check
    now = datetime.now()
    current_hour = now.strftime("%H:%M")
    is_peak = any(current_hour >= start and current_hour <= end for start, end in 
                  [("10:00", "12:00"), ("14:00", "16:00")])  # simplify; we can parse properly
    # For simplicity, we'll just check if hour in 10-12 or 14-16
    hour_int = int(now.strftime("%H"))
    is_peak = (10 <= hour_int < 12) or (14 <= hour_int < 16)
    is_trough = (15 <= hour_int < 17)
    
    # Define actions
    actions = [
        {
            "id": "medical_call",
            "name": "Call Coastal Community Health",
            "base_priority": 10,
            "urgency_factor": 2.0 if calcium <= crit_ca else 1.0,
            "spoon_cost": 3,  # calling human, anxiety
            "exec_penalty": task_init_weight,  # starting new task
            "parallel_benefit": 0.5,  # can do while waiting? low
            "condition": lambda: True
        },
        {
            "id": "polisher_run",
            "name": "Run Quantum Polisher (scan only)",
            "base_priority": 5,
            "urgency_factor": 1.0,
            "spoon_cost": 1,
            "exec_penalty": task_init_weight,
            "parallel_benefit": 0.8,  # can run in background
            "condition": lambda: True
        },
        {
            "id": "dashboard_review",
            "name": "Review Jitterbug Dashboard",
            "base_priority": 2,
            "urgency_factor": 1.0 if spoon_level >= 3 else 1.5,  # if spoon low, need to check
            "spoon_cost": 1,
            "exec_penalty": task_init_weight,
            "parallel_benefit": 0.9,
            "condition": lambda: True
        },
        {
            "id": "macrophage_review",
            "name": "Review Macrophage PRs",
            "base_priority": 3,
            "urgency_factor": 1.0,
            "spoon_cost": 2,
            "exec_penalty": task_init_weight,
            "parallel_benefit": 0.6,
            "condition": lambda: True
        },
        {
            "id": "prep_medical_log",
            "name": "Prepare medical log for endocrinologist",
            "base_priority": 4,
            "urgency_factor": 1.5 if calcium <= crit_ca else 1.0,
            "spoon_cost": 2,
            "exec_penalty": task_init_weight,
            "parallel_benefit": 0.7,
            "condition": lambda: True
        },
        {
            "id": "rest",
            "name": "Rest / recover spoons",
            "base_priority": 1,
            "urgency_factor": 2.0 if spoon_level <= 2 else 1.0,
            "spoon_cost": -1,  # negative cost? actually resting gains spoons, but we treat as low cost
            "exec_penalty": 0.0,  # no initiation penalty
            "parallel_benefit": 0.0,
            "condition": lambda: spoon_level <= 3
        }
    ]
    
    # Compute scores
    scored_actions = []
    for act in actions:
        if not act["condition"]():
            continue
        # urgency modifier from health
        urgency = act["urgency_factor"]
        # spoon cost: higher cost reduces score
        spoon_cost = act["spoon_cost"]
        # executive function penalty: higher penalty reduces score
        exec_penalty = act["exec_penalty"]
        # parallel benefit: increases score
        parallel_benefit = act["parallel_benefit"]
        # time of day bonus: if peak, increase score for productive actions
        time_bonus = 1.2 if is_peak and act["id"] not in ["rest"] else (0.8 if is_trough and act["id"] == "rest" else 1.0)
        
        # Avoid division by zero or negative
        effective_cost = max(0.1, spoon_cost * exec_penalty)
        score = (act["base_priority"] * urgency * time_bonus * (1 + parallel_benefit)) / effective_cost
        
        scored_actions.append({
            "id": act["id"],
            "name": act["name"],
            "score": score,
            "urgency": urgency,
            "spoon_cost": spoon_cost,
            "exec_penalty": exec_penalty,
            "base_priority": act["base_priority"],
            "time_bonus": time_bonus
        })
    
    # Sort by score descending
    scored_actions.sort(key=lambda x: x["score"], reverse=True)
    
    # Output
    if len(sys.argv) > 1 and sys.argv[1] == "--json":
        result = {
            "timestamp": now.isoformat(),
            "spoon_level": spoon_level,
            "calcium_mg_dL": calcium,
            "recommended": scored_actions[0] if scored_actions else None,
            "alternatives": scored_actions[1:4] if len(scored_actions) > 1 else []
        }
        print(json.dumps(result, indent=2))
    else:
        print("=== Quantum Magic 8 Ball Recommendation ===")
        print(f"Time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Spoon Level: {spoon_level}/5")
        print(f"Serum Calcium: {calcium} mg/dL (critical <= {crit_ca})")
        print(f"Time of Day: {'PEAK' if is_peak else ('TROUGH' if is_trough else 'OFF')}")
        print()
        if scored_actions:
            rec = scored_actions[0]
            print(f"🎯 RECOMMENDED: {rec['name']}")
            print(f"   Score: {rec['score']:.2f}")
            print(f"   Why: Base priority {rec['base_priority']}, urgency {rec['urgency']:.1f}, "
                  f"spoon cost {rec['spoon_cost']}, exec penalty {rec['exec_penalty']:.1f}, "
                  f"time bonus {rec['time_bonus']:.2f}")
            print()
            print("🔄 ALTERNATIVES (parallel possible):")
            for alt in scored_actions[1:4]:
                print(f"   • {alt['name']} (score {alt['score']:.2f})")
            print()
            print("💡 Tip: Actions with higher score are better weighted given your context.")
        else:
            print("No actions available.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
