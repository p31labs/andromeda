




    scores.push({ intent, score });








    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;










    this.init();
  }





    for (const listener of this.listeners) {
      listener(state);
    }

    // Dispatch global event
    window.dispatchEvent(new CustomEvent('p31:phos-state', { detail: state }));
  }

  transitionTo(newState, data = {}) {
    const oldState = this.state;
    this.state = newState;

    if (data.intent) {
      this.currentIntent = data.intent;
    }

    this.notify();

    console.log(`PHOS: ${oldState} → ${newState}`);





  handleVoiceInput(transcript) {
    const inference = inferIntent(transcript, this.context);


    if (inference.intent && inference.confidence >= 0.5) {
      this.transitionTo(PHOS_STATES.ROUTING, { intent: inference.intent });

      setTimeout(() => {
        this.transitionTo(PHOS_STATES.CONTENT, {



    if (chip.path) {
      this.transitionTo(PHOS_STATES.ROUTING, { intent: chip });

      setTimeout(() => {
        this.transitionTo(PHOS_STATES.CONTENT, {



      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      // Extract body content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const content = bodyMatch ? bodyMatch[1] : html;

      // Cache it
      this.contentCache.set(url, content);







    return this.voice.start();
  }



