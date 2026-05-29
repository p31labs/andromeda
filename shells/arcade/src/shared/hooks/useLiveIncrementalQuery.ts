import { useEffect, useState, useRef, useCallback } from 'react';
import { PGLiteDatabaseContract } from '../db/pglite-fallback';
import { SmallballState } from '../../games/smallball/engine/SmallballEngine';

// Initial state for Smallball
const initialSmallballState: SmallballState = {
  atBat: 'player1',
  pitcher: 'player2',
  batterStats: { contact: 70, control: 50 }, // Added missing properties
  pitcherStats: { contact: 50, control: 70 }, // Added missing properties
  balls: 0,
  strikes: 0,
  outs: 0,
  inning: 1,
  score: {
    home: 0,
    away: 0,
  },
  bases: {
    first: null,
    second: null,
    third: null,
  },
};

interface MatchEventRow {
  event_id: number;
  payload: string; // JSON string
}

// Reducer to apply events to the SmallballState
const eventReducer = (state: SmallballState, event: any): SmallballState => {
  let newState = { ...state };

  // Helper to advance runners
  const advanceRunners = (currentState: SmallballState): SmallballState => {
    let updatedBases = { ...currentState.bases };
    let updatedScore = { ...currentState.score };

    if (updatedBases.third) {
      updatedScore.home++; // Assuming home team is always batting for simplicity
    }
    updatedBases.third = updatedBases.second;
    updatedBases.second = updatedBases.first;
    updatedBases.first = currentState.atBat;

    return { ...currentState, bases: updatedBases, score: updatedScore };
  };

  if (event.type === 'PITCH') {
    // The payload should contain the outcome of the pitch (e.g., isStrike)
    const isStrike = event.isStrike;

    if (isStrike) {
      newState.strikes++;
      if (newState.strikes === 3) {
        newState.outs++;
        newState.strikes = 0;
        newState.balls = 0;
        if (newState.outs === 3) {
          newState.inning++;
          newState.outs = 0;
          // TODO: Switch between home and away
        }
      }
    } else {
      newState.balls++;
      if (newState.balls === 4) {
        newState.balls = 0;
        newState.strikes = 0;
        newState = advanceRunners(newState);
      }
    }
  } else if (event.type === 'HIT') {
    newState = advanceRunners(newState);
    newState.atBat = 'player' + (Math.floor(Math.random() * 9) + 1);
  }

  return newState;
};

export const useLiveIncrementalQuery = (
  pglite: PGLiteDatabaseContract,
  sessionId: string,
  gameId: string
) => {
  const [gameState, setGameState] = useState<SmallballState>(initialSmallballState);
  const lastProcessedEventId = useRef<number>(0);

  const fetchAndApplyNewEvents = useCallback(async () => {
    const result = await pglite.query(
      `SELECT event_id, payload FROM match_events WHERE session_id = ? AND game_id = ? AND event_id > ? ORDER BY event_id ASC`,
      [sessionId, gameId, lastProcessedEventId.current]
    );

    if (result.rows.length > 0) {
      setGameState((prevGameState: SmallballState) => {
        let updatedState = { ...prevGameState };
        for (const row of result.rows as MatchEventRow[]) {
          const eventPayload = JSON.parse(row.payload);
          updatedState = eventReducer(updatedState, eventPayload);
          lastProcessedEventId.current = Math.max(lastProcessedEventId.current, row.event_id);
        }
        return updatedState;
      });
    }
  }, [pglite, sessionId, gameId]);

  useEffect(() => {
    // Initial fetch of all events
    const initializeState = async () => {
      const result = await pglite.query(
        `SELECT event_id, payload FROM match_events WHERE session_id = ? AND game_id = ? ORDER BY event_id ASC`,
        [sessionId, gameId]
      );

      let reconciledState = { ...initialSmallballState };
      for (const row of result.rows as MatchEventRow[]) {
        const eventPayload = JSON.parse(row.payload);
        reconciledState = eventReducer(reconciledState, eventPayload);
        lastProcessedEventId.current = Math.max(lastProcessedEventId.current, row.event_id);
      }
      setGameState(reconciledState);
    };

    initializeState();

    // Set up polling for new events
    const interval = setInterval(fetchAndApplyNewEvents, 1000); // Poll every 1 second

    return () => clearInterval(interval);
  }, [pglite, sessionId, gameId, fetchAndApplyNewEvents]);

  return gameState;
};
