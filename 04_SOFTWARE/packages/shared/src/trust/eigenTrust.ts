/**
 * EigenTrust Algorithm Implementation
 * 
 * Implements the EigenTrust trust management algorithm as specified in the BROS architecture.
 * The trust vector is iteratively computed to prevent rogue sub-networks from gaining legitimacy.
 * By pulling the eigenvector back toward pre-trusted genesis nodes (P31 clinical architects),
 * the system stabilizes.
 * 
 * Mathematical formulation:
 * t^(k+1) = (1 - a) * C^T * t^(k) + a * p
 * 
 * Where:
 * - C is the matrix of local trust values (c_ij)
 * - p is the vector of pre-trusted genesis nodes
 * - a is the bias parameter anchoring the graph to safe nodes (typically 0.1-0.2)
 */

export interface EigenTrustOptions {
  /** Bias parameter (0 < a < 1), typically 0.1-0.2 */
  alpha?: number;
  /** Convergence threshold */
  epsilon?: number;
  /** Maximum number of iterations */
  maxIterations?: number;
}

export interface TrustMatrix {
  /** Number of nodes in the network */
  size: number;
  /** Trust values matrix where trustMatrix[i][j] represents trust from node i to node j */
  values: number[][];
}

export interface TrustVector {
  /** Trust values for each node */
  values: number[];
}

/**
 * Computes the EigenTrust vector for a given trust matrix
 * 
 * @param trustMatrix - Matrix of local trust values
 * @param preTrustedNodes - Vector of pre-trusted genesis nodes (should sum to 1)
 * @param options - Configuration options for the algorithm
 * @returns Trust vector representing global trust values for each node
 */
export function computeEigenTrust(
  trustMatrix: TrustMatrix,
  preTrustedNodes: TrustVector,
  options: EigenTrustOptions = {}
): TrustVector {
  const {
    alpha = 0.15,      // Default bias parameter
    epsilon = 1e-6,    // Default convergence threshold
    maxIterations = 100 // Default maximum iterations
  } = options;

  const n = trustMatrix.size;
  
  // Validate inputs
  if (trustMatrix.values.length !== n || trustMatrix.values[0].length !== n) {
    throw new Error('Trust matrix must be square');
  }
  
  if (preTrustedNodes.values.length !== n) {
    throw new Error('Pre-trusted nodes vector must match matrix size');
  }
  
  // Normalize the trust matrix to get C (column stochastic matrix)
  const C = normalizeTrustMatrix(trustMatrix);
  
  // Initialize trust vector with uniform distribution
  let trustVector: number[] = Array(n).fill(1.0 / n);
  
  // Precompute (1 - alpha) * C^T
  const CT = transposeMatrix(C);
  const scalingFactor = 1 - alpha;
  const weightedCT = matrixScalarMultiply(CT, scalingFactor);
  
  // Precompute alpha * p
  const alphaP = vectorScalarMultiply(preTrustedNodes.values, alpha);
  
  // Iterative computation
  for (let iter = 0; iter < maxIterations; iter++) {
    // Compute next trust vector: t^(k+1) = (1-a)C^T t^k + ap
    const nextTrustVector = matrixVectorMultiply(weightedCT, trustVector);
    
    // Add alpha * p
    for (let i = 0; i < n; i++) {
      nextTrustVector[i] += alphaP[i];
    }
    
    // Check for convergence
    const diff = vectorDifference(nextTrustVector, trustVector);
    const norm = vectorNorm(diff);
    
    if (norm < epsilon) {
      trustVector = nextTrustVector;
      break;
    }
    
    trustVector = nextTrustVector;
  }
  
  // Ensure the trust vector sums to 1 (normalize)
  const sum = trustVector.reduce((acc, val) => acc + val, 0);
  if (sum > 0) {
    trustVector = trustVector.map(val => val / sum);
  }
  
  return { values: trustVector };
}

/**
 * Normalizes a trust matrix to make it column stochastic
 * Each column sums to 1
 */
function normalizeTrustMatrix(matrix: TrustMatrix): number[][] {
  const n = matrix.size;
  const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  
  // Copy original values
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result[i][j] = Math.max(0, matrix.values[i][j]); // Ensure non-negative
    }
  }
  
  // Normalize columns
  for (let j = 0; j < n; j++) {
    let colSum = 0;
    for (let i = 0; i < n; i++) {
      colSum += result[i][j];
    }
    
    if (colSum > 0) {
      for (let i = 0; i < n; i++) {
        result[i][j] /= colSum;
      }
    } else {
      // If column sum is 0, distribute evenly (trust no one specifically)
      for (let i = 0; i < n; i++) {
        result[i][j] = 1.0 / n;
      }
    }
  }
  
  return result;
}

/**
 * Transposes a matrix
 */
function transposeMatrix(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j];
    }
  }
  
  return result;
}

/**
 * Multiplies a matrix by a scalar
 */
function matrixScalarMultiply(matrix: number[][], scalar: number): number[][] {
  return matrix.map(row => row.map(val => val * scalar));
}

/**
 * Multiplies a matrix by a vector
 */
function matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[] = Array(rows).fill(0);
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[i] += matrix[i][j] * vector[j];
    }
  }
  
  return result;
}

/**
 * Computes the difference between two vectors
 */
function vectorDifference(v1: number[], v2: number[]): number[] {
  return v1.map((val, i) => val - v2[i]);
}

/**
 * Computes the Euclidean norm of a vector
 */
function vectorNorm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Multiplies a vector by a scalar
 */
function vectorScalarMultiply(vector: number[], scalar: number): number[] {
  return vector.map(val => val * scalar);
}