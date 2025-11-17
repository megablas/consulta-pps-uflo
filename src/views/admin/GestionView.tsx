import React, { useState } from 'react';
import SubTabs from '../../components/SubTabs';
import ConvocatoriaManager from '../../components/ConvocatoriaManager';
import ConvocatoriaStatusManager from '../../components/ConvocatoriaStatusManager';

const GestionView: React.FC = () => {
  const [activeGestionTabId, setActiveGestionTabId] = useState('manager');
  
  const gestionSubTabs = [
    { id: 'manager', label: 'Gestionar Prácticas', icon: 'dynamic_feed' },
    { id: 'status-manager', label: 'Control de Estados', icon: 'toggle_on' },
  ];

  return (
    <>
      <SubTabs tabs={gestionSubTabs} activeTabId={activeGestionTabId} onTabChange={setActiveGestionTabId} />
      <div className="mt-6">
          {activeGestionTabId === 'manager' && <ConvocatoriaManager />}
          {activeGestionTabId === 'status-manager' && <ConvocatoriaStatusManager />}
      </div>
    </>
  );
};

export default GestionView;