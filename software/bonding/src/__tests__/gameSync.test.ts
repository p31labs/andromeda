
      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');


      for (let i = 0; i < 1000; i++) {
        const { code } = await createRoom(`Player${i}`, 'var(--color-phosphor)', 'seed');
        codes.add(code);
      }

      const result = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');

      await createRoom('Host', 'var(--color-phosphor)', 'seed');

      const { code } = await createRoom('Host', 'var(--color-phosphor)', 'seed');

      const result = await joinRoom(code, 'Joiner', '#00D4FF', 'seed');

      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');


      // Wait for initial poll
      await new Promise(r => setTimeout(r, 100));
      expect(pollCount).toBeGreaterThan(0);

      stopPolling();




      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');

      expect(getConnectionStatus()).toBe('connected');


      await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');
      expect(getConnectionStatus()).toBe('connected');

      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');


      // Start polling
      startPolling(() => {}, 100);

      // Wait for poll
      await new Promise(r => setTimeout(r, 200));

      // In mock mode, we should see the room sync
      // The reconnected event fires when failures recover
      cleanup();

      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');


      // Two rapid pushes
      await pushState(state);
      await pushState(state);

      // Wait for debounce (2s) + buffer
      await new Promise(r => setTimeout(r, 2100));


      await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');

      // Start polling to establish connection
      startPolling(() => {}, 100);
      await new Promise(r => setTimeout(r, 100));

      expect(isConnected()).toBe(true);


      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');

      expect(localStorage.getItem(`bonding_room_${code}`)).toBeTruthy();


      await new Promise(r => setTimeout(r, 150));

      await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');
      expect(isConnected()).toBe(true);

      _resetForTest();


      // Manually emit for testing
      // In real implementation, this comes from relayFetchRoom
      cleanup();

      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');


      await new Promise(r => setTimeout(r, 200));
      const countBeforeHide = pollCount;

      // Simulate tab hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      await new Promise(r => setTimeout(r, 200));

      // Should not have polled while hidden
      // (timing may vary)

      // Restore
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

