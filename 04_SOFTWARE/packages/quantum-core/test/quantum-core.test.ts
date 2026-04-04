import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SicPovmSwarmManager,
  SicPovmSwarmFactory,
  QuantumServiceManager,
  QuantumSystemMonitor,
  MLKEM,
  MLDSA,
  HybridPQCScheme,
  generateQuantumSafeHash,
  generateShake256Hash,
  generateQuantumSafeSeed,
  generateQuantumSafeHMAC,
  generateQuantumSafeCID,
  verifyQuantumSafeIntegrity,
  CalciumHomeostasisCost,
  RecoveryTimeCost,
} from "../src/index";

// ═══════════════════════════════════════════════════════════════
// PQC PRIMITIVES
// ═══════════════════════════════════════════════════════════════

describe("PQC Primitives", () => {
  it("generateQuantumSafeHash returns SHA-512 (128 hex chars)", () => {
    const hash = generateQuantumSafeHash("test");
    expect(hash).toHaveLength(128);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("generateQuantumSafeHash is deterministic", () => {
    const h1 = generateQuantumSafeHash("same input");
    const h2 = generateQuantumSafeHash("same input");
    expect(h1).toBe(h2);
  });

  it("generateQuantumSafeHash produces different hashes for different inputs", () => {
    const h1 = generateQuantumSafeHash("input A");
    const h2 = generateQuantumSafeHash("input B");
    expect(h1).not.toBe(h2);
  });

  it("generateShake256Hash produces variable-length output", () => {
    const short = generateShake256Hash("test", 16);
    const long = generateShake256Hash("test", 128);
    expect(short).toHaveLength(32); // 16 bytes = 32 hex
    expect(long).toHaveLength(256); // 128 bytes = 256 hex
  });

  it("generateQuantumSafeSeed returns 128 hex chars (512 bits)", () => {
    const seed = generateQuantumSafeSeed();
    expect(seed).toHaveLength(128);
  });

  it("generateQuantumSafeSeed produces unique values", () => {
    const s1 = generateQuantumSafeSeed();
    const s2 = generateQuantumSafeSeed();
    expect(s1).not.toBe(s2);
  });

  it("generateQuantumSafeHMAC produces consistent output", () => {
    const mac1 = generateQuantumSafeHMAC("secret", "data");
    const mac2 = generateQuantumSafeHMAC("secret", "data");
    expect(mac1).toBe(mac2);
    expect(mac1).toHaveLength(128);
  });

  it("generateQuantumSafeHMAC produces different output for different keys", () => {
    const mac1 = generateQuantumSafeHMAC("key1", "data");
    const mac2 = generateQuantumSafeHMAC("key2", "data");
    expect(mac1).not.toBe(mac2);
  });

  it("generateQuantumSafeCID produces IPFS-compatible CID", () => {
    const cid = generateQuantumSafeCID("test content");
    expect(cid).toMatch(/^bafybeih/);
    expect(cid).toHaveLength(60); // prefix(8) + hash(52)
  });

  it("verifyQuantumSafeIntegrity passes for valid data", () => {
    const data = "integrity test";
    const hash = generateQuantumSafeHash(data);
    expect(verifyQuantumSafeIntegrity(data, hash)).toBe(true);
  });

  it("verifyQuantumSafeIntegrity fails for tampered data", () => {
    const data = "integrity test";
    const hash = generateQuantumSafeHash(data);
    expect(verifyQuantumSafeIntegrity("tampered", hash)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// ML-KEM (FIPS 203)
// ═══════════════════════════════════════════════════════════════

describe("ML-KEM (FIPS 203)", () => {
  let kem: MLKEM;

  beforeEach(() => {
    kem = new MLKEM({ securityLevel: 3 });
  });

  it("generates key pair with non-empty buffers", () => {
    const keys = kem.generateKeyPair();
    expect(keys.publicKey.length).toBeGreaterThan(0);
    expect(keys.privateKey.length).toBeGreaterThan(0);
    expect(keys.encapsulationKey.length).toBeGreaterThan(0);
  });

  it("generates different key pairs each time", () => {
    const k1 = kem.generateKeyPair();
    const k2 = kem.generateKeyPair();
    expect(k1.publicKey.equals(k2.publicKey)).toBe(false);
  });

  it("encapsulate returns ciphertext and shared secret", () => {
    const keys = kem.generateKeyPair();
    const result = kem.encapsulate(keys.publicKey);
    expect(result.ciphertext.length).toBeGreaterThan(0);
    expect(result.sharedSecret.length).toBeGreaterThan(0);
  });

  it("supports all three security levels", () => {
    for (const level of [1, 3, 5] as const) {
      const k = new MLKEM({ securityLevel: level });
      const keys = k.generateKeyPair();
      expect(keys.publicKey.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// ML-DSA (FIPS 204)
// ═══════════════════════════════════════════════════════════════

describe("ML-DSA (FIPS 204)", () => {
  let dsa: MLDSA;

  beforeEach(() => {
    dsa = new MLDSA({ securityLevel: 3 });
  });

  it("generates key pair with non-empty buffers", () => {
    const keys = dsa.generateKeyPair();
    expect(keys.publicKey.length).toBeGreaterThan(0);
    expect(keys.privateKey.length).toBeGreaterThan(0);
  });

  it("sign produces signature with r, s, c components", () => {
    const keys = dsa.generateKeyPair();
    const message = Buffer.from("test message");
    const sig = dsa.sign(message, keys.privateKey, keys.publicKey);
    expect(sig.r.length).toBeGreaterThan(0);
    expect(sig.s.length).toBeGreaterThan(0);
    expect(sig.c.length).toBeGreaterThan(0);
  });

  it("verify returns true for valid signature", () => {
    const keys = dsa.generateKeyPair();
    const message = Buffer.from("test message");
    const sig = dsa.sign(message, keys.privateKey, keys.publicKey);
    expect(dsa.verify(message, sig, keys.publicKey)).toBe(true);
  });

  it("verify returns false for tampered message", () => {
    const keys = dsa.generateKeyPair();
    const message = Buffer.from("test message");
    const sig = dsa.sign(message, keys.privateKey, keys.publicKey);
    expect(dsa.verify(Buffer.from("tampered"), sig, keys.publicKey)).toBe(
      false,
    );
  });

  it("supports all three security levels", () => {
    for (const level of [1, 3, 5] as const) {
      const d = new MLDSA({ securityLevel: level });
      const keys = d.generateKeyPair();
      const msg = Buffer.from("test");
      const sig = d.sign(msg, keys.privateKey, keys.publicKey);
      expect(d.verify(msg, sig, keys.publicKey)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// HYBRID PQC SCHEME
// ═══════════════════════════════════════════════════════════════

describe("HybridPQCScheme", () => {
  it("generates both ML-KEM and ML-DSA key pairs", () => {
    const scheme = new HybridPQCScheme(3);
    const keys = scheme.generateHybridKeyPair();
    expect(keys.mlkemKeys.publicKey.length).toBeGreaterThan(0);
    expect(keys.mldsaKeys.publicKey.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// SIC-POVM SWARM
// ═══════════════════════════════════════════════════════════════

describe("SIC-POVM Swarm Manager", () => {
  it("initializes d² agents for dimension d", () => {
    const swarm = new SicPovmSwarmManager({ dimension: 2 });
    expect(swarm.getAgentCount()).toBe(4);
    expect(swarm.getConfig().dimension).toBe(2);
  });

  it("agent overlap equals 1/(d+1)", () => {
    const swarm = new SicPovmSwarmManager({ dimension: 2 });
    expect(swarm.getAgentOverlap()).toBeCloseTo(1 / 3, 5);
  });

  it("executes biological tomography and returns health payload", async () => {
    const swarm = new SicPovmSwarmManager({ dimension: 2 });
    const state = new Float32Array([0.8, 0.5, 0.3, 0.7]);
    const result = await swarm.executeBiologicalTomography(state);
    expect(["OPTIMAL", "ATTENTION", "CRASH_WARNING"]).toContain(result.status);
    expect(result.pqcSecured).toBe(true);
    expect(result.primaryMetric).toBeGreaterThan(0);
  });

  it("detects crash state for low calcium", async () => {
    const swarm = new SicPovmSwarmManager({ dimension: 2 });
    const crashState = new Float32Array([0.1, 0.1, 0.9, 0.5]);
    const result = await swarm.executeBiologicalTomography(crashState);
    expect(result.status).toBe("CRASH_WARNING");
    expect(result.actionableAdvice).toContain("Calcium");
  });

  it("detects optimal state for high values", async () => {
    const swarm = new SicPovmSwarmManager({ dimension: 2 });
    const optimalState = new Float32Array([0.9, 0.8, 0.85, 0.9]);
    const result = await swarm.executeBiologicalTomography(optimalState);
    expect(result.status).toBe("OPTIMAL");
  });

  it("tracks state history", async () => {
    const swarm = new SicPovmSwarmManager({ dimension: 2 });
    const state = new Float32Array([0.8, 0.5, 0.3, 0.7]);
    await swarm.executeBiologicalTomography(state);
    expect(swarm.getStateHistory().length).toBe(1);
  });

  it("factory creates HypoPT swarm (d=2)", () => {
    const swarm = SicPovmSwarmFactory.createHypoPTswarm();
    expect(swarm.getAgentCount()).toBe(4);
  });

  it("factory creates full panel swarm (d=3)", () => {
    const swarm = SicPovmSwarmFactory.createFullPanelSwarm();
    expect(swarm.getAgentCount()).toBe(9);
  });

  it("factory creates calcium-only swarm (d=1)", () => {
    const swarm = SicPovmSwarmFactory.createCalciumOnlySwarm();
    expect(swarm.getAgentCount()).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// QUANTUM SERVICE MANAGER
// ═══════════════════════════════════════════════════════════════

describe("Quantum Service Manager", () => {
  let manager: QuantumServiceManager;

  beforeEach(() => {
    manager = new QuantumServiceManager();
  });

  it("registers services successfully", () => {
    manager.registerService({
      name: "test-sim",
      endpoint: "https://test.p31labs.org",
      maxConcurrency: 10,
      healthCheckInterval: 60000,
      timeout: 300000,
      retryAttempts: 3,
      weight: 1,
    });
    const stats = manager.getServiceStats();
    expect(stats["test-sim"]).toBeDefined();
    expect(stats["test-sim"].status).toBe("HEALTHY");
  });

  it("returns load balancing metrics", () => {
    const metrics = manager.getLoadBalancingMetrics();
    expect(metrics.totalServices).toBe(0);
    expect(metrics.loadBalancerStrategy).toBe("response-time");
  });
});

// ═══════════════════════════════════════════════════════════════
// QAOA COST FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe("QAOA Cost Functions", () => {
  it("CalciumHomeostasisCost evaluates deviation", () => {
    const cost = new CalciumHomeostasisCost();
    expect(cost.evaluate([8.5], 8.5)).toBe(0);
    expect(cost.evaluate([7.0], 8.5)).toBeGreaterThan(0);
  });

  it("CalciumHomeostasisCost computes gradient", () => {
    const cost = new CalciumHomeostasisCost();
    const grad = cost.gradient([8.0], 8.5);
    expect(grad[0]).toBeCloseTo(-1.0, 5);
  });

  it("RecoveryTimeCost returns 0 when calcium is at target", () => {
    const cost = new RecoveryTimeCost();
    expect(cost.evaluate([8.5, 0.25, 1.0], 8.5)).toBe(0);
  });

  it("RecoveryTimeCost returns positive cost when below target", () => {
    const cost = new RecoveryTimeCost();
    expect(cost.evaluate([7.0, 0.25, 1.0], 8.5)).toBeGreaterThan(0);
  });
});
