// P31 Smallball: Facility Progression
// 3-tier facility pack system (Sandlot / HS Gym / Pro Complex)
// Shows upgrades and manages facility progression

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../db/hooks';
import type { TrainingStation } from '../types';
import { STATION_CONFIGS, FACILITY_PACKS, getFacilityPack } from '../data/facilities';
import type { FacilityState } from '../engine/facilities';
import { 
  canAffordPackUpgrade, 
  getNextPackTier, 
  calculateProgressToNextPack,
  comparePacks,
  canUpgradeFacility,
  getFacilityUpgradeCost,
} from '../engine/facilities';

interface FacilityProgressionProps {
  franchiseId: string;
  resinBalance: number;
  onPackUpgrade?: (newTier: 'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX') => void;
  onFacilityUpgrade?: (facilityType: TrainingStation) => void;
}

export function FacilityProgression({ 
  franchiseId, 
  resinBalance, 
  onPackUpgrade,
  onFacilityUpgrade,
}: FacilityProgressionProps) {
  const { db } = useDatabase();
  const [currentTier, setCurrentTier] = useState<'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX'>('SANDLOT');
  const [facilities, setFacilities] = useState<FacilityState[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showCompare, setShowCompare] = useState(false);

  // Load facilities from database
  useEffect(() => {
    if (!db) return;
    
    const loadFacilities = async () => {
      try {
        const result = await db.query(`
          SELECT id, facility_type, level, pack_tier
          FROM training_facilities
          WHERE franchise_id = $1
        `, [franchiseId]);
        
        const loadedFacilities: FacilityState[] = result.rows.map((row: any) => ({
          id: row.id,
          franchiseId,
          facilityType: row.facility_type as TrainingStation,
          level: row.level,
          packTier: row.pack_tier,
        }));
        
        setFacilities(loadedFacilities);
        
        // Determine current tier from facilities
        if (loadedFacilities.length > 0) {
          const tiers = loadedFacilities.map(f => f.packTier);
          const uniqueTiers = [...new Set(tiers)];
          // Use highest tier if mixed
          if (uniqueTiers.includes('PRO_COMPLEX')) {
            setCurrentTier('PRO_COMPLEX');
          } else if (uniqueTiers.includes('HS_GYM')) {
            setCurrentTier('HS_GYM');
          } else {
            setCurrentTier('SANDLOT');
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load facilities:', err);
        setLoading(false);
      }
    };
    
    loadFacilities();
  }, [db, franchiseId]);

  const handlePackUpgrade = useCallback(async () => {
    const nextTier = getNextPackTier(currentTier);
    if (!nextTier) return;
    
    const cost = FACILITY_PACKS[nextTier].cost;
    
    if (resinBalance < cost) {
      setMessage(`Need ${cost - resinBalance} more resin`);
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Update all facilities to new tier
    if (db) {
      try {
        await db.query(`
          UPDATE training_facilities
          SET pack_tier = $1, _crdt_clock = $2
          WHERE franchise_id = $3
        `, [nextTier, BigInt(Date.now()), franchiseId]);
        
        // Add any new stations for this tier
        const newStations = FACILITY_PACKS[nextTier].unlockedStations.filter(
          station => !facilities.some(f => f.facilityType === station)
        );
        
        for (const station of newStations) {
          await db.query(`
            INSERT INTO training_facilities (
              id, franchise_id, facility_type, level, pack_tier, _crdt_clock
            ) VALUES ($1, $2, $3, 1, $4, $5)
          `, [crypto.randomUUID(), franchiseId, station, nextTier, BigInt(Date.now())]);
        }
        
        setCurrentTier(nextTier);
        onPackUpgrade?.(nextTier);
        setMessage(`Upgraded to ${FACILITY_PACKS[nextTier].name}!`);
        setTimeout(() => setMessage(''), 3000);
      } catch (err) {
        console.error('Failed to upgrade pack:', err);
        setMessage('Error upgrading facility pack');
      }
    }
  }, [currentTier, resinBalance, facilities, db, franchiseId, onPackUpgrade]);

  const handleFacilityUpgrade = useCallback(async (facilityType: TrainingStation) => {
    const facility = facilities.find(f => f.facilityType === facilityType);
    if (!facility) return;
    
    const upgradeCheck = canUpgradeFacility(facility, resinBalance);
    if (!upgradeCheck.canUpgrade) return;
    
    if (db) {
      try {
        await db.query(`
          UPDATE training_facilities
          SET level = level + 1, _crdt_clock = $1
          WHERE franchise_id = $2 AND facility_type = $3
        `, [BigInt(Date.now()), franchiseId, facilityType]);
        
        setFacilities(prev => prev.map(f => 
          f.facilityType === facilityType 
            ? { ...f, level: f.level + 1 }
            : f
        ));
        
        onFacilityUpgrade?.(facilityType);
        setMessage(`${STATION_CONFIGS[facilityType].name} upgraded to level ${facility.level + 1}!`);
        setTimeout(() => setMessage(''), 3000);
      } catch (err) {
        console.error('Failed to upgrade facility:', err);
        setMessage('Error upgrading facility');
      }
    }
  }, [facilities, resinBalance, db, franchiseId, onFacilityUpgrade]);

  const packComparison = comparePacks(currentTier, resinBalance);
  const progressToNext = calculateProgressToNextPack(currentTier, resinBalance);
  const packUpgradeCheck = canAffordPackUpgrade(currentTier, resinBalance);

  if (loading) {
    return <div style={styles.loading}>Loading facilities...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Facility Progression</h1>
        <div style={styles.resinBalance}>
          💰 {resinBalance} Resin
        </div>
      </div>
      
      {message && <div style={styles.message}>{message}</div>}
      
      {/* Current Pack Status */}
      <div style={styles.currentPack}>
        <div style={styles.packHeader}>
          <h2 style={styles.packTitle}>{FACILITY_PACKS[currentTier].name}</h2>
          <span style={styles.packBadge}>{currentTier}</span>
        </div>
        
        <div style={styles.packStats}>
          <div style={styles.stat}>
            <div style={styles.statValue}>
              {Math.round((1 - FACILITY_PACKS[currentTier].energyCostMultiplier) * 100)}%
            </div>
            <div style={styles.statLabel}>Energy Discount</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>+{Math.round((FACILITY_PACKS[currentTier].xpMultiplier - 1) * 100)}%</div>
            <div style={styles.statLabel}>XP Bonus</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>{FACILITY_PACKS[currentTier].energyRegenRate}/hr</div>
            <div style={styles.statLabel}>Energy Regen</div>
          </div>
        </div>
        
        {/* Progress to next tier */}
        {progressToNext.nextTier && (
          <div style={styles.progressSection}>
            <div style={styles.progressLabel}>
              Progress to {FACILITY_PACKS[progressToNext.nextTier].name}:
            </div>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${progressToNext.percent}%`,
                }}
              />
            </div>
            <div style={styles.progressText}>
              {progressToNext.percent}% ({resinBalance} / {progressToNext.percent === 100 ? FACILITY_PACKS[progressToNext.nextTier].cost : progressToNext.resinNeeded + resinBalance} resin)
            </div>
            
            {packUpgradeCheck.canAfford && (
              <button style={styles.upgradeButton} onClick={handlePackUpgrade}>
                Upgrade to {FACILITY_PACKS[progressToNext.nextTier].name} ({packUpgradeCheck.cost} resin)
              </button>
            )}
          </div>
        )}
        
        {currentTier === 'PRO_COMPLEX' && (
          <div style={styles.maxTier}>Maximum tier reached!</div>
        )}
      </div>
      
      {/* Pack Comparison Toggle */}
      <button 
        style={styles.compareButton}
        onClick={() => setShowCompare(!showCompare)}
      >
        {showCompare ? 'Hide' : 'Show'} Pack Comparison
      </button>
      
      {/* Pack Comparison Table */}
      {showCompare && (
        <div style={styles.compareTable}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Pack</th>
                <th style={styles.th}>Energy Cost</th>
                <th style={styles.th}>XP Bonus</th>
                <th style={styles.th}>Regen</th>
                <th style={styles.th}>Stations</th>
                <th style={styles.th}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {packComparison.map(pack => (
                <tr 
                  key={pack.tier}
                  style={{
                    ...styles.tr,
                    ...(pack.tier === currentTier && styles.currentRow),
                  }}
                >
                  <td style={styles.td}>{pack.name}</td>
                  <td style={styles.td}>{pack.energyCostReduction}</td>
                  <td style={styles.td}>{pack.xpBonus}</td>
                  <td style={styles.td}>{pack.regenRate}</td>
                  <td style={styles.td}>{pack.newStations.join(', ') || 'All unlocked'}</td>
                  <td style={styles.td}>
                    {pack.cost === 0 ? 'Free' : 
                     pack.affordable ? `${pack.cost} ✅` : 
                     `${pack.cost} ❌`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Individual Facilities */}
      <div style={styles.facilitiesSection}>
        <h2 style={styles.sectionTitle}>Training Stations</h2>
        <div style={styles.facilityGrid}>
          {facilities.map(facility => {
            const config = STATION_CONFIGS[facility.facilityType];
            const upgradeCheck = canUpgradeFacility(facility, resinBalance);
            
            return (
              <div key={facility.id} style={styles.facilityCard}>
                <div style={styles.facilityHeader}>
                  <div style={styles.facilityName}>{config.name}</div>
                  <div style={styles.facilityLevel}>Lvl {facility.level}/3</div>
                </div>
                
                <div style={styles.facilityAttrs}>
                  Trains: {config.attributes.join(', ')}
                </div>
                
                <div style={styles.facilityBonuses}>
                  <div>Energy: {Math.round(config.energyCost * FACILITY_PACKS[currentTier].energyCostMultiplier * (1 - (facility.level - 1) * 0.1))}</div>
                  <div>XP: +{Math.round((FACILITY_PACKS[currentTier].xpMultiplier * (1 + (facility.level - 1) * 0.05) - 1) * 100)}%</div>
                </div>
                
                {upgradeCheck.maxed ? (
                  <div style={styles.maxedLabel}>Max Level</div>
                ) : upgradeCheck.canUpgrade ? (
                  <button 
                    style={styles.upgradeFacilityButton}
                    onClick={() => handleFacilityUpgrade(facility.facilityType)}
                  >
                    Upgrade ({upgradeCheck.cost} resin)
                  </button>
                ) : (
                  <div style={styles.cantUpgrade}>
                    Need {upgradeCheck.cost} resin
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
    fontSize: '1.8rem',
    fontWeight: 'bold',
  },
  resinBalance: {
    fontSize: '1.2rem',
    color: '#ffd54f',
    fontWeight: 'bold',
  },
  message: {
    padding: '1rem',
    background: '#4caf50',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  currentPack: {
    padding: '1.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    marginBottom: '1.5rem',
  },
  packHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  packTitle: {
    margin: 0,
    fontSize: '1.5rem',
  },
  packBadge: {
    padding: '0.25rem 0.75rem',
    background: '#4fc3f7',
    color: '#1a1a2e',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '0.8rem',
  },
  packStats: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '1.5rem',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#4fc3f7',
  },
  statLabel: {
    fontSize: '0.9rem',
    opacity: 0.7,
  },
  progressSection: {
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '1rem',
  },
  progressLabel: {
    marginBottom: '0.5rem',
  },
  progressBar: {
    height: '12px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '0.9rem',
    opacity: 0.8,
    marginBottom: '1rem',
  },
  upgradeButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  maxTier: {
    padding: '1rem',
    background: 'rgba(76, 175, 80, 0.2)',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#4caf50',
    fontWeight: 'bold',
  },
  compareButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  compareTable: {
    overflowX: 'auto',
    marginBottom: '1.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
    fontSize: '0.9rem',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  currentRow: {
    background: 'rgba(79, 195, 247, 0.2)',
  },
  td: {
    padding: '0.75rem',
    fontSize: '0.9rem',
  },
  facilitiesSection: {
    marginTop: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.3rem',
    marginBottom: '1rem',
  },
  facilityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  facilityCard: {
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
  },
  facilityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  facilityName: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  facilityLevel: {
    fontSize: '0.9rem',
    color: '#4fc3f7',
  },
  facilityAttrs: {
    fontSize: '0.85rem',
    opacity: 0.7,
    marginBottom: '0.75rem',
  },
  facilityBonuses: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.85rem',
    marginBottom: '0.75rem',
  },
  maxedLabel: {
    padding: '0.5rem',
    background: 'rgba(76, 175, 80, 0.2)',
    borderRadius: '4px',
    textAlign: 'center',
    color: '#4caf50',
    fontSize: '0.85rem',
  },
  upgradeFacilityButton: {
    width: '100%',
    padding: '0.5rem',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  cantUpgrade: {
    padding: '0.5rem',
    textAlign: 'center',
    fontSize: '0.85rem',
    opacity: 0.6,
  },
};
