import React from 'react';
import Card from './Card';
import EmptyState from './EmptyState';

const RepitentesPanel: React.FC = () => {
  return (
    <Card title="Repitentes" icon="history_edu">
      <EmptyState
        icon="construction"
        title="En Construcción"
        message="Esta sección para gestionar a los estudiantes repitentes está actualmente en desarrollo."
      />
    </Card>
  );
};

export default RepitentesPanel;
