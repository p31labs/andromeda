export function useSovereignData() {
  return {
    data: [],
    isLoading: false,
    error: null,
    addVaultItem: () => {},
    deleteVaultItem: () => {},
    subscribeToChanges: () => {},
    initializeVault: () => {},
  };
}
