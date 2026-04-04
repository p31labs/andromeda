#!/bin/bash
set -e

TOKEN="${ZENODO_TOKEN}"
FILE="/home/p31/andromeda/01_ADMIN/P31_Consciousness_Memory_Architecture.pdf"
API="https://zenodo.org/api"

if [ -z "$TOKEN" ]; then
  echo "ERROR: ZENODO_TOKEN not set"
  exit 1
fi

echo "Step 1: Create deposition..."
DEPOSITION=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}' \
  "$API/deposit/depositions")

DEPOSITION_ID=$(echo "$DEPOSITION" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")
BUCKET_URL=$(echo "$DEPOSITION" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['links']['bucket'])")

echo "  Deposition ID: $DEPOSITION_ID"
echo "  Bucket URL: $BUCKET_URL"

echo "Step 2: Upload PDF..."
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  --upload-file "$FILE" \
  "$BUCKET_URL/P31_Consciousness_Memory_Architecture.pdf" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  File uploaded:', d.get('key','?'), d.get('size','?'), 'bytes')"

echo "Step 3: Set metadata..."
curl -s -X PUT \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "metadata": {
      "title": "Consciousness, Memory, and the Architecture of Self-Preservation: Neuroscientific Foundations for Cognitive Prosthetic Design",
      "upload_type": "publication",
      "publication_type": "preprint",
      "description": "Third paper in the P31 Labs research trilogy. Synthesizes evidence across cognitive psychology, computational neuroscience, and digital systems architecture to establish theoretical foundations for cognitive prosthetic design. Companion to the Tetrahedron Protocol (10.5281/zenodo.18627420) and Genesis Whitepaper (10.5281/zenodo.19411363).",
      "creators": [{"name": "Johnson, William R.", "affiliation": "P31 Labs, Inc.", "orcid": "0009-0002-2492-9079"}],
      "keywords": ["cognitive prosthetics","predictive processing","neural entrainment","context-dependent memory","delta topology","loosely coupled architecture","digital zeitgebers","knowledge externalization","belief change","trauma","neurodivergent","assistive technology","Posner molecule","tetrahedron protocol"],
      "related_identifiers": [
        {"identifier": "10.5281/zenodo.18627420", "relation": "isSupplementTo", "scheme": "doi"},
        {"identifier": "10.5281/zenodo.19411363", "relation": "isSupplementTo", "scheme": "doi"}
      ],
      "license": "cc-by-4.0",
      "access_right": "open",
      "language": "eng"
    }
  }' \
  "$API/deposit/depositions/$DEPOSITION_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  Metadata set. State:', d.get('state','?'))"

echo ""
echo "Step 4: Draft created. DO NOT auto-publish."
echo ""
echo "  Edit URL: https://zenodo.org/deposit/$DEPOSITION_ID"
echo ""
echo "Before publishing in the Zenodo web UI:"
echo "  1. Add related identifiers (isSupplementTo both DOIs)"
echo "  2. Confirm ORCID: 0009-0002-2492-9079"
echo "  3. Set affiliation: P31 Labs, Inc."
echo "  4. Resource type: Preprint"
echo "  5. License: CC BY 4.0"
echo "  6. Then click Publish → DOI minted"
