import React, { useState } from 'react';
import { SENTINEL_POLICY } from '@p31/sentinel';

export const SENTINELBanner: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="sentinel-strip">
      <span className="sentinel-icon">🛡️</span>
      <span>SENTINEL Active: Zero ads • Age-appropriate • All funding from CHUMP earnings</span>
      <button className="sentinel-toggle" onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? 'Hide' : 'Details'}
      </button>
      {showDetails && (
        <div className="sentinel-details">
          <ul>
            {SENTINEL_POLICY.rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SENTINELBanner;
