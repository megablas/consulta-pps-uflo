import React from 'react';
import type { InformeTask } from '../types';
import InformeCard from './InformeCard';
import EmptyState from './EmptyState';

interface InformesListProps {
  tasks: InformeTask[];
  onConfirmar: (convocatoriaId: string) => void;
}

const InformesList: React.FC<InformesListProps> = ({ tasks, onConfirmar }) => {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon="assignment"
        title="Sin Informes Pendientes"
        message="Aquí aparecerán las PPS para las que necesites subir un informe final una vez que seas seleccionado."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {tasks.map((task) => (
        <InformeCard key={task.convocatoriaId} task={task} onConfirmar={onConfirmar} />
      ))}
    </div>
  );
};

export default InformesList;