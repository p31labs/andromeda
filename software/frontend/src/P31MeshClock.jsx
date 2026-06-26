  muted: 'var(--color-muted)'

    switch (type) {
      case 'message:new':
        triggerQuantumEvent(
          payload.decrypted ? 'Secure Payload' : 'Encrypted Burst',
          `Data from ${payload.senderId}`,
          payload.decrypted ? colors.teal : colors.muted,





