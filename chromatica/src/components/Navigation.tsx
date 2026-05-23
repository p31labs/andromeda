/**
 * Navigation Component v2.0
 * Floating Bottom Tab Bar - Dark P31 Theme
 * 
 * Features:
 * - Floating pill design
 * - 96px touch targets
 * - Glow effect on active
 * - Smooth transitions
 */

import React, { useState } from 'react';

interface NavigationProps {
  activeView: 'dashboard' | 'projects' | 'colors' | 'pain' | 'settings';
  onViewChange: (view: 'dashboard' | 'projects' | 'colors' | 'pain' | 'settings') => void;
}

const navItems = [
  { id: 'dashboard', icon: '📊', label: 'Home' },
  { id: 'projects', icon: '🎨', label: 'Projects' },
  { id: 'colors', icon: '🌈', label: 'Colors' },
  { id: 'pain', icon: '🩹', label: 'Wellness' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
] as const;

export const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px',
          backgroundColor: '#161920',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const isHovered = hoveredItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as any)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 20px',
                minWidth: '80px',
                minHeight: '72px',
                backgroundColor: isActive ? 'rgba(93,202,165,0.15)' : 'transparent',
                border: isActive ? '2px solid #5DCAA5' : '2px solid transparent',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 0 20px rgba(93,202,165,0.3)' : 'none',
                transform: isHovered && !isActive ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              <span
                style={{
                  fontSize: '28px',
                  filter: isActive ? 'drop-shadow(0 0 8px rgba(93,202,165,0.6))' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#5DCAA5' : '#888',
                  transition: 'all 0.2s',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
