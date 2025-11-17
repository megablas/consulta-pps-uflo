import React, { useState } from 'react';
import SubTabs from '../../components/SubTabs';
import { MetricsDashboard } from '../../components/MetricsDashboard';
import TimelineView from '../../components/TimelineView';

interface MetricsViewProps {
  onStudentSelect: (student: { legajo: string, nombre: string }) => void;
}

const MetricsView: React.FC<MetricsViewProps> = ({ onStudentSelect }) => {
  const [activeMetricsTabId, setActiveMetricsTabId] = useState('dashboard');

  const metricsSubTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: 'bar_chart' },
      { id: 'timeline', label: 'Línea de Tiempo', icon: 'timeline' },
  ];

  return (
    <>
      <SubTabs tabs={metricsSubTabs} activeTabId={activeMetricsTabId} onTabChange={setActiveMetricsTabId} />
      <div className="mt-6">
          {activeMetricsTabId === 'dashboard' && <MetricsDashboard onStudentSelect={onStudentSelect} />}
          {activeMetricsTabId === 'timeline' && <TimelineView />}
      </div>
    </>
  );
};

export default MetricsView;