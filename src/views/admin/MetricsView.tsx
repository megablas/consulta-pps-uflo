import React, { useState } from 'react';
import SubTabs from '../../components/SubTabs';
import { MetricsDashboard } from '../../components/MetricsDashboard';
import TimelineView from '../../components/TimelineView';

interface MetricsViewProps {
  onStudentSelect: (student: { legajo: string, nombre: string }) => void;
  isTestingMode?: boolean;
}

const MetricsView: React.FC<MetricsViewProps> = ({ onStudentSelect, isTestingMode = false }) => {
  const [activeMetricsTabId, setActiveMetricsTabId] = useState('dashboard');

  const metricsSubTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: 'bar_chart' },
      { id: 'timeline', label: 'Línea de Tiempo', icon: 'timeline' },
  ];

  return (
    <>
      <SubTabs tabs={metricsSubTabs} activeTabId={activeMetricsTabId} onTabChange={setActiveMetricsTabId} />
      <div className="mt-6">
          {/* FIX: Passed isTestingMode to MetricsDashboard to fix type error */}
          {activeMetricsTabId === 'dashboard' && <MetricsDashboard onStudentSelect={onStudentSelect} isTestingMode={isTestingMode} />}
          {activeMetricsTabId === 'timeline' && <TimelineView isTestingMode={isTestingMode} />}
      </div>
    </>
  );
};

export default MetricsView;