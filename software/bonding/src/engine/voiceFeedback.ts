
    // Use the native SpeechSynthesisUtterance constructor
    const SpeechSynthesisUtteranceClass = (window as unknown as { SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtterance }).SpeechSynthesisUtterance;
    if (!SpeechSynthesisUtteranceClass) return null;

    const preferredVoice = voices.find(v =>
}
