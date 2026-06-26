



  // Convert to base64
  let base64 = btoa(String.fromCharCode(...data));





  const tokens = loadUCANTokens();
  tokens.push(token);
  saveUCANTokens(tokens);


    // Find matching token
    const token = tokens.find(t =>
      t.token === tokenString &&
      t.expiresAt > Date.now()
    );

