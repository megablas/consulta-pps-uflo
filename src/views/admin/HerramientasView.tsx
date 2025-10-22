import React, { useState, useMemo } from 'react';
import SubTabs from '../../components/SubTabs';
import AdminSearch from '../../components/AdminSearch';
import SeguroGenerator from '../../components/SeguroGenerator';
// FIX: Changed to a default import because NuevosConvenios.tsx has a default export.
import NuevosConvenios from '../../components/NuevosConvenios';
import ExecutiveReportGenerator from '../../components/ExecutiveReportGenerator';
import PenalizationManager from '../../components/PenalizationManager';
import { useModal } from '../../contexts/ModalContext';
import type { AirtableRecord, EstudianteFields } from '../../types';
import LanzadorConvocatorias from '../../components/LanzadorConvocatorias';
import AirtableEditor from '../../components/AirtableEditor';
import SeleccionadorConvocatorias from '../../components/SeleccionadorConvocatorias';

interface HerramientasViewProps {
  onStudentSelect: (student: AirtableRecord<EstudianteFields>) => void;
  isTestingMode?: boolean;
}

const HerramientasView: React.FC<HerramientasViewProps> = ({ onStudentSelect, isTestingMode = false }) => {
  const [activeHerramientasTabId, setActiveHerramientasTabId] = useState('lanzador');
  const { showModal } = useModal();

  const herramientasSubTabs = useMemo(() => {
      let allTabs = [
        { id: 'lanzador', label: 'Lanzador', icon: 'rocket_launch' },
        { id: 'editor-db', label: 'Editor DB', icon: 'storage' },
        { id: 'penalizaciones', label: 'Penalizaciones', icon: 'gavel' },
        { id: 'search', label: 'Buscar Alumno', icon: 'person_search' },
        { id: 'insurance', label: 'Seguros', icon: 'shield' },
        { id: 'convenios', label: 'Convenios Nuevos', icon: 'handshake' },
        { id: 'executive-report', label: 'Reporte Ejecutivo', icon: 'summarize' },
    ];

    if (isTestingMode) {
        // Add the new tool only in testing mode
        allTabs.splice(2, 0, { id: 'seleccionador', label: 'Seleccionador', icon: 'how_to_reg' });
        
        // Filter out tabs not meant for testing
        allTabs = allTabs.filter(tab => tab.id !== 'convenios');
        
        // Reset active tab if the current one is removed in test mode
        if (activeHerramientasTabId === 'convenios') {
            setActiveHerramientasTabId('lanzador');
        }
    }
    
    return allTabs;
  }, [isTestingMode, activeHerramientasTabId]);


  return (
    <div className="space-y-8">
      <SubTabs tabs={herramientasSubTabs} activeTabId={activeHerramientasTabId} onTabChange={setActiveHerramientasTabId} />
      <div className="mt-6">
          {activeHerramientasTabId === 'lanzador' && <LanzadorConvocatorias isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'editor-db' && <AirtableEditor isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'seleccionador' && isTestingMode && <SeleccionadorConvocatorias isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'penalizaciones' && <PenalizationManager isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'search' && <div className="p-4"><AdminSearch onStudentSelect={onStudentSelect} isTestingMode={isTestingMode} /></div>}
          {activeHerramientasTabId === 'insurance' && <SeguroGenerator showModal={showModal} isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'convenios' && !isTestingMode && <NuevosConvenios isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'executive-report' && <ExecutiveReportGenerator isTestingMode={isTestingMode} />}
      </div>
    </div>
  );
};

export default HerramientasView;