 *
 * Isolates the MLS Communication Mesh (ephemeral, forward-secret)
 * from the Phenix Financial Vault (immutable, legal-ledger).
 *
 * Memory Policy: Vault keys are flushed to null on lock to prevent
   * Overwrites session storage values with null before removal

