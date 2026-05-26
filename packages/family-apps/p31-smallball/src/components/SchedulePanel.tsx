// P31 Smallball: Schedule Panel
// Weekly focus and auto-scheduler UI
// For low-spoon days - set it and let the simulation run

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../db/hooks';
import type { 
  Player, 
  TrainingStation, 
  Attribute,
  ScheduledTraining,
} from '../types';
import { STATION_CONFIGS, ATTRIBUTE_DISPLAY_NAMES, isStationUnlocked } from '../data/facilities';
import { getFacilityPack } from '../data/facilities';

interface SchedulePanelProps {
  franchiseId: string;
  packTier: 'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX';
}

interface PlayerSchedule {
  playerId: string;
  playerName: string;
  primaryStation: TrainingStation | null;
  secondaryStation: TrainingStation | null;
  daysPerWeek: number;
  autoEnabled: boolean;
  focusAttribute: Attribute | 'BALANCED';
}

export function SchedulePanel({ franchiseId, packTier }: SchedulePanelProps) {
  const { db } = useDatabase();
  const [players, setPlayers] = useState<Player[]>([]);
  const [schedules, setSchedules] = useState<Record<string, PlayerSchedule>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load players and existing schedules
  useEffect(() => {
    if (!db) return;
    
    const loadData = async () => {
      try {
        // Load players
        const playersResult = await db.query(`
          SELECT id, first_name, last_name, jersey_number 
          FROM players 
          WHERE franchise_id = $1
        `, [franchiseId]);
        
        const loadedPlayers: Player[] = playersResult.rows.map((row: any) => ({
          id: row.id,
          franchiseId,
          firstName: row.first_name,
          lastName: row.last_name,
          jerseyNumber: row.jersey_number,
          skinToneHex: '#E8A87C',
          baseStats: {} as any,
          crdtClock: BigInt(0),
        }));
        
        setPlayers(loadedPlayers);
        
        // Load existing schedules
        const schedulesResult = await db.query(`
          SELECT player_id, station, focus_attribute, auto_enabled
          FROM scheduled_training
          WHERE player_id IN (
            SELECT id FROM players WHERE franchise_id = $1
          )
        `, [franchiseId]);
        
        const scheduleMap: Record<string, PlayerSchedule> = {};
        
        // Initialize default schedules for all players
        loadedPlayers.forEach(player => {
          scheduleMap[player.id] = {
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName[0]}.`,
            primaryStation: null,
            secondaryStation: null,
            daysPerWeek: 3,
            autoEnabled: false,
            focusAttribute: 'BALANCED',
          };
        });
        
        // Override with saved schedules
        schedulesResult.rows.forEach((row: any) => {
          if (scheduleMap[row.player_id]) {
            scheduleMap[row.player_id].primaryStation = row.station;
            scheduleMap[row.player_id].focusAttribute = row.focus_attribute as Attribute | 'BALANCED';
            scheduleMap[row.player_id].autoEnabled = row.auto_enabled;
          }
        });
        
        setSchedules(scheduleMap);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load schedules:', err);
        setLoading(false);
      }
    };
    
    loadData();
  }, [db, franchiseId]);

  const updateSchedule = useCallback((playerId: string, updates: Partial<PlayerSchedule>) => {
    setSchedules(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], ...updates },
    }));
  }, []);

  const saveSchedules = useCallback(async () => {
    if (!db) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      // Save each enabled schedule
      for (const schedule of Object.values(schedules)) {
        if (schedule.autoEnabled && schedule.primaryStation) {
          await db.query(`
            INSERT INTO scheduled_training (
              player_id, station, focus_attribute, auto_enabled, scheduled_at, _crdt_clock
            ) VALUES ($1, $2, $3, $4, NOW(), $5)
            ON CONFLICT (player_id) DO UPDATE SET
              station = EXCLUDED.station,
              focus_attribute = EXCLUDED.focus_attribute,
              auto_enabled = EXCLUDED.auto_enabled,
              scheduled_at = EXCLUDED.scheduled_at,
              _crdt_clock = EXCLUDED._crdt_clock
          `, [
            schedule.playerId,
            schedule.primaryStation,
            schedule.focusAttribute,
            schedule.autoEnabled,
            BigInt(Date.now()),
          ]);
        } else if (!schedule.autoEnabled) {
          // Delete schedule if disabled
          await db.query(`
            DELETE FROM scheduled_training WHERE player_id = $1
          `, [schedule.playerId]);
        }
      }
      
      setMessage('Schedules saved! Training will happen automatically.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save schedules:', err);
      setMessage('Error saving schedules');
    } finally {
      setSaving(false);
    }
  }, [db, schedules]);

  const getUnlockedStations = () => {
    const pack = getFacilityPack(packTier);
    return (Object.keys(STATION_CONFIGS) as TrainingStation[])
      .filter(station => pack.unlockedStations.includes(station));
  };

  const getStationAttributes = (station: TrainingStation | null): Attribute[] => {
    if (!station) return [];
    return STATION_CONFIGS[station].attributes;
  };

  if (loading) {
    return <div style={styles.loading}>Loading schedule panel...</div>;
  }

  const unlockedStations = getUnlockedStations();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Weekly Training Schedule</h1>
        <div style={styles.subtitle}>
          Set auto-training for low-spoon days
        </div>
      </div>
      
      {message && <div style={styles.message}>{message}</div>}
      
      <div style={styles.infoBox}>
        <strong>How it works:</strong> Enable auto-training and your players will 
        automatically train when you have energy. Check back to collect XP. 
        <span style={styles.note}> (Manual training gives +20% XP bonus)</span>
      </div>
      
      <div style={styles.playerList}>
        {players.map(player => {
          const schedule = schedules[player.id];
          if (!schedule) return null;
          
          return (
            <div key={player.id} style={styles.playerCard}>
              <div style={styles.playerHeader}>
                <div style={styles.playerInfo}>
                  <span style={styles.playerNumber}>#{player.jerseyNumber}</span>
                  <span style={styles.playerName}>{player.firstName} {player.lastName}</span>
                </div>
                <label style={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={schedule.autoEnabled}
                    onChange={(e) => updateSchedule(player.id, { autoEnabled: e.target.checked })}
                  />
                  <span>Auto-Train</span>
                </label>
              </div>
              
              {schedule.autoEnabled && (
                <div style={styles.scheduleConfig}>
                  <div style={styles.formRow}>
                    <label style={styles.label}>Primary Station:</label>
                    <select
                      value={schedule.primaryStation || ''}
                      onChange={(e) => updateSchedule(player.id, { 
                        primaryStation: e.target.value as TrainingStation || null 
                      })}
                      style={styles.select}
                    >
                      <option value="">Select station...</option>
                      {unlockedStations.map(station => (
                        <option key={station} value={station}>
                          {STATION_CONFIGS[station].name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={styles.formRow}>
                    <label style={styles.label}>Focus Attribute:</label>
                    <select
                      value={schedule.focusAttribute}
                      onChange={(e) => updateSchedule(player.id, { 
                        focusAttribute: e.target.value as Attribute | 'BALANCED'
                      })}
                      style={styles.select}
                    >
                      <option value="BALANCED">Balanced (all attributes)</option>
                      {getStationAttributes(schedule.primaryStation).map(attr => (
                        <option key={attr} value={attr}>
                          {ATTRIBUTE_DISPLAY_NAMES[attr]}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={styles.formRow}>
                    <label style={styles.label}>Days per week:</label>
                    <input
                      type="range"
                      min={1}
                      max={7}
                      value={schedule.daysPerWeek}
                      onChange={(e) => updateSchedule(player.id, { 
                        daysPerWeek: parseInt(e.target.value) 
                      })}
                      style={styles.slider}
                    />
                    <span>{schedule.daysPerWeek} days</span>
                  </div>
                  
                  {schedule.primaryStation && (
                    <div style={styles.preview}>
                      <strong>Training:</strong> {STATION_CONFIGS[schedule.primaryStation].name}
                      <br />
                      <strong>Attributes:</strong> {getStationAttributes(schedule.primaryStation)
                        .map(a => ATTRIBUTE_DISPLAY_NAMES[a]).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div style={styles.footer}>
        <button 
          style={styles.saveButton}
          onClick={saveSchedules}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Schedules'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1.5rem',
    maxWidth: '800px',
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
    marginBottom: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: '0.5rem',
  },
  message: {
    padding: '1rem',
    background: '#4caf50',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  infoBox: {
    padding: '1rem',
    background: 'rgba(79, 195, 247, 0.2)',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    borderLeft: '4px solid #4fc3f7',
  },
  note: {
    opacity: 0.7,
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  playerCard: {
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
  },
  playerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  playerNumber: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#4fc3f7',
    minWidth: '40px',
  },
  playerName: {
    fontSize: '1.1rem',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  scheduleConfig: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  formRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '0.75rem',
  },
  label: {
    minWidth: '120px',
    fontSize: '0.9rem',
  },
  select: {
    flex: 1,
    padding: '0.5rem',
    background: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
  },
  slider: {
    flex: 1,
  },
  preview: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
    fontSize: '0.9rem',
  },
  footer: {
    marginTop: '2rem',
    display: 'flex',
    justifyContent: 'center',
  },
  saveButton: {
    padding: '1rem 3rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
