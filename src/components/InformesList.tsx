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
        icon="task_alt"
        title="Sin informes pendientes"
        message="No tienes informes para subir o que estén en corrección en este momento."
      />
    );
  }

  return (
    <div>
        <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-full h-12 w-12 flex items-center justify-center mt-1">
                <span className="material-icons !text-3xl">assignment_turned_in</span>
            </div>
            <div>
                <h2 className="text-slate-900 text-2xl font-bold tracking-tight">Entrega de Informes</h2>
                <p className="text-slate-600 mt-1 max-w-2xl">Gestiona la entrega de tus informes finales. Sube tu trabajo al campus y luego confirma la entrega aquí para que podamos registrarlo.</p>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map(task => (
            <InformeCard key={task.convocatoriaId} task={task} onConfirmar={onConfirmar} />
          ))}
        </div>
    </div>
  );
};

export default InformesList;