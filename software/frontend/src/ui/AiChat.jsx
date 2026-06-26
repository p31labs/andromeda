          setMessages(prev => [...prev, {
            type: 'auth_request',

    // 2. Trigger the Decryption
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.ciphertext) return;

    const plaintext = await decryptNode(node.ciphertext, node.accessControlConditions);

      <div
