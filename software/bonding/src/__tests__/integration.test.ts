
      const result = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');

      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');
      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');
      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');


      await pushState(state);

      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');


      await pushState(state);

      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');


      await pushState(state);

      const { code } = await createRoom('Host', 'var(--color-phosphor)', 'seed');
      const { playerId } = await joinRoom(code, 'Joiner', '#00D4FF', 'seed');

      // Send ping
      await sendPing(playerId, '💜', 'Hello!');

      const { code: code1 } = await createRoom('Player1', 'var(--color-phosphor)', 'seed');
      const { room: room2 } = await joinRoom(code1, 'Player2', '#00D4FF', 'seed');

      const { code } = await createRoom('TestPlayer', 'var(--color-phosphor)', 'seed');

      expect(isConnected()).toBe(true);

      leaveRoom();

      const { code, playerId } = await createRoom('Bash', 'var(--color-phosphor)', 'seed');
      expect(isConnected()).toBe(true);




      // Step 5: Verify final state
      const stored = localStorage.getItem(`bonding_room_${code}`);
      const room = JSON.parse(stored!) as Room;


      // Step 6: Send a ping to celebrate
      await sendPing(playerId, '✨', 'Water! 💧');


});
