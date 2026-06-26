
    const storedKeys = await get(indexKey, logStore) || [];

    // Fetch all log entries
    const entries = await Promise.all(
      storedKeys.map((k: string) => get(k, logStore))
    );

    const logKeys = await get(indexKey, logStore) || [];

// Delete all log entries
    await Promise.all(
      logKeys.map((k: string) => del(k, logStore))
    );

