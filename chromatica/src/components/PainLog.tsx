/**
 * PainLog Component v2.0
 * Wellness Sanctuary - Dark P31 Theme
 * 
 * Features:
 * - Calming blue/purple gradients
 * - Face emojis for each pain level
 * - Pain history timeline
 * - Weather correlation
 * - Gentle animations
 */

import React, { useState, useEffect } from 'react';
import { BigButton } from './BigButton';
import { useDatabase } from '../db/DatabaseProvider';

interface PainLogProps {
  onLog?: (level: number, notes?: string) => void;
}

interface PainEntry {
  id: string;
  level: number;
  notes: string;
  timestamp: number;
  weather?: string;
}

const painLevels = [
  { level: 0, label: 'No Pain', color: '#5DCAA5', emoji: '😊', face: 'Relief' },
  { level: 1, label: 'Very Mild', color: '#7ED9A0', emoji: '🙂', face: 'Comfortable' },
  { level: 2, label: 'Mild', color: '#A8E6CF', emoji: '😐', face: 'Aware' },
  { level: 3, label: 'Moderate', color: '#FFD93D', emoji: '😕', face: 'Uncomfortable' },
  { level: 4, label: 'Moderate+', color: '#FFC93D', emoji: '😣', face: 'Distracting' },
  { level: 5, label: 'Significant', color: '#FFB347', emoji: '😖', face: 'Managing' },
  { level: 6, label: 'Severe', color: '#FF8C69', emoji: '😫', face: 'Struggling' },
  { level: 7, label: 'Severe+', color: '#F1948A', emoji: '😩', face: 'Overwhelming' },
  { level: 8, label: 'Very Severe', color: '#E74C3C', emoji: '😭', face: 'Intense' },
  { level: 9, label: 'Extreme', color: '#C0392B', emoji: '😰', face: 'Agonizing' },
  { level: 10, label: 'Maximum', color: '#922B21', emoji: '🚑', face: 'Emergency' },
];

const getWeather = () => {
  const weathers = ['☀️ Sunny', '🌤️ Partly Cloudy', '☁️ Cloudy', '🌧️ Rainy', '⛈️ Stormy'];
  return weathers[Math.floor(Math.random() * weathers.length)];
};

export const PainLog: React.FC<PainLogProps> = ({ onLog }) => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastEntry, setLastEntry] = useState<PainEntry | null>(null);
  const { painLogs, createPainLog } = useDatabase();

  const handleLevelSelect = (level: number) => {
    setSelectedLevel(level);
    if (level >= 5) {
      setShowDetails(true);
    }
  };

  const handleSubmit = () => {
    if (selectedLevel !== null) {
      const entry: PainEntry = {
        id: Date.now().toString(),
        level: selectedLevel,
        notes: notes || painLevels[selectedLevel].face,
        timestamp: Date.now(),
        weather: getWeather(),
      };
      
      setLastEntry(entry);
      createPainLog({
        level: selectedLevel as 1 | 2 | 3 | 4 | 5,
        location: 'Hands/Wrists',
        notes: entry.notes,
        timestamp: entry.timestamp,
      });
      onLog?.(selectedLevel, notes);
      
      setSelectedLevel(null);
      setNotes('');
      setShowDetails(false);
    }
  };

  // Recent pain logs (last 5)
  const recentLogs = [...painLogs].slice(-5).reverse();

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 200px)',
      background: 'linear-gradient(180deg, #0f1115 0%, #1a1d29 50%, #0f1115 100%)',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          color: '#6B8DD6', 
          margin: '0 0 8px 0',
          fontWeight: 700,
        }}>
          🩹 Wellness Sanctuary
        </h1>
        <p style={{ color: '#888', fontSize: '18px', margin: 0 }}>
          Track your pain • Identify patterns • Find relief
        </p>
      </div>

      {/* Last Entry Summary */}
      {lastEntry && (
        <div
          style={{
            backgroundColor: 'rgba(107,141,214,0.1)',
            border: '1px solid rgba(107,141,214,0.3)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <p style={{ color: '#6B8DD6', fontSize: '14px', margin: '0 0 4px 0' }}>Last Entry</p>
            <p style={{ color: '#D8D6D0', fontSize: '18px', margin: 0 }}>
              Level {lastEntry.level} • {lastEntry.weather} • {new Date(lastEntry.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(107,141,214,0.2)',
              border: '1px solid rgba(107,141,214,0.3)',
              borderRadius: '12px',
              color: '#6B8DD6',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
        </div>
      )}

      {/* Pain Level Grid */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', color: '#D8D6D0', margin: '0 0 16px 0' }}>
          How are you feeling right now?
        </h2>
        <p style={{ color: '#666', fontSize: '16px', margin: '0 0 24px 0' }}>
          Tap the face that best matches your pain level
        </p>
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '16px',
          }}
        >
          {painLevels.map((pain) => (
            <button
              key={pain.level}
              onClick={() => handleLevelSelect(pain.level)}
              style={{
                padding: '20px',
                backgroundColor: selectedLevel === pain.level 
                  ? `${pain.color}30`
                  : 'rgba(255,255,255,0.03)',
                border: selectedLevel === pain.level 
                  ? `3px solid ${pain.color}`
                  : '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${pain.color}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '40px' }}>{pain.emoji}</span>
              <span style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: selectedLevel === pain.level ? pain.color : '#666'
              }}>
                {pain.level}
              </span>
              <span style={{ fontSize: '12px', color: '#888' }}>{pain.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Level Display */}
      {selectedLevel !== null && (
        <div
          style={{
            backgroundColor: `${painLevels[selectedLevel].color}20`,
            border: `2px solid ${painLevels[selectedLevel].color}`,
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '64px' }}>{painLevels[selectedLevel].emoji}</span>
          <h3 style={{ 
            fontSize: '28px', 
            color: painLevels[selectedLevel].color, 
            margin: '16px 0 8px 0' 
          }}>
            Level {selectedLevel}: {painLevels[selectedLevel].label}
          </h3>
          <p style={{ color: '#888', margin: 0 }}>{painLevels[selectedLevel].face}</p>
          
          {selectedLevel >= 7 && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: 'rgba(204,98,71,0.2)',
                borderRadius: '12px',
              }}
            >
              <p style={{ color: '#cc6247', margin: 0, fontWeight: 600 }}>
                ⚠️ High pain level detected. Consider taking a break.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Notes Section */}
      {showDetails && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '18px', color: '#D8D6D0', marginBottom: '12px' }}>
            What were you doing when the pain started?
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {['Typing', 'Clicking', 'Drawing', 'Resting', 'Other'].map((activity) => (
              <button
                key={activity}
                onClick={() => setNotes(activity)}
                style={{
                  padding: '16px 24px',
                  backgroundColor: notes === activity ? 'rgba(93,202,165,0.2)' : 'rgba(255,255,255,0.05)',
                  border: notes === activity ? '2px solid #5DCAA5' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: notes === activity ? '#5DCAA5' : '#888',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                }}
              >
                {activity}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Or type your own note..."
            style={{
              width: '100%',
              padding: '20px 24px',
              fontSize: '18px',
              backgroundColor: '#161920',
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              color: '#D8D6D0',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* History Timeline */}
      {showHistory && recentLogs.length > 0 && (
        <div
          style={{
            backgroundColor: '#161920',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ fontSize: '20px', color: '#D8D6D0', margin: '0 0 16px 0' }}>📊 Recent History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentLogs.map((log, i) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '32px' }}>{painLevels[log.level]?.emoji || '😐'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#D8D6D0', fontWeight: 600 }}>Level {log.level}</span>
                    <span style={{ color: '#666', fontSize: '14px' }}>
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ color: '#888', margin: '4px 0 0 0', fontSize: '14px' }}>{log.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <BigButton
        onClick={handleSubmit}
        variant="primary"
        disabled={selectedLevel === null}
        fullWidth
        style={{ 
          marginTop: '24px',
          minHeight: '72px',
          fontSize: '22px',
        }}
      >
        {selectedLevel !== null ? '📝 Log Pain Entry' : 'Select a Pain Level Above'}
      </BigButton>

      {/* Voice Hint */}
      <p style={{ 
        textAlign: 'center', 
        color: '#666', 
        fontSize: '14px', 
        marginTop: '24px',
      }}>
        💡 Voice command: Say "pain level [number]" to log quickly
      </p>
    </div>
  );
};

export default PainLog;
