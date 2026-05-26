// P31 Smallball: Training Hub
// Main training dashboard with player cards, station selector, energy bars

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../db/PGLiteProvider';
import { useSpoons } from './SpoonShell';
import type { 
  Player, 
  TrainingStation, 
  MinigameResult, 
  Attribute,
  TrainingMode,
} from '../types';
import { IronMikeGame } from './training/IronMikeGame';
import { TrackSledsGame } from './training/TrackSledsGame';
import { BullpenGame } from './training/BullpenGame';
import { PopFlyGame } from './training/PopFlyGame';
import { FilmRoomGame } from './training/FilmRoomGame';
import { STATION_CONFIGS, ATTRIBUTE_DISPLAY_NAMES, getFacilityPack } from '../data/facilities';
import { executeTraining, calculateCurrentEnergy } from '../engine/training';
import type { FacilityState } from '../engine/facilities';

interface TrainingHubProps {
  franchiseId?: string;
}

interface PlayerWithStats extends Player {
  currentEnergy: number;
  maxEnergy: number;
  stats: Record<string, number>;
}

export function TrainingHub({ franchiseId }: TrainingHubProps) {
  const { db } = useDatabase();
  const { spoonState } = useSpoons();
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null);
  const [selectedStation, setSelectedStation] = useState<TrainingStation | null>(null);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('MANUAL');
  const [facilities, setFacilities] = useState<FacilityState[]>([]);
  const [packTier, setPackTier] = useState<'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX'>('SANDLOT');
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState(false);
  const [lastResult, setLastResult] = useState<MinigameResult | null>(null);
  const [message, setMessage] = useState('');

  // Load players and facilities
  useEffect(() => {
    if (!db) return;
    
    const loadData = async () => {
      try {
        // Resolve franchise ID (prop or demo fallback)
        let franchiseIdResolved = franchiseId;
        if (!franchiseIdResolved) {
          const result = await db.query(
            'SELECT id FROM franchises WHERE owner_pubkey = $1',
            ['test-owner-001']
          );
          franchiseIdResolved = result.rows[0]?.id;
        }
        
        if (!franchiseIdResolved) {
          setLoading(false);
          return;
        }

        // Load players with current stats
        const playersResult = await db.query(`
          SELECT pe.*, pj.current_energy, pj.max_energy
          FROM player_effective_stats pe
          LEFT JOIN player_energy pj ON pe.id = pj.player_id
          WHERE pe.franchise_id = $1
        `, [franchiseIdResolved]);
        
        const playersWithStats: PlayerWithStats[] = playersResult.rows.map((row: any) => ({
          id: row.id,
          franchiseId: row.franchise_id,
          firstName: row.first_name,
          lastName: row.last_name,
          jerseyNumber: row.jersey_number,
          skinToneHex: row.skin_tone_hex,
          baseStats: {
            contact: row.contact ?? 50,
            power: row.power ?? 50,
            eye: row.eye ?? 50,
            bunt: row.bunt ?? 50,
            glove: row.glove ?? 50,
            range: row.range ?? 50,
            armStrength: row.arm_strength ?? 50,
            armAccuracy: row.arm_accuracy ?? 50,
            speed: row.speed ?? 50,
            stamina: row.stamina ?? 50,
            clutch: row.clutch ?? 50,
            baseballIq: row.baseball_iq ?? 50,
          },
          crdtClock: BigInt(0),
          currentEnergy: row.current_energy ?? 100,
          maxEnergy: row.max_energy ?? 100,
          stats: {
            contact: row.contact,
            power: row.power,
            eye: row.eye,
            bunt: row.bunt,
            glove: row.glove,
            range: row.range,
            armStrength: row.arm_strength,
            armAccuracy: row.arm_accuracy,
            speed: row.speed,
            stamina: row.stamina,
            clutch: row.clutch,
            baseballIq: row.baseball_iq,
          },
        }));
        
        setPlayers(playersWithStats);
        
        if (playersWithStats.length > 0 && !selectedPlayer) {
          setSelectedPlayer(playersWithStats[0]);
        }
        
        // Load facilities from DB
        const facilitiesResult = await db.query(
          `SELECT * FROM training_facilities WHERE franchise_id = $1`,
          [franchiseIdResolved]
        );
        if (facilitiesResult.rows.length > 0) {
          setFacilities(facilitiesResult.rows.map((r: any) => ({
            id: r.id,
            franchiseId: r.franchise_id,
            facilityType: r.facility_type,
            level: r.level,
            packTier: r.pack_tier,
          })));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load training data:', err);
        setLoading(false);
      }
    };
    
    loadData();
  }, [db, franchiseId, packTier, selectedPlayer]);

  const handleMinigameComplete = useCallback(async (result: MinigameResult) => {
    if (!selectedPlayer || !selectedStation || !db) return;
    
    setActiveGame(false);
    setLastResult(result);
    
    const fid = selectedPlayer.franchiseId;
    const facility = facilities.find(f => f.facilityType === selectedStation);
    const facilityLevel = facility?.level ?? 1;
    
    // Execute training in engine
    const trainingResult = executeTraining({
      playerId: selectedPlayer.id,
      franchiseId: fid,
      station: selectedStation,
      facilityLevel,
      packTier,
      currentEnergy: selectedPlayer.currentEnergy,
      isManual: trainingMode === 'MANUAL',
      minigameResult: result,
      crdtClock: BigInt(Date.now()),
      crdtNodeId: 'local',
    });
    
    // Save to database
    try {
      // Insert training event
      await db.query(`
        INSERT INTO training_events (
          event_type, player_id, franchise_id, station, 
          energy_spent, xp_gained, facility_level, was_manual, minigame_score,
          _crdt_clock, _crdt_node_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        'EXECUTE_MANUAL',
        selectedPlayer.id,
        fid,
        selectedStation,
        trainingResult.event.energySpent,
        JSON.stringify(trainingResult.event.xpGained),
        facilityLevel,
        trainingMode === 'MANUAL',
        result.score,
        trainingResult.event.crdtClock,
        trainingResult.event.crdtNodeId,
      ]);
      
      // Update player energy
      await db.query(`
        UPDATE player_energy 
        SET current_energy = $1, last_regen_timestamp = $2
        WHERE player_id = $3
      `, [trainingResult.newEnergy, Date.now(), selectedPlayer.id]);
      
      // Update local state
      setPlayers(prev => prev.map(p => 
        p.id === selectedPlayer.id 
          ? { ...p, currentEnergy: trainingResult.newEnergy }
          : p
      ));
      
      setSelectedPlayer(prev => prev ? { ...prev, currentEnergy: trainingResult.newEnergy } : null);
      
      // Show success message
      const xpEntries = Object.entries(trainingResult.event.xpGained);
      const xpMsg = xpEntries.length > 0 
        ? `+${xpEntries[0][1]} XP ${ATTRIBUTE_DISPLAY_NAMES[xpEntries[0][0] as Attribute]}`
        : 'Training complete';
      setMessage(`${xpMsg} (${result.score}/100 score)`);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save training:', err);
      setMessage('Error saving training');
    }
  }, [selectedPlayer, selectedStation, db, facilities, franchiseId, packTier, trainingMode]);

  const canTrain = (player: PlayerWithStats, station: TrainingStation): boolean => {
    const facility = facilities.find(f => f.facilityType === station);
    if (!facility) return false;
    
    const pack = getFacilityPack(packTier);
    if (!pack.unlockedStations.includes(station)) return false;
    
    const energyCost = Math.round(
      STATION_CONFIGS[station].energyCost * 
      pack.energyCostMultiplier * 
      (1 - (facility.level - 1) * 0.1)
    );
    
    return player.currentEnergy >= energyCost;
  };

  const getStationStatus = (station: TrainingStation) => {
    const pack = getFacilityPack(packTier);
    const unlocked = pack.unlockedStations.includes(station);
    
    if (!unlocked) return { status: 'LOCKED', color: '#666' };
    if (!selectedPlayer) return { status: 'NO_PLAYER', color: '#999' };
    if (!canTrain(selectedPlayer, station)) return { status: 'NO_ENERGY', color: '#f44336' };
    return { status: 'READY', color: '#4caf50' };
  };

  const renderMinigame = () => {
    if (!selectedStation || !activeGame) return null;
    
    const props = {
      spoonCount: spoonState,
      onComplete: handleMinigameComplete,
    };
    
    switch (selectedStation) {
      case 'IRON_MIKE':
        return <IronMikeGame {...props} onEarlyExit={() => setActiveGame(false)} />;
      case 'TRACK_SLEDS':
        return <TrackSledsGame {...props} />;
      case 'BULLPEN':
        return <BullpenGame {...props} />;
      case 'POP_FLY':
        return <PopFlyGame {...props} />;
      case 'FILM_ROOM':
        return <FilmRoomGame {...props} />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading training facilities...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Training Hub</h1>
        <div style={styles.packBadge}>{getFacilityPack(packTier).name}</div>
      </div>
      
      {message && <div style={styles.message}>{message}</div>}
      
      {/* Player Selector */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Select Player</h2>
        <div style={styles.playerList}>
          {players.map(player => (
            <button
              key={player.id}
              style={{
                ...styles.playerCard,
                ...(selectedPlayer?.id === player.id && styles.playerCardSelected),
              }}
              onClick={() => setSelectedPlayer(player)}
            >
              <div style={styles.playerNumber}>#{player.jerseyNumber}</div>
              <div style={styles.playerName}>{player.firstName} {player.lastName[0]}.</div>
              <div style={styles.energyBar}>
                <div 
                  style={{
                    ...styles.energyFill,
                    width: `${(player.currentEnergy / player.maxEnergy) * 100}%`,
                    backgroundColor: player.currentEnergy > 50 ? '#4caf50' : 
                                    player.currentEnergy > 25 ? '#ff9800' : '#f44336',
                  }}
                />
              </div>
              <div style={styles.energyText}>{player.currentEnergy}/{player.maxEnergy} EN</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Mode Selector */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Training Mode</h2>
        <div style={styles.modeButtons}>
          <button
            style={{
              ...styles.modeButton,
              ...(trainingMode === 'MANUAL' && styles.modeButtonSelected),
            }}
            onClick={() => setTrainingMode('MANUAL')}
          >
            Manual (+20% XP)
          </button>
          <button
            style={{
              ...styles.modeButton,
              ...(trainingMode === 'AUTO' && styles.modeButtonSelected),
            }}
            onClick={() => setTrainingMode('AUTO')}
            disabled={!selectedPlayer}
          >
            Auto-Schedule
          </button>
        </div>
      </div>
      
      {/* Station Selector or Active Minigame */}
      {activeGame ? (
        <div style={styles.minigameContainer}>
          {renderMinigame()}
        </div>
      ) : (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Training Stations</h2>
          <div style={styles.stationGrid}>
            {(Object.keys(STATION_CONFIGS) as TrainingStation[]).map(station => {
              const config = STATION_CONFIGS[station];
              const status = getStationStatus(station);
              const canUse = status.status === 'READY' && trainingMode === 'MANUAL';
              
              return (
                <button
                  key={station}
                  style={{
                    ...styles.stationCard,
                    borderColor: status.color,
                    opacity: canUse ? 1 : 0.5,
                  }}
                  onClick={() => {
                    if (canUse) {
                      setSelectedStation(station);
                      setActiveGame(true);
                    }
                  }}
                  disabled={!canUse}
                >
                  <div style={styles.stationName}>{config.name}</div>
                  <div style={styles.stationAttrs}>
                    {config.attributes.map(attr => ATTRIBUTE_DISPLAY_NAMES[attr]).join(' + ')}
                  </div>
                  <div style={{...styles.stationStatus, color: status.color}}>
                    {status.status === 'LOCKED' ? '🔒 Unlock in next pack' :
                     status.status === 'NO_ENERGY' ? '⚡ Need more energy' :
                     status.status === 'NO_PLAYER' ? 'Select a player' :
                     'Click to train'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Last Result */}
      {lastResult && !activeGame && (
        <div style={styles.lastResult}>
          <h3>Last Training</h3>
          <p>Station: {STATION_CONFIGS[lastResult.station].name}</p>
          <p>Score: {lastResult.score}/100</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto',
    color: 'white',
    fontFamily: 'system-ui, sans-serif',
  },
  loading: {
    padding: '2rem',
    textAlign: 'center',
    color: 'white',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 'bold',
  },
  packBadge: {
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '20px',
    fontWeight: 'bold',
  },
  message: {
    padding: '1rem',
    background: '#4caf50',
    borderRadius: '8px',
    marginBottom: '1rem',
    textAlign: 'center',
    animation: 'fadeIn 0.3s ease',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    marginBottom: '1rem',
    opacity: 0.9,
  },
  playerList: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  playerCard: {
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid transparent',
    borderRadius: '12px',
    cursor: 'pointer',
    minWidth: '120px',
    textAlign: 'center',
  },
  playerCardSelected: {
    borderColor: '#4fc3f7',
    background: 'rgba(79, 195, 247, 0.2)',
  },
  playerNumber: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#4fc3f7',
  },
  playerName: {
    fontSize: '0.9rem',
    marginBottom: '0.5rem',
  },
  energyBar: {
    height: '8px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.25rem',
  },
  energyFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  energyText: {
    fontSize: '0.75rem',
    opacity: 0.7,
  },
  modeButtons: {
    display: 'flex',
    gap: '1rem',
  },
  modeButton: {
    padding: '1rem 2rem',
    fontSize: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '2px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  modeButtonSelected: {
    borderColor: '#4caf50',
    background: 'rgba(76, 175, 80, 0.2)',
  },
  stationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  stationCard: {
    padding: '1.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid #666',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  stationName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  stationAttrs: {
    fontSize: '0.9rem',
    color: '#4fc3f7',
    marginBottom: '0.5rem',
  },
  stationStatus: {
    fontSize: '0.8rem',
    marginTop: '0.5rem',
  },
  minigameContainer: {
    marginTop: '1rem',
  },
  lastResult: {
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    marginTop: '1rem',
  },
};
