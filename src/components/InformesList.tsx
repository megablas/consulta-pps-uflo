import React from 'react';
import type { InformeTask } from '../types';
import InformeCard from './InformeCard';
import EmptyState from './EmptyState';
import { ALERT_INFORMES_TITLE, ALERT_INFORMES_TEXT } from '../constants';

interface InformesListProps {
  tasks: InformeTask[];
  onConfirmar: (convocatoriaId: string) => void;
}

const InformesList: React.FC<InformesListProps> = ({ tasks, onConfirmar }) => {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon="task_alt"
        title="Sin informes pendientes"
        message="No tienes informes para subir o que estén en corrección en este momento."
      />
    );
  }

  return (
    <div className="space-y-4">
       <div className="p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 rounded-r-lg">
            <h4 className="font-bold">{ALERT_INFORMES_TITLE}</h4>
            <p className="text-sm mt-1">{ALERT_INFORMES_TEXT}</p>
        </div>
      {tasks.map(task => (
        <InformeCard key={task.convocatoriaId} task={task} onConfirmar={onConfirmar} />
      ))}
    </div>
  );
};

export default InformesList;