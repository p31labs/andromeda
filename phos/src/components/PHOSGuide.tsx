import React, { useState, useCallback } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { routeIntent, containsCrisis } from '../lib/IntentEngine';
import { cancelSpeech } from '../lib/VoiceEngine';
import { logIntentRouted, logGuardianActivated } from '../lib/EventLogger';
import { phosAPI } from '../lib/phos-api';

/**
 * PHOSGuide — Floating bottom-right dot that expands into a panel.
 *
 * Reads shared spoon state from AtmosphereContext.
 * If spoons ≤ 1, enters safety mode: strips animations, colors,
 * and shows a minimal prompt.
 *
 * Text submission runs through IntentEngine (deterministic routing)
 * and calls setSurface() to transition the entire UI.
 */
const PHOSGuide: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [inputText, setInputText] = useState('');

  const {
    preset,
    grayRock,
    spoons,
    setSpoons,
    setSurface,
    currentSurface,
  } = useAtmosphere();

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Route through deterministic IntentEngine
    const target = routeIntent(trimmed, spoons);

    // Log the intent route
    logIntentRouted(trimmed, target, spoons);

    // If crisis detected, also force Gray Rock
    if (containsCrisis(trimmed) || target === 'GREETING') {
      // Crisis surfaces always mean low spoons response
      setSpoons(1);
    }

    // Navigate to the resolved surface
    setSurface(target);

    // Update URL to reflect the new surface
    const url = new URL(window.location.href);
    url.searchParams.set('surface', target.toLowerCase());
    window.history.replaceState({}, '', url.toString());

    // Clear input
    setInputText('');

    // Collapse guide after routing
    setExpanded(false);
  }, [inputText, spoons, setSurface, setSpoons]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  /**
   * Guardian Panic Protocol — ultimate circuit breaker.
   * 1. Kill all audio immediately
   * 2. Set spoons to 0 (triggers Gray Rock)
   * 3. Force Gray Rock mode with ?urgent in URL
   * 4. Clear all input
   * 5. Close the guide panel
   */
  const handlePanic = useCallback(() => {
    // Log guardian activation
    logGuardianActivated(spoons);

    // Kill all speech immediately
    cancelSpeech();

    // Set spoons to 0 — triggers Gray Rock via setSpoons logic
    setSpoons(0);

    // Force Gray Rock in URL
    const url = new URL(window.location.href);
    url.searchParams.set('urgent', 'true');
    window.history.replaceState({}, '', url.toString());

    // Fire crisis alert to worker (non-blocking, fire-and-forget)
    phosAPI.sendCrisisAlert({
      surface: currentSurface,
      spoons: 0,
      message: 'Guardian Protocol activated — operator in crisis',
    }).catch(() => {});

    // Clear input and collapse panel
    setInputText('');
    setExpanded(false);
  }, [setSpoons, currentSurface]);

  // ---- Safety mode: spoons ≤ 1 ----
  const isSafetyMode = spoons <= 1;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Expanded Panel */}
      {expanded && (
        <div
          className={`rounded-lg p-4 w-72 shadow-2xl ${
            isSafetyMode ? 'animate-none' : 'animate-slide-up'
          }`}
          style={{
            backgroundColor: grayRock ? '#111111' : '#121212',
            borderColor: grayRock
              ? '#555555'
              : isSafetyMode
              ? '#ff335544'
              : `${preset.palette.primary}44`,
            borderWidth: 1,
            borderStyle: 'solid',
          }}
        >
          <h3
            className="font-mono text-sm mb-3 tracking-wider uppercase"
            style={{
              color: grayRock
                ? '#888888'
                : isSafetyMode
                ? '#ff3355'
                : preset.palette.primary,
            }}
          >
            {isSafetyMode ? '⚫ Safety Mode' : 'PHOS Guide'}
          </h3>

          {/* Safety / Normal description */}
          {isSafetyMode ? (
            <p className="text-xs font-mono text-gray-500 mb-3">
              Cognitive load critical. Awaiting vital inputs only.
            </p>
          ) : (
            <p className="text-xs font-mono text-gray-500 mb-3">
              Tell PHOS what you need. Intent routed deterministically.
            </p>
          )}

          {/* Intent Input */}
          <div className="mb-3">
            <label
              className="font-mono text-xs block mb-1"
              style={{ color: grayRock ? '#666666' : '#888888' }}
            >
              What do you need?
            </label>
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isSafetyMode
                  ? 'Type a vital command...'
                  : 'Type your intent...'
              }
              className="w-full bg-black border rounded px-2 py-1.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none"
              style={{
                borderColor: grayRock
                  ? '#444444'
                  : isSafetyMode
                  ? '#ff335566'
                  : '#333333',
              }}
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            className="w-full py-1.5 px-3 rounded text-xs font-mono uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: grayRock
                ? '#222222'
                : isSafetyMode
                ? '#ff3355'
                : preset.palette.primary,
              color: grayRock || isSafetyMode ? '#cccccc' : '#000000',
            }}
          >
            Route
          </button>

          {/* Guardian Panic Button — always visible, always red */}
          <button
            onClick={handlePanic}
            className="w-full mt-2 py-2 px-3 rounded text-xs font-mono uppercase tracking-wider font-bold transition-all duration-150 hover:scale-[1.02]"
            style={{
              backgroundColor: grayRock ? '#330000' : '#cc0011',
              color: '#ffffff',
              border: '1px solid',
              borderColor: grayRock ? '#662222' : '#ff3355',
              boxShadow: grayRock ? 'none' : '0 0 12px rgba(204, 0, 17, 0.4)',
            }}
          >
            ⚠ PANIC — Guardian Protocol
          </button>

          <div className="mt-3 text-[10px] font-mono text-gray-600">
            Surface: {currentSurface.replace(/_/g, ' ')} · Spoons: {spoons}/5
            {isSafetyMode && ' · ⚫ Gray Rock'}
          </div>
        </div>
      )}

      {/* Floating Dot */}
      <button
        onClick={toggleExpand}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: grayRock
            ? '#111111'
            : isSafetyMode
            ? '#331111'
            : '#121212',
          borderColor: grayRock
            ? '#555555'
            : isSafetyMode
            ? '#ff3355'
            : `${preset.palette.primary}88`,
          borderWidth: 1,
          borderStyle: 'solid',
        }}
        aria-label={expanded ? 'Close PHOS Guide' : 'Open PHOS Guide'}
      >
        <span
          className="text-lg font-mono font-bold"
          style={{
            color: grayRock
              ? '#888888'
              : isSafetyMode
              ? '#ff3355'
              : preset.palette.primary,
          }}
        >
          {isSafetyMode ? '!' : '?'}
        </span>
      </button>
    </div>
  );
};

export default PHOSGuide;
