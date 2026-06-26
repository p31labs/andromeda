 *
 * Generates binaural/monaural oscillations at exactly 172.35 Hz and 863 Hz
 * to provide somatic grounding through the auditory/vestibular system.
 *
 * Section 2.2: Larmor Frequency Hardware Synchronization
 * Biological correspondence: Phosphorus-31 nucleus resonance
 *



    this.lfoGain = this.audioCtx.createGain();
    this.lfoGain.gain.setValueAtTime(0.02, this.audioCtx.currentTime); // Subtle 2% modulation


    this.primaryOsc = null;
    this.secondaryOsc = null;
    this.lfoNode = null;

}
