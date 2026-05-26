/**
 * P31 Return Ribbon — Canonical Navigation Spine
 * 
 * Provides consistent navigation across all P31 arcade and vertical apps:
 * soup · hub · passport · connection · mesh
 * 
 * Gray Rock Compliance:
 * - Hidden when `.p31-gray-rock` class is present on body/html
 * - Visible when `.p31-alive` class is present or no mode class (default)
 * 
 * Accessibility:
 * - Keyboard navigable with Tab/Shift+Tab
 * - Focus indicators visible
 * - ARIA labels for screen readers
 * - Respects prefers-reduced-motion
 */

import React, { useEffect, useState } from 'react';

export interface ReturnRibbonProps {
  /** Current app identifier for highlighting active state */
  currentApp?: string;
  /** Override default URLs */
  urls?: {
    soup?: string;
    hub?: string;
    passport?: string;
    connection?: string;
    mesh?: string;
  };
  /** Additional CSS class names */
  className?: string;
  /** Render at top instead of bottom */
  position?: 'top' | 'bottom';
}

// Canonical navigation URLs (from p31-constants.json)
const DEFAULT_URLS = {
  soup: 'https://p31ca.org/soup',
  hub: 'https://p31ca.org',
  passport: 'https://p31ca.org/passport',
  connection: 'https://p31ca.org/connect',
  mesh: 'https://p31ca.org/mesh-start',
};

/**
 * Detect Gray Rock mode from document classes or URL params
 */
function useGrayRockMode(): boolean {
  const [isGrayRock, setIsGrayRock] = useState(false);

  useEffect(() => {
    // Check URL params for ?gray=1 or ?alive=0
    const urlParams = new URLSearchParams(window.location.search);
    const grayParam = urlParams.get('gray');
    const aliveParam = urlParams.get('alive');

    if (grayParam === '1' || grayParam === 'true') {
      setIsGrayRock(true);
      document.documentElement.classList.add('p31-gray-rock');
      document.documentElement.classList.remove('p31-alive');
      return;
    }

    if (aliveParam === '1' || aliveParam === 'true') {
      setIsGrayRock(false);
      document.documentElement.classList.add('p31-alive');
      document.documentElement.classList.remove('p31-gray-rock');
      return;
    }

    // Check for existing classes on document
    const hasGrayRockClass = document.documentElement.classList.contains('p31-gray-rock') ||
                             document.body.classList.contains('p31-gray-rock');
    const hasAliveClass = document.documentElement.classList.contains('p31-alive') ||
                          document.body.classList.contains('p31-alive');

    if (hasGrayRockClass) {
      setIsGrayRock(true);
    } else if (hasAliveClass) {
      setIsGrayRock(false);
    }
    // If neither class is present, default to visible (not Gray Rock)
  }, []);

  return isGrayRock;
}

/**
 * P31 Return Ribbon Component
 * 
 * Renders the canonical navigation spine with keyboard accessibility
 * and Gray Rock visibility rules.
 */
export const ReturnRibbon: React.FC<ReturnRibbonProps> = ({
  currentApp,
  urls: customUrls,
  className = '',
  position = 'bottom',
}) => {
  const isGrayRock = useGrayRockMode();
  const urls = { ...DEFAULT_URLS, ...customUrls };

  // Navigation items with their icons
  const navItems = [
    { id: 'soup', label: 'soup', icon: '🍲', href: urls.soup },
    { id: 'hub', label: 'hub', icon: '🌐', href: urls.hub },
    { id: 'passport', label: 'passport', icon: '🛂', href: urls.passport },
    { id: 'connection', label: 'connection', icon: '🔗', href: urls.connection },
    { id: 'mesh', label: 'mesh', icon: '🔗', href: urls.mesh },
  ];

  const ribbonStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    height: '48px',
    zIndex: 100,
    display: isGrayRock ? 'none' : 'flex',
    ...(position === 'top' ? { top: 0 } : { bottom: 0 }),
  };

  return (
    <nav
      className={`p31-return-ribbon ${className}`}
      style={ribbonStyle}
      aria-label="P31 Navigation"
      role="navigation"
    >
      {/* Home indicator */}
      <div className="p31-ribbon-home">
        <span aria-hidden="true">◈</span>
        <span>P31</span>
      </div>

      {/* Separator */}
      <span className="p31-ribbon-separator" aria-hidden="true">·</span>

      {/* Navigation links */}
      <div className="p31-ribbon-nav">
        {navItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <a
              href={item.href}
              className={`p31-ribbon-link ${currentApp === item.id ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={currentApp === item.id ? 'page' : undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </a>
            {index < navItems.length - 1 && (
              <span className="p31-ribbon-separator" aria-hidden="true">·</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

/**
 * Hook to manage Gray Rock mode programmatically
 */
export function useGrayRockToggle(): {
  isGrayRock: boolean;
  enableGrayRock: () => void;
  disableGrayRock: () => void;
  toggleGrayRock: () => void;
} {
  const [isGrayRock, setIsGrayRock] = useState(() => {
    return document.documentElement.classList.contains('p31-gray-rock') ||
           document.body.classList.contains('p31-gray-rock');
  });

  const enableGrayRock = React.useCallback(() => {
    document.documentElement.classList.add('p31-gray-rock');
    document.documentElement.classList.remove('p31-alive');
    setIsGrayRock(true);
  }, []);

  const disableGrayRock = React.useCallback(() => {
    document.documentElement.classList.remove('p31-gray-rock');
    document.documentElement.classList.add('p31-alive');
    setIsGrayRock(false);
  }, []);

  const toggleGrayRock = React.useCallback(() => {
    if (isGrayRock) {
      disableGrayRock();
    } else {
      enableGrayRock();
    }
  }, [isGrayRock, enableGrayRock, disableGrayRock]);

  return { isGrayRock, enableGrayRock, disableGrayRock, toggleGrayRock };
}

export default ReturnRibbon;
