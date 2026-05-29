import React, { useState, useEffect } from 'react';
import { GlobalSpoonManager } from '@p31/unified';

interface Props {
  compact?: boolean;
}

export const GlobalSpoonDisplay: React.FC<Props> = ({ compact = false }) => {
  const [manager] = useState(() => new GlobalSpoonManager());
  const [spoons, setSpoons] = useState(0);
  const [status, setStatus] = useState(manager.getSpoonStatus());

  useEffect(() => {
    const update = () => {
      setSpoons(manager.getRemainingSpoons());
      setStatus(manager.getSpoonStatus());
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [manager]);

  if (compact) {
    return (
      <div className={`spoon-display compact ${status.level}`}>
        <span className="spoon-icon">{status.emoji}</span>
        <span className="spoon-count">{spoons}🥄</span>
      </div>
    );
  }

  return (
    <div className={`spoon-display ${status.level}`} title={status.message}>
      <span className="spoon-icon">{status.emoji}</span>
      <span className="spoon-count">{spoons}</span>
      <span className="spoon-label">spoons remaining</span>
    </div>
  );
};
