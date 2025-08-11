import React, { useState, useEffect } from 'react';
import { fetchAllAirtableData, fetchAirtableData } from '../services/airtableService';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  AIRTABLE_TABLE_NAME_PRACTICAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_ESTADO_PRACTICA,
  FIELD_NOMBRE_INSTITucion_LOOKUP_PRACTICAS,
  EXCLUDED_PPS_NAME,
} from '../constants';
import type { LanzamientoPPSFields, PracticaFields, EstudianteFields } from '../types';
import EmptyState from './EmptyState';
import { SkeletonBox } from './Skeletons';

interface Stat {
  value: number;
  label: string;
  icon: string;
  color: string;
}

const StatCard: React.FC<{ stat: Stat; isLoading: boolean }> = ({ stat, isLoading }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md shadow-slate-200/50 border border-slate-200/60 flex items-center gap-5">
      <div className={`flex-shrink-0 size-14 rounded-xl flex items-center justify-center ${stat.color}`}>
        <span className="material-icons text-white !text-4xl">{stat.icon}</span>
      </div>
      <div className="flex-grow">
        {isLoading ? (
          <>
            <SkeletonBox className="h-9 w-20 mb-1.5" />
            <SkeletonBox className="h-5 w-32" />
          </>
        ) : (
          <>
            <p className="text-4xl font-extrabold text-slate-800">{stat.value}</p>
            <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
          </>
        )}
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stat[]>([
    { value: 0, label: 'Lanzamientos PPS (2025)', icon: 'rocket_launch', color: 'bg-sky-500' },
    { value: 0, label: 'Nuevos Estudiantes Sin PPS Realizadas', icon: 'person_add', color: 'bg-amber-500' },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentYear = new Date().getFullYear();

        const [lanzamientos2025Res, newStudentsRes, completedPracticesRes] = await Promise.all([
          // 1. Get PPS launches in 2025
          fetchAirtableData<LanzamientoPPSFields>(
            AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
            [],
            `AND(IS_AFTER({${FIELD_FECHA_INICIO_LANZAMIENTOS}}, '2024-12-31'), IS_BEFORE({${FIELD_FECHA_INICIO_LANZAMIENTOS}}, '2026-01-01'))`
          ),
          // 2. Get students created this year
          fetchAllAirtableData<EstudianteFields>(
            AIRTABLE_TABLE_NAME_ESTUDIANTES,
            [FIELD_NOMBRE_ESTUDIANTES],
            `IS_AFTER(CREATED_TIME(), '${currentYear}-01-01')`
          ),
          // 3. Get all completed practices, excluding the specific one
          fetchAllAirtableData<PracticaFields>(
            AIRTABLE_TABLE_NAME_PRACTICAS,
            [FIELD_NOMBRE_BUSQUEDA_PRACTICAS],
            `AND({${FIELD_ESTADO_PRACTICA}} = 'Finalizada', {${FIELD_NOMBRE_INSTITucion_LOOKUP_PRACTICAS}} != '${EXCLUDED_PPS_NAME}')`
          ),
        ]);

        if (lanzamientos2025Res.error) throw new Error("Error fetching 2025 launches");
        if (newStudentsRes.error) throw new Error("Error fetching new students");
        if (completedPracticesRes.error) throw new Error("Error fetching completed practices");

        // Process new students with zero PPS
        const studentsWithCompletedPPS = new Set(
          completedPracticesRes.records.map(p => p.fields[FIELD_NOMBRE_BUSQUEDA_PRACTICAS]?.[0]).filter(Boolean)
        );

        const newStudentsWithZeroPPSCount = newStudentsRes.records.filter(
          student => !studentsWithCompletedPPS.has(student.fields[FIELD_NOMBRE_ESTUDIANTES])
        ).length;

        setStats([
          { value: lanzamientos2025Res.records.length, label: 'Lanzamientos PPS (2025)', icon: 'rocket_launch', color: 'bg-sky-500' },
          { value: newStudentsWithZeroPPSCount, label: `Nuevos Estudiantes (${currentYear}) Sin PPS`, icon: 'person_add', color: 'bg-amber-500' },
        ]);

      } catch (e: any) {
        setError('No se pudieron cargar las estadísticas. ' + (e.message || 'Error desconocido.'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (error) {
    return <EmptyState icon="error" title="Error al Cargar" message={error} />;
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-slate-800">Dashboard de Resumen</h3>
        <p className="text-slate-600 max-w-2xl mt-1">
          Una vista rápida de la actividad reciente y el estado general de las prácticas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map(stat => (
          <StatCard key={stat.label} stat={stat} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;