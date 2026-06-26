#!/usr/bin/env bash
# equilibrium-json.sh — Delta equilibrium state emitter (JSON)
# Writes current cert state to public/equilibrium.json for Spaceship Earth.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PUB="$REPO_ROOT/public"
mkdir -p "$PUB"

RESULT='{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","mandatory":{"G0":"UNKNOWN","G1":"UNKNOWN","G2":"UNKNOWN"},"warnings":[],"stage":"VOID","entropy":0}'

# G0 Medical
CALCIUM=$(python3 -c "import json; d=json.load(open('$REPO_ROOT/medical-log.json')); print(d.get('serum_calcium_mg_dL',0))" 2>/dev/null || echo "0")
SPOONS=$(python3 -c "import json; d=json.load(open('$REPO_ROOT/spoon-state.json')); print(d.get('level',0))" 2>/dev/null || echo "0")
if python3 -c "import sys; print('1' if float('$CALCIUM') >= 8.0 else '0')" | grep -q 1 && [ "$SPOONS" -ge 3 ]; then
  RESULT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); d['mandatory']['G0']='PASS'; d['mandatory']['calcium_mg_dL']=$CALCIUM; d['mandatory']['spoons']=$SPOONS; print(json.dumps(d))")
else
  RESULT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); d['mandatory']['G0']='FAIL'; print(json.dumps(d))")
fi

# G1 Token Debt (scrubbed report)
if [ -f "$REPO_ROOT/quantum-polisher-report.json" ]; then
  python3 "$REPO_ROOT/scripts/cert-scrub-report.py" >/dev/null 2>&1 || true
  HARDCODED=$(python3 -c "import json; r=json.load(open('$REPO_ROOT/quantum-polisher-report.json')); print(sum(p['layer_2'].get('hardcoded_count',0) for p in r['projects'].values()))")
  REDEFS=$(python3 -c "import json; r=json.load(open('$REPO_ROOT/quantum-polisher-report.json')); print(sum(p['layer_2'].get('redefinition_count',0) for p in r['projects'].values()))")
  if [ "$HARDCODED" -eq 0 ] && [ "$REDEFS" -eq 0 ]; then
    RESULT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); d['mandatory']['G1']='PASS'; d['mandatory']['hardcoded']=$HARDCODED; d['mandatory']['redefinitions']=$REDEFS; print(json.dumps(d))")
  else
    RESULT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); d['mandatory']['G1']='FAIL'; print(json.dumps(d))")
  fi
else
  RESULT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); d['mandatory']['G1']='WARN'; d['warnings'].append('polisher report missing'); print(json.dumps(d))")
fi

# G2 Architecture (project-type-aware)
G2_FAIL=0
KNOWN_PROJECTS=(bonding frontend p31-delta-hiring p31-hearing-ops p31-pwa p31ca sovereign-command-center spaceship-earth spoon-calculator)
for proj in "${KNOWN_PROJECTS[@]}"; do
  path="$REPO_ROOT/software/$proj"
  [ -d "$path" ] || continue
  PASS_PROJ=false
  if [ -f "$path/package.json" ] && grep -q '"@p31/shared"' "$path/package.json" 2>/dev/null; then
    PASS_PROJ=true
  fi
  if [ "$PASS_PROJ" = "false" ] && ls "$path"/tailwind.config.* >/dev/null 2>&1; then
    if grep -rq "p31Preset" "$path"/tailwind.config.* 2>/dev/null; then
      PASS_PROJ=true
    fi
  fi
  if [ "$PASS_PROJ" = "false" ]; then
    if grep -rq "@import.*css-variables" "$path" --include="*.css" 2>/dev/null; then
      PASS_PROJ=true
    fi
  fi
  if [ "$PASS_PROJ" = "false" ]; then
    G2_DETAIL="$G2_DETAIL $proj"
    G2_FAIL=1
  fi
done
if [ "$G2_FAIL" -eq 0 ]; then
  RESULT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); d['mandatory']['G2']='PASS'; d['mandatory']['projects_checked']=${#KNOWN_PROJECTS[@]}; print(json.dumps(d))")
else
  RESULT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); d['mandatory']['G2']='FAIL'; d['warnings'].append('missing adoption:$G2_DETAIL'); print(json.dumps(d))")
fi

# Stage derivation
python3 -c "
import sys,json
raw=sys.stdin.read()
d=json.loads(raw) if raw.strip() else {}
g=d.get('mandatory',{})
stage='VOID'
if g.get('G0')=='PASS' and g.get('G1')=='PASS' and g.get('G2')=='PASS':
    hardcoded=int(g.get('hardcoded',0))
    redefs=int(g.get('redefinitions',0))
    entropy=hardcoded+redefs
    if entropy==0:
        stage='FRUIT'
    else:
        stage='BLOOM'
elif g.get('G0')=='PASS':
    stage='SEED'
else:
    stage='VOID'
d['stage']=stage
d['entropy']=int(d.get('mandatory',{}).get('hardcoded',0)) + int(d.get('mandatory',{}).get('redefinitions',0))
print(json.dumps(d))
" <<< "$RESULT" > "$PUB/equilibrium.json"

echo "$PUB/equilibrium.json"
