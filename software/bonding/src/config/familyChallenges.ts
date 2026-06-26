    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
    (7 * 24 * 60 * 60 * 1000)
  );


  const now = new Date();
  const expires = new Date(state.expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));


export default FAMILY_CHALLENGES;
