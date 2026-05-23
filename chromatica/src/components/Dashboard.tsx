/**
 * Dashboard Component v2.0
 * Command Center - Dark P31 Theme
 * 
 * Features:
 * - Beautiful welcome for wife
 * - Quick stats cards
 * - Recent projects carousel
 * - Favorite colors grid
 * - Daily inspiration
 * - Progress visualization
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../db/DatabaseProvider';
import { BigButton } from './BigButton';

const quotes = [
  "Create with love, rest with care 💚",
  "Every color tells a story 🎨",
  "Your hands create beauty 🌸",
  "Rest is part of the process 🌿",
  "Small steps create masterpieces ✨",
  "Listen to your body 🧘",
  "Creativity flows when you're comfortable 🌊",
  "Your wellness matters most 💚",
];

export const Dashboard: React.FC = () => {
  const { projects, colorSwatches, painLogs } = useDatabase();
  const [currentQuote, setCurrentQuote] = useState(0);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Cycle quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % quotes.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Stats
  const painFreeDays = painLogs.filter(log => log.level <= 2).length;
  const recentProjects = [...projects].slice(-3).reverse();
  const recentColors = [...colorSwatches].slice(-6).reverse();

  // Get luminance for text color
  const getLuminance = (hex: string) => {
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 200px)',
        background: 'linear-gradient(180deg, #0f1115 0%, #161920 50%, #0f1115 100%)',
        padding: '24px',
      }}
    >
      {/* Welcome Section */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '42px', 
          color: '#5DCAA5', 
          margin: '0 0 8px 0',
          fontWeight: 700,
        }}>
          {greeting}, beautiful 💚
        </h1>
        <p style={{ 
          fontSize: '22px', 
          color: '#888', 
          margin: '0 0 16px 0',
          fontStyle: 'italic',
        }}>
          {quotes[currentQuote]}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          {quotes.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentQuote ? '24px' : '8px',
                height: '8px',
                backgroundColor: i === currentQuote ? '#5DCAA5' : 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}
      >
        <StatCard
          icon="🎨"
          value={projects.length}
          label="Projects"
          color="#5DCAA5"
        />
        <StatCard
          icon="🌈"
          value={colorSwatches.length}
          label="Colors Saved"
          color="#6B8DD6"
        />
        <StatCard
          icon="🌸"
          value={painFreeDays}
          label="Comfortable Days"
          color="#cc6247"
        />
        <StatCard
          icon="✨"
          value={recentProjects.length > 0 ? 'Active' : 'Start'}
          label="Status"
          color="#FFD93D"
          isText
        />
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', color: '#D8D6D0', margin: '0 0 20px 0' }}>
            📁 Recent Projects
          </h2>
          <div
            style={{
              display: 'flex',
              gap: '20px',
              overflowX: 'auto',
              paddingBottom: '16px',
            }}
          >
            {recentProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  minWidth: '280px',
                  backgroundColor: '#161920',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '120px',
                    background: `linear-gradient(135deg, #5DCAA5 0%, #6B8DD6 100%)`,
                    borderRadius: '16px',
                    marginBottom: '16px',
                    boxShadow: '0 8px 24px rgba(93,202,165,0.2)',
                  }}
                />
                <h3 style={{ fontSize: '20px', color: '#D8D6D0', margin: '0 0 8px 0' }}>
                  {project.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorite Colors */}
      {recentColors.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', color: '#D8D6D0', margin: '0 0 20px 0' }}>
            🌈 Your Color Palette
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '16px',
            }}
          >
            {recentColors.map((swatch) => (
              <div
                key={swatch.id}
                style={{
                  backgroundColor: '#161920',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: swatch.color,
                    borderRadius: '12px',
                    margin: '0 auto 12px auto',
                    boxShadow: `0 8px 24px ${swatch.color}40`,
                  }}
                />
                <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>{swatch.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(93,202,165,0.1) 0%, rgba(107,141,214,0.1) 100%)',
          borderRadius: '24px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid rgba(93,202,165,0.2)',
        }}
      >
        <h2 style={{ fontSize: '28px', color: '#5DCAA5', margin: '0 0 16px 0' }}>
          ✨ Ready to Create?
        </h2>
        <p style={{ fontSize: '18px', color: '#888', margin: '0 0 24px 0' }}>
          Your next masterpiece is waiting. Start with colors that make you feel good.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <BigButton
            onClick={() => {}}
            variant="primary"
            style={{ fontSize: '20px', padding: '20px 40px' }}
          >
            🎨 Open Color Mixer
          </BigButton>
          <BigButton
            onClick={() => {}}
            variant="secondary"
            style={{ fontSize: '20px', padding: '20px 40px' }}
          >
            📁 View Projects
          </BigButton>
        </div>
      </div>

      {/* Wellness Reminder */}
      <div
        style={{
          marginTop: '40px',
          padding: '24px',
          backgroundColor: 'rgba(107,141,214,0.1)',
          borderRadius: '16px',
          border: '1px solid rgba(107,141,214,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '40px' }}>🧘</span>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '18px', color: '#6B8DD6', margin: '0 0 4px 0' }}>Wellness Reminder</h3>
          <p style={{ fontSize: '16px', color: '#888', margin: 0 }}>
            Remember to take breaks every 20 minutes. Your hands and heart will thank you.
          </p>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  color: string;
  isText?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color, isText }) => (
  <div
    style={{
      backgroundColor: '#161920',
      borderRadius: '20px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.05)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = `0 12px 48px ${color}20`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
    }}
  >
    <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
    <div
      style={{
        fontSize: isText ? '24px' : '36px',
        fontWeight: 'bold',
        color: color,
        marginBottom: '4px',
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: '16px', color: '#888' }}>{label}</div>
  </div>
);

export default Dashboard;
