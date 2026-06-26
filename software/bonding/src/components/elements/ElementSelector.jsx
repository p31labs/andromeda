import React, { useState } from 'react';
import HydrogenCard from './HydrogenCard';
import CarbonCard from './CarbonCard';
import OxygenCard from './OxygenCard';
import PhosphorusCard from './PhosphorusCard';

const ElementSelector = ({ playerId, onBond }) => {
  const [selectedElement, setSelectedElement] = useState(null);

  const handleElementSelect = (element) => {
    setSelectedElement(element);
    onBond(element);
  };

  return (
    <div className="element-selector">
      <h3>Choose Your Element</h3>
      <div className="element-grid">
<<<<<<< HEAD
        <HydrogenCard 
          playerId={playerId} 
          onBond={handleElementSelect}
        />
        <CarbonCard 
          playerId={playerId} 
          onBond={handleElementSelect}
        />
        <OxygenCard 
          playerId={playerId} 
          onBond={handleElementSelect}
        />
        <PhosphorusCard 
          playerId={playerId} 
          onBond={handleElementSelect}
        />
      </div>
      
=======
        <HydrogenCard
          playerId={playerId}
          onBond={handleElementSelect}
        />
        <CarbonCard
          playerId={playerId}
          onBond={handleElementSelect}
        />
        <OxygenCard
          playerId={playerId}
          onBond={handleElementSelect}
        />
        <PhosphorusCard
          playerId={playerId}
          onBond={handleElementSelect}
        />
      </div>

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      {selectedElement && (
        <div className="element-info">
          <h4>Selected: {selectedElement}</h4>
          <p>Ready to form bonds with other players!</p>
        </div>
      )}
    </div>
  );
};

<<<<<<< HEAD
export default ElementSelector;
=======
export default ElementSelector;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
