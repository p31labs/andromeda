import { useEffect, useRef, useState } from 'react'
export function useBioregulation() {
  const [isRegulating, setIsRegulating] = useState(false)
  const audioContextRef = useRef(null)
  const pinkNoiseRef = useRef(null)
  const binauralRef = useRef(null)
  const createPinkNoise = (audioContext) => {
    const bufferSize = 2 * audioContext.sampleRate
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
    const output = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      output[i] = (lastOut + (0.02 * white)) / 1.02
      lastOut = output[i]
      output[i] *= 3.5
    }
    const noise = audioContext.createBufferSource()
    noise.buffer = buffer; noise.loop = true
    const filter = audioContext.createBiquadFilter()
    filter.type = 'lowpass'; filter.frequency.value = 800; filter.Q.value = 0.5
    const gain = audioContext.createGain()
    gain.gain.value = 0.15
    noise.connect(filter); filter.connect(gain)
    return { noise, gain, filter }
  }
  const createBinauralBeat = (audioContext) => {
    const leftOsc = audioContext.createOscillator()
    const rightOsc = audioContext.createOscillator()
    leftOsc.frequency.value = 132; rightOsc.frequency.value = 138
    const leftGain = audioContext.createGain()
    const rightGain = audioContext.createGain()
    leftGain.gain.value = 0.08; rightGain.gain.value = 0.08
    const merger = audioContext.createChannelMerger(2)
    leftOsc.connect(leftGain); rightOsc.connect(rightGain)
    leftGain.connect(merger, 0, 0); rightGain.connect(merger, 0, 1)
    return { leftOsc, rightOsc, merger, leftGain, rightGain }
  }
  const startRegulation = async () => {
    if (isRegulating) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioContextRef.current = new AudioContext()
      const pinkNoise = createPinkNoise(audioContextRef.current)
      pinkNoiseRef.current = pinkNoise
      const binaural = createBinauralBeat(audioContextRef.current)
      binauralRef.current = binaural
      const masterGain = audioContextRef.current.createGain()
      masterGain.gain.value = 0.3
      gainNodeRef.current = masterGain
      pinkNoise.gain.connect(masterGain)
      pinkNoise.noise.start()
      binaural.merger.connect(masterGain)
      binaural.leftOsc.start(); binaural.rightOsc.start()
      masterGain.connect(audioContextRef.current.destination)
      triggerHaptics()
      setIsRegulating(true)
    } catch (err) { console.warn('Audio regulation failed:', err) }
  }
  const stopRegulation = () => {
    if (!isRegulating) return
    try {
      if (pinkNoiseRef.current) pinkNoiseRef.current.noise.stop()
      if (binauralRef.current) {
        binauralRef.current.leftOsc.stop()
        binauralRef.current.rightOsc.stop()
      }
      if (audioContextRef.current) audioContextRef.current.close()
    } catch (err) { console.warn('Error stopping regulation:', err) }
    pinkNoiseRef.current = null
    binauralRef.current = null
    audioContextRef.current = null
    gainNodeRef.current = null
    setIsRegulating(false)
  }
  const triggerHaptics = () => {
    if ('vibrate' in navigator) {
      try { navigator.vibrate([200, 100, 200, 100, 200]) } catch (err) {}
    }
  }
  const gainNodeRef = useRef(null)
  useEffect(() => { return () => { stopRegulation() } }, [])
  return { isRegulating, startRegulation, stopRegulation, triggerHaptics }
}
