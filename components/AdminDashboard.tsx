import React, { useState, useEffect } from 'react';
import { fetchAllAirtableData, fetchAirtableData } from '../services/airtableService';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  AIRTABLE_TABLE_NAME_PRACTICAS,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
  FIELD_HORAS_PRACTICAS,
  FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
  FIELD_NOMBRE_PPS_CONVOCATORIAS,
  FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_FECHA_INICIO_CONVOCATORIAS,
  HORAS_OBJETIVO_TOTAL
} from '../constants';
import type { LanzamientoPPSFields, PracticaFields, ConvocatoriaFields, EstudianteFields } from '../types';
import EmptyState from './EmptyState';
import { SkeletonBox } from './Skeletons';

interface Stat {
  value: number;
  label: string;
  icon: string;
  color: string;
}

interface LatestEnrollment {
  id: string;
  studentName: string;
  ppsName: string;
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
    { value: 0, label: 'Convocatorias Abiertas', icon: 'campaign', color: 'bg-sky-500' },
    { value: 0, label: 'Estudiantes Finalizados', icon: 'school', color: 'bg-emerald-500' },
  ]);
  const [latestEnrollments, setLatestEnrollments] = useState<LatestEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [openConvocatoriasRes, practicasRes, enrollmentsRes] = await Promise.all([
          fetchAirtableData<LanzamientoPPSFields>(
            AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
            [],
            `OR({${FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS}} = 'Abierta', {${FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS}} = 'Abierto')`
          ),
          fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [
            FIELD_HORAS_PRACTICAS,
            FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
          ]),
          fetchAirtableData<ConvocatoriaFields>(
            AIRTABLE_TABLE_NAME_CONVOCATORIAS,
            [FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS],
            undefined,
            5,
            [{ field: FIELD_FECHA_INICIO_CONVOCATORIAS, direction: 'desc' }]
          ),
        ]);

        // Process stats
        const studentHours: { [key: string]: number } = {};
        if (practicasRes.records) {
          practicasRes.records.forEach(p => {
            const studentName = p.fields[FIELD_NOMBRE_BUSQUEDA_PRACTICAS]?.[0];
            const hours = p.fields[FIELD_HORAS_PRACTICAS] || 0;
            if (studentName) {
              studentHours[studentName] = (studentHours[studentName] || 0) + hours;
            }
          });
        }
        const completedStudentsCount = Object.values(studentHours).filter(total => total >= HORAS_OBJETIVO_TOTAL).length;

        setStats([
          { value: openConvocatoriasRes.records.length, label: 'Convocatorias Abiertas', icon: 'campaign', color: 'bg-sky-500' },
          { value: completedStudentsCount, label: 'Estudiantes Finalizados', icon: 'school', color: 'bg-emerald-500' },
        ]);

        // Process latest enrollments
        if (enrollmentsRes.records) {
            const studentIds = Array.from(new Set(
                enrollmentsRes.records.flatMap(r => r.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])
            ));

            const studentNamesMap = new Map<string, string>();
            if (studentIds.length > 0) {
                const formula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
                const { records: studentRecords } = await fetchAirtableData<EstudianteFields>(
                  AIRTABLE_TABLE_NAME_ESTUDIANTES,
                  [FIELD_NOMBRE_ESTUDIANTES],
                  formula
                );

                if (studentRecords) {
                    studentRecords.forEach(record => {
                        studentNamesMap.set(record.id, record.fields[FIELD_NOMBRE_ESTUDIANTES] || 'Nombre desconocido');
                    });
                }
            }
            
            const enrollmentsData: LatestEnrollment[] = enrollmentsRes.records
                .map(r => {
                    const studentId = r.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]?.[0];
                    const studentName = studentId ? (studentNamesMap.get(studentId) || 'Nombre no encontrado') : 'Nombre no encontrado';
                    return {
                        id: r.id,
                        studentName: studentName,
                        ppsName: r.fields[FIELD_NOMBRE_PPS_CONVOCATORIAS] || 'PPS sin nombre',
                    };
                })
                .filter(e => e.studentName !== 'Nombre no encontrado');
            setLatestEnrollments(enrollmentsData);
        }

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

      <div className="bg-white p-6 rounded-2xl shadow-md shadow-slate-200/50 border border-slate-200/60">
        <h4 className="text-lg font-bold text-slate-800 mb-4">Últimas Inscripciones</h4>
        <div className="flow-root">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <SkeletonBox className="h-10 w-10 rounded-full" />
                  <div className="flex-grow space-y-1.5">
                    <SkeletonBox className="h-4 w-3/4" />
                    <SkeletonBox className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : latestEnrollments.length > 0 ? (
            <ul role="list" className="divide-y divide-slate-200/70">
              {latestEnrollments.map(enrollment => (
                <li key={enrollment.id} className="py-3 sm:py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-full size-10 flex items-center justify-center">
                      <span className="material-icons !text-xl">how_to_reg</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{enrollment.studentName}</p>
                      <p className="text-sm text-slate-500 truncate">
                        Se inscribió a <span className="font-medium text-slate-600">{enrollment.ppsName}</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="person_add_disabled" title="Sin Inscripciones Recientes" message="No se han registrado nuevas inscripciones últimamente." />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;