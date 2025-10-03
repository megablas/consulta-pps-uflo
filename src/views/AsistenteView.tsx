import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import Tabs from '../components/Tabs';
import ControlCuposJornada from '../components/ControlCuposJornada';
import ConfirmarAsistenciaJornada from '../components/ConfirmarAsistenciaJornada';
import { useAuth } from '../contexts/AuthContext';

const AsistenteView: React.FC = () => {
    const [activeTabId, setActiveTabId] = useState('confirmar');
    const { authenticatedUser } = useAuth();

    const tabs = useMemo(() => [
        {
            id: 'confirmar',
            label: 'Confirmar Asistencia',
            icon: 'checklist',
            content: <ConfirmarAsistenciaJornada />
        },
        {
            id: 'cupos',
            label: 'Control de Cupos',
            icon: 'groups',
            content: <ControlCuposJornada />
        }
    ], []);

    return (
        <div className="animate-fade-in-up">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-50 tracking-tight">
                    Panel de Asistente de Jornada
                </h1>
                <p className="mt-2 text-md text-slate-600 dark:text-slate-300 max-w-2xl">
                    Bienvenido, {authenticatedUser?.nombre}. Utiliza estas herramientas para gestionar la asistencia y los cupos del evento.
                </p>
            </div>
            <Card>
                <Tabs
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabChange={setActiveTabId}
                />
            </Card>
        </div>
    );
};

export default AsistenteView;
