/**
 * P31 Labs: IBM Quantum Bridge
 * ---------------------------------------------------------
 * A lightweight Node.js client to interface with IBM Quantum's 
 * cloud infrastructure via the Qiskit Runtime REST API.
 */

export interface QuantumJobOptions {
  backend?: string;
  shots?: number;
}

export class IBMQuantumClient {
  private readonly apiToken: string;
  private readonly baseUrl: string = 'https://api.quantum-computing.ibm.com/runtime';

  constructor(apiToken?: string) {
    this.apiToken = apiToken || process.env.IBM_QUANTUM_TOKEN || '';
    if (!this.apiToken) {
      console.warn('⚠️ IBM_QUANTUM_TOKEN is missing. Quantum bridge operating in offline mode.');
    }
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Submits an OpenQASM 3.0 circuit to IBM Quantum for execution.
   * Useful for Wonky Sprouts entanglement generation or Tetrahedron Protocol logic.
   * 
   * @param qasmString - The quantum circuit defined in OpenQASM
   * @param options - Configuration (backend simulator vs actual QPU, shot count)
   * @returns The IBM Quantum Job ID
   */
  async submitJob(qasmString: string, options: QuantumJobOptions = {}): Promise<string> {
    const backend = options.backend || 'ibmq_qasm_simulator';
    const shots = options.shots || 1024;

    try {
      // Note: This matches the general structure of IBM's Runtime API payload.
      // Specific payload structure may vary based on Qiskit Runtime primitives (Sampler/Estimator).
      const response = await fetch(`${this.baseUrl}/jobs`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          program_id: 'sampler', // Using the standard Sampler primitive
          backend: backend,
          params: {
            circuits: [qasmString],
            run_options: { shots }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`IBM Quantum API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id; // Return the Job ID for tracking
    } catch (error) {
      console.error('Failed to submit quantum job:', error);
      throw error;
    }
  }

  /**
   * Polls the status and results of a submitted quantum job.
   * 
   * @param jobId - The ID returned by submitJob
   */
  async getJobResults(jobId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch job ${jobId}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch results for job ${jobId}:`, error);
      throw error;
    }
  }
}