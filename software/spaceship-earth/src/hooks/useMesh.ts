
    init().catch((err) => {
      console.error('[useMesh] ignite failed:', err);
      setIsMeshActive(false);
      setConnectionState('disconnected');
    });
}
