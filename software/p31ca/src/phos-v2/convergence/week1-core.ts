
  const report = await master.converge(1);


  const success = voiceState?.status === 'active' &&
                  brosState?.status === 'active' &&
                  routerState?.status === 'active';


