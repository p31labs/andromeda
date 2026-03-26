# P31 Labs: Quantum Bridge Services

Post-Quantum Cryptography primitives and IBM Quantum Runtime API client for P31 Labs projects.

## 🛡️ Post-Quantum Cryptography (PQC) Primitives

### Phase 1: SHA-256 to SHA-512 Upgrade

Replace vulnerable SHA-256 hashes with quantum-safe SHA-512:

```typescript
import { generateQuantumSafeHash } from '@p31labs/quantum-core';

// Before (vulnerable to Grover's Algorithm)
const hash = crypto.createHash('sha256').update(data).digest('hex');

// After (quantum-safe)
const hash = generateQuantumSafeHash(data);
```

### Phase 2/3: SHAKE256 Extendable-Output Function

For advanced quantum-resistant signature schemes:

```typescript
import { generateShake256Hash } from '@p31labs/quantum-core';

// Generate 512-bit hash
const hash = generateShake256Hash(data, 64);

// Generate custom length hash
const customHash = generateShake256Hash(data, 32); // 256 bits
```

### Quantum-Safe Random Seed Generation

```typescript
import { generateQuantumSafeSeed } from '@p31labs/quantum-core';

// Generate 512 bits of high-entropy random data
const seed = generateQuantumSafeSeed();
```

## 🚀 IBM Quantum Runtime API Client

### Setup

1. Create a free account at [IBM Quantum Platform](https://quantum.ibm.com/)
2. Get your API token from the dashboard
3. Add to your `.env` file:
   ```
   IBM_QUANTUM_TOKEN=your_token_here
   ```

### Basic Usage

```typescript
import { IBMQuantumClient } from '@p31labs/quantum-core';

const client = new IBMQuantumClient();

// Define a Bell State circuit (entanglement)
const bellStateCircuit = `
OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
cx q[0],q[1];
measure q[0] -> c[0];
measure q[1] -> c[1];
`;

// Submit job to simulator
const jobId = await client.submitJob(bellStateCircuit, {
  backend: 'ibmq_qasm_simulator',
  shots: 1024
});

// Get results
const results = await client.getJobResults(jobId);
console.log('Quantum job results:', results);
```

### Wonky Sprouts Integration

For Wonky Sprouts entanglement generation:

```typescript
import { IBMQuantumClient } from '@p31labs/quantum-core';

const client = new IBMQuantumClient();

// Custom entanglement circuit for Wonky Sprouts
const wonkySproutCircuit = `
OPENQASM 2.0;
include "qelib1.inc";
qreg q[3];
creg c[3];
h q[0];
cx q[0],q[1];
cx q[1],q[2];
measure q[0] -> c[0];
measure q[1] -> c[1];
measure q[2] -> c[2];
`;

const jobId = await client.submitJob(wonkySproutCircuit, {
  backend: 'ibmq_qasm_simulator',
  shots: 2048
});
```

## 📦 Installation

```bash
npm install @p31labs/quantum-core
```

## 🔧 Building

```bash
cd packages/quantum-core
npm install
npm run build
```

## 🎯 Use Cases

- **GitHub Actions**: Replace SHA-256 in CI/CD pipelines
- **Discord Oracle**: Secure message hashing for bot communications
- **IPFS Manager**: Quantum-safe content addressing
- **Wonky Sprouts**: Real quantum entanglement for project states
- **Tetrahedron Protocol**: Quantum-enhanced geometric computations

## 🛡️ Security Notes

- SHA-512 provides 256 bits of post-quantum security
- SHAKE256 is NIST-approved for post-quantum applications
- IBM Quantum API uses secure authentication and encryption
- All quantum operations are sandboxed and monitored

## 📚 Documentation

- [IBM Quantum Runtime API](https://quantum-computing.ibm.com/runtime)
- [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [OpenQASM 3.0 Specification](https://openqasm.com/)