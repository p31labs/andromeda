import { describe, expect, test } from 'vitest';
import { computeEigenTrust, TrustMatrix, TrustVector } from './eigenTrust';

describe('EigenTrust Algorithm', () => {
  test('should compute trust vector for simple network', () => {
    // Simple 3-node network
    const trustMatrix: TrustMatrix = {
      size: 3,
      values: [
        [0, 1, 0.5],  // Node 0 trusts: Node 1 (full), Node 2 (half)
        [0.5, 0, 0],  // Node 1 trusts: Node 0 (half)
        [0, 0.5, 0]   // Node 2 trusts: Node 1 (half)
      ]
    };

    // Pre-trusted nodes: only node 0 is trusted initially
    const preTrustedNodes: TrustVector = {
      values: [1, 0, 0]
    };

    const result = computeEigenTrust(trustMatrix, preTrustedNodes, {
      alpha: 0.15,
      epsilon: 1e-6,
      maxIterations: 100
    });

    // Result should be a valid trust vector
    expect(result.values).toHaveLength(3);
    
    // All values should be non-negative
    expect(result.values.every(v => v >= 0)).toBe(true);
    
    // Values should sum to approximately 1
    const sum = result.values.reduce((acc, v) => acc + v, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  test('should handle uniform trust matrix', () => {
    const trustMatrix: TrustMatrix = {
      size: 3,
      values: [
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0]
      ]
    };

    const preTrustedNodes: TrustVector = {
      values: [1, 0, 0]
    };

    const result = computeEigenTrust(trustMatrix, preTrustedNodes, {
      alpha: 0.15
    });

    expect(result.values).toHaveLength(3);
    expect(result.values.every(v => v >= 0)).toBe(true);
    
    const sum = result.values.reduce((acc, v) => acc + v, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  test('should return pre-trusted nodes when alpha is 1', () => {
    const trustMatrix: TrustMatrix = {
      size: 3,
      values: [
        [0, 1, 0.5],
        [0.5, 0, 0],
        [0, 0.5, 0]
      ]
    };

    const preTrustedNodes: TrustVector = {
      values: [1, 0, 0]
    };

    const result = computeEigenTrust(trustMatrix, preTrustedNodes, {
      alpha: 1.0,  // Should ignore trust matrix completely
      epsilon: 1e-6,
      maxIterations: 100
    });

    // With alpha = 1, result should be exactly pre-trusted nodes
    expect(result.values).toHaveLength(3);
    expect(result.values[0]).toBeCloseTo(1, 6);
    expect(result.values[1]).toBeCloseTo(0, 6);
    expect(result.values[2]).toBeCloseTo(0, 6);
  });

  test('should handle edge case of zero trust matrix', () => {
    const trustMatrix: TrustMatrix = {
      size: 3,
      values: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ]
    };

    const preTrustedNodes: TrustVector = {
      values: [1, 0, 0]
    };

    const result = computeEigenTrust(trustMatrix, preTrustedNodes, {
      alpha: 0.15
    });

    // With zero trust matrix, we expect a distribution that favors the pre-trusted node
    // but is influenced by the uniform distribution from normalization
    expect(result.values).toHaveLength(3);
    expect(result.values.every(v => v >= 0)).toBe(true);
    
    // Values should sum to approximately 1
    const sum = result.values.reduce((acc, v) => acc + v, 0);
    expect(sum).toBeCloseTo(1, 6);
    
    // The first element (pre-trusted node) should have the highest value
    expect(result.values[0]).toBeGreaterThan(result.values[1]);
    expect(result.values[0]).toBeGreaterThan(result.values[2]);
    
    // The other two should be equal due to symmetry
    expect(result.values[1]).toBeCloseTo(result.values[2], 6);
  });
});