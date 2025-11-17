import React, { useState, useMemo, lazy, Suspense } from 'react';
import SubTabs from '../../components/SubTabs';
import AdminSearch from '../../components/AdminSearch';
import SeguroGenerator from '../../components/SeguroGenerator';
import NuevosConvenios from '../../components/NuevosConvenios';
import ExecutiveReportGenerator from '../../components/ExecutiveReportGenerator';
import PenalizationManager from '../../components/PenalizationManager';
import { useModal } from '../../contexts/ModalContext';
import type { AirtableRecord, EstudianteFields } from '../../types';
import LanzadorConvocatorias from '../../components/LanzadorConvocatorias';
import AirtableEditor from '../../components/AirtableEditor';
import Loader from '../../components/Loader';

const ActiveInstitutionsReport = lazy(() => import('../../components/ActiveInstitutionsReport'));

interface HerramientasViewProps {
  onStudentSelect: (student: AirtableRecord<EstudianteFields>) => void;
}

const HerramientasView: React.FC<HerramientasViewProps> = ({ onStudentSelect }) => {
  const [activeHerramientasTabId, setActiveHerramientasTabId] = useState('lanzador');
  const { showModal } = useModal();

  const herramientasSubTabs = useMemo(() => [
        { id: 'lanzador', label: 'Lanzador', icon: 'rocket_launch' },
        { id: 'editor-db', label: 'Editor DB', icon: 'storage' },
        { id: 'penalizaciones', label: 'Penalizaciones', icon: 'gavel' },
        { id: 'search', label: 'Buscar Alumno', icon: 'person_search' },
        { id: 'insurance', label: 'Seguros', icon: 'shield' },
        { id: 'convenios', label: 'Convenios Nuevos', icon: 'handshake' },
        { id: 'active-institutions-report', label: 'Reporte Instituciones', icon: 'assessment' },
        { id: 'executive-report', label: 'Reporte Ejecutivo', icon: 'summarize' },
    ], []);


  return (
    <div className="space-y-8">
      <SubTabs tabs={herramientasSubTabs} activeTabId={activeHerramientasTabId} onTabChange={setActiveHerramientasTabId} />
      <div className="mt-6">
        <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
          {activeHerramientasTabId === 'lanzador' && <LanzadorConvocatorias />}
          {activeHerramientasTabId === 'editor-db' && <AirtableEditor />}
          {activeHerramientasTabId === 'penalizaciones' && <PenalizationManager />}
          {activeHerramientasTabId === 'search' && <div className="p-4"><AdminSearch onStudentSelect={onStudentSelect} /></div>}
          {activeHerramientasTabId === 'insurance' && <SeguroGenerator showModal={showModal} />}
          {activeHerramientasTabId === 'convenios' && <NuevosConvenios />}
          {activeHerramientasTabId === 'active-institutions-report' && <ActiveInstitutionsReport />}
          {activeHerramientasTabId === 'executive-report' && <ExecutiveReportGenerator />}
        </Suspense>
      </div>
    </div>
  );
};

export default HerramientasView;