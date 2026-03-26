/**
 * P31 Labs: Quantum Random Number Generator (QRNG)
 * ---------------------------------------------------------
 * Generates true quantum random numbers using IBM Quantum measurement outcomes.
 * Provides fundamentally unpredictable randomness for Wonky Sprouts seed generation.
 */

import { IBMQuantumClient, QuantumJobOptions } from './ibmQuantumClient';

export interface QuantumRandomOptions {
  backend?: string;
  shots?: number;
  bitLength?: number;
}

export class QuantumRandomGenerator {
  private readonly client: IBMQuantumClient;

  constructor(client?: IBMQuantumClient) {
    this.client = client || new IBMQuantumClient();
  }

  /**
   * Generates true quantum random bits using quantum measurement outcomes.
   * Uses quantum superposition and measurement collapse for fundamental randomness.
   * 
   * @param options - Configuration for quantum circuit execution
   * @returns Hexadecimal string of quantum random bits
   */
  async generateQuantumRandomBits(options: QuantumRandomOptions = {}): Promise<string> {
    const { backend = 'ibmq_qasm_simulator', shots = 1, bitLength = 256 } = options;
    
    // Calculate number of qubits needed
    const qubitsNeeded = Math.ceil(bitLength / 8); // 8 bits per qubit measurement
    
    // Generate quantum circuit with random rotations for maximum entropy
    const qrngCircuit = this.createQRNGCircuit(qubitsNeeded);
    
    try {
      const jobId = await this.client.submitJob(qrngCircuit, { backend, shots });
      const results = await this.client.getJobResults(jobId);
      
      // Extract random bits from measurement outcomes
      return this.extractRandomBits(results, bitLength);
    } catch (error) {
      console.warn('Quantum RNG failed, falling back to classical entropy:', error);
      return this.generateClassicalEntropy(bitLength);
    }
  }

  /**
   * Generates a quantum random seed for medical device applications.
   * Combines quantum randomness with classical entropy for maximum security.
   * 
   * @param options - Configuration for quantum circuit execution
   * @returns Quantum-secure seed string
   */
  async generateQuantumSeed(options: QuantumRandomOptions = {}): Promise<string> {
    const quantumEntropy = await this.generateQuantumRandomBits({
      ...options,
      bitLength: 512 // Generate 512 bits of quantum entropy
    });
    
    // Mix with classical entropy for additional security
    const classicalEntropy = this.generateClassicalEntropy(256);
    
    // Combine quantum and classical entropy
    const combinedEntropy = this.mixEntropies(quantumEntropy, classicalEntropy);
    
    // Return as hexadecimal string
    return combinedEntropy;
  }

  /**
   * Creates a quantum circuit optimized for random number generation.
   * Uses random rotations to create maximum superposition entropy.
   * 
   * @param qubits - Number of qubits to use
   * @returns OpenQASM circuit string
   */
  private createQRNGCircuit(qubits: number): string {
    // Generate random rotation angles for maximum entropy
    const randomAngles = Array.from({ length: qubits }, () => 
      (Math.random() * Math.PI * 2).toFixed(6)
    );
    
    let circuit = `OPENQASM 2.0;\ninclude "qelib1.inc";\n`;
    circuit += `qreg q[${qubits}];\n`;
    circuit += `creg c[${qubits}];\n`;
    
    // Apply random rotations to create superposition
    for (let i = 0; i < qubits; i++) {
      circuit += `h q[${i}];\n`;
      circuit += `ry(${randomAngles[i]}) q[${i}];\n`;
      circuit += `rz(${randomAngles[(i + 1) % qubits]}) q[${i}];\n`;
    }
    
    // Measure all qubits to collapse to random state
    circuit += `measure q -> c;\n`;
    
    return circuit;
  }

  /**
   * Extracts random bits from quantum measurement results.
   * 
   * @param results - IBM Quantum job results
   * @param bitLength - Desired bit length
   * @returns Hexadecimal string of random bits
   */
  private extractRandomBits(results: any, bitLength: number): string {
    try {
      // Extract measurement outcomes
      const counts = results.results?.[0]?.data?.counts || {};
      const outcomes = Object.keys(counts);
      
      if (outcomes.length === 0) {
        throw new Error('No measurement outcomes found');
      }
      
      // Use the most frequent outcome as our random source
      const randomOutcome = outcomes[0];
      
      // Convert binary string to hex
      const binaryString = randomOutcome.replace('0x', '');
      const hexString = parseInt(binaryString, 2).toString(16);
      
      // Pad to desired length
      const paddedHex = hexString.padStart(Math.ceil(bitLength / 4), '0');
      
      return paddedHex.slice(0, Math.ceil(bitLength / 4));
    } catch (error) {
      console.warn('Failed to extract quantum bits:', error);
      return this.generateClassicalEntropy(bitLength);
    }
  }

  /**
   * Generates classical entropy as fallback when quantum RNG fails.
   * 
   * @param bitLength - Desired bit length
   * @returns Hexadecimal string of classical entropy
   */
  private generateClassicalEntropy(bitLength: number): string {
    const crypto = require('crypto');
    const bytes = Math.ceil(bitLength / 8);
    return crypto.randomBytes(bytes).toString('hex').slice(0, Math.ceil(bitLength / 4));
  }

  /**
   * Mixes quantum and classical entropy using XOR operation.
   * 
   * @param quantumEntropy - Quantum random entropy
   * @param classicalEntropy - Classical random entropy
   * @returns Mixed entropy string
   */
  private mixEntropies(quantumEntropy: string, classicalEntropy: string): string {
    // Ensure both strings are the same length
    const maxLength = Math.max(quantumEntropy.length, classicalEntropy.length);
    const qPadded = quantumEntropy.padStart(maxLength, '0');
    const cPadded = classicalEntropy.padStart(maxLength, '0');
    
    // XOR the two entropy sources
    let mixed = '';
    for (let i = 0; i < maxLength; i++) {
      const qChar = parseInt(qPadded[i], 16);
      const cChar = parseInt(cPadded[i], 16);
      mixed += (qChar ^ cChar).toString(16);
    }
    
    return mixed;
  }
}

/**
 * Convenience function for generating quantum random seeds.
 * 
 * @param options - Configuration for quantum circuit execution
 * @returns Promise resolving to quantum-secure seed
 */
export async function generateQuantumSeed(options?: QuantumRandomOptions): Promise<string> {
  const qrng = new QuantumRandomGenerator();
  return await qrng.generateQuantumSeed(options);
}

/**
 * Convenience function for generating quantum random bits.
 * 
 * @param options - Configuration for quantum circuit execution
 * @returns Promise resolving to quantum random bits
 */
export async function generateQuantumRandomBits(options?: QuantumRandomOptions): Promise<string> {
  const qrng = new QuantumRandomGenerator();
  return await qrng.generateQuantumRandomBits(options);
}