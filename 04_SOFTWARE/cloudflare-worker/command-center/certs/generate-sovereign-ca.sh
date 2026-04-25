#!/bin/bash
# Generate Sovereign Root CA for P31 Labs
# This CA is used for mTLS authentication in the G.O.D. Dashboard

set -e

echo "=== Generating P31 Sovereign Root CA ==="

# Create directories
mkdir -p certs/{private,certs,csr}

# Generate Root CA private key (4096-bit RSA)
echo "Generating Root CA private key..."
openssl genrsa -out certs/private/p31-sovereign-root.key 4096

# Create Root CA certificate
echo "Creating Root CA certificate..."
openssl req -x509 -new -nodes \
  -key certs/private/p31-sovereign-root.key \
  -sha256 -days 3650 \
  -out certs/certs/p31-sovereign-root.crt \
  -subj "/C=US/ST=GA/L=Camden/O=P31 Labs/CN=P31 Sovereign Root CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

echo "Root CA certificate created: certs/certs/p31-sovereign-root.crt"

# Generate Intermediate CA
echo "Generating Intermediate CA..."
openssl genrsa -out certs/private/p31-device-intermediate.key 4096

openssl req -new \
  -key certs/private/p31-device-intermediate.key \
  -out certs/csr/p31-device-intermediate.csr \
  -subj "/C=US/ST=GA/O=P31 Labs/CN=Device Authentication Intermediate"

# Sign Intermediate CA with Root CA
openssl x509 -req \
  -in certs/csr/p31-device-intermediate.csr \
  -CA certs/certs/p31-sovereign-root.crt \
  -CAkey certs/private/p31-sovereign-root.key \
  -CAcreateserial \
  -out certs/certs/p31-device-intermediate.crt \
  -days 1825 \
  -sha256 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign")

echo "Intermediate CA created: certs/certs/p31-device-intermediate.crt"

# Create certificate chain
cat certs/certs/p31-device-intermediate.crt certs/certs/p31-sovereign-root.crt > certs/certs/p31-ca-chain.crt

echo "Certificate chain created: certs/certs/p31-ca-chain.crt"
echo ""
echo "=== Next Steps ==="
echo "1. Upload p31-sovereign-root.crt to Cloudflare Zero Trust"
echo "2. Configure mTLS policy in Cloudflare Access"
echo "3. Provision SE050 devices with client certificates"
echo "4. Deploy worker with mTLS verification"
