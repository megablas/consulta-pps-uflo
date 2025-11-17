import React, { useMemo } from 'react';
import type { Convocatoria, LanzamientoPPS, EstudianteFields, CalendarEvent, InformeTask, TabId } from '../types';
import {
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
} from '../constants';
import { parseToUTCDate, getEspecialidadClasses, normalizeStringForComparison, formatDate, isValidLocation } from '../utils/formatters';
import Card from './Card';
import ConvocatoriasList from './ConvocatoriasList';

interface HomeViewProps {
  myEnrollments: Convocatoria[];
  allLanzamientos: LanzamientoPPS[];
  lanzamientos: LanzamientoPPS[]; // Open convocatorias
  student: EstudianteFields | null;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  institutionAddressMap: Map<string, string>;
  enrollmentMap: Map<string, Convocatoria>;
  completedLanzamientoIds: Set<string>;
  informeTasks: InformeTask[];
  onNavigate: (tabId: TabId) => void;
}

const NextPracticeCard: React.FC<{ event: CalendarEvent; date: Date; isToday: boolean }> = ({ event, date, isToday }) => {
    return (
        <div 
            className="group relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-indigo-900/30 border border-slate-200/80 dark:border-slate-700/80 border-l-4 border-l-blue-500 dark:border-l-blue-400 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500 hover:-translate-y-1"
        >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4 flex-grow">
                    <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full h-12 w-12 flex items-center justify-center">
                        <span className="material-icons !text-2xl">{isToday ? "today" : "event"}</span>
                    </div>
                    <div className="flex-grow">
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-wide">{isToday ? "HOY" : "MAÑANA"} &bull; {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date)}</p>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-1">{event.name}</h2>
                        <div className="mt-2 space-y-1.5 text-sm">
                            <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <span className="material-icons !text-base text-slate-400 dark:text-slate-500">schedule</span>
                                <span>{event.schedule}</span>
                            </p>
                             <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <span className="material-icons !text-base text-slate-400 dark:text-slate-500">location_on</span>
                                <span>{event.location}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 self-start sm:self-center ml-auto sm:ml-0">
                     {isValidLocation(event.location) && (
                         <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs py-2 px-3 rounded-lg transition-colors"
                        >
                            <span className="material-icons !text-sm">map</span>
                            Ver Mapa
                        </a>
                     )}
                </div>
            </div>
        </div>
    );
};


const HomeView: React.FC<HomeViewProps> = ({ myEnrollments, allLanzamientos, lanzamientos, student, onInscribir, institutionAddressMap, enrollmentMap, completedLanzamientoIds, informeTasks, onNavigate }) => {
    
    const allPracticeEvents = useMemo(() => {
        const events: { date: Date, event: CalendarEvent }[] = [];
        const dayMap: { [key: string]: number } = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0 };
        
        const enrolledPractices = myEnrollments
            .filter(e => normalizeStringForComparison(e[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]) === 'seleccionado')
            .map(enrollment => {
                let pps: LanzamientoPPS | undefined;
                const lanzamientoId = (enrollment[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
                if (lanzamientoId) pps = allLanzamientos.find(l => l.id === lanzamientoId);
                return pps ? { pps, enrollment } : null;
            })
            .filter((item): item is { pps: LanzamientoPPS, enrollment: Convocatoria } => item !== null);

        enrolledPractices.forEach(({ pps, enrollment }) => {
            const ppsStartDate = parseToUTCDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            const ppsEndDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
            const schedule = (enrollment[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || '').trim();
            if (!schedule || !ppsStartDate || !ppsEndDate) return;
            
            const normalizedSchedule = normalizeStringForComparison(schedule);
            const scheduleDays = Object.keys(dayMap).filter(d => normalizedSchedule.includes(d) && !normalizedSchedule.includes(`no ${d}`));
            const scheduleDayNumbers = scheduleDays.map(d => dayMap[d]);

            for (let d = new Date(ppsStartDate); d <= ppsEndDate; d.setUTCDate(d.getUTCDate() + 1)) {
                if (scheduleDayNumbers.includes(d.getUTCDay())) {
                    const orientation = pps[FIELD_ORIENTACION_LANZAMIENTOS] || 'General';
                    events.push({
                        date: new Date(d),
                        event: {
                            id: pps.id,
                            name: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica',
                            schedule: schedule,
                            orientation: orientation,
                            location: pps[FIELD_DIRECCION_LANZAMIENTOS] || 'No especificada',
                            colorClasses: getEspecialidadClasses(orientation),
                            startDate: pps[FIELD_FECHA_INICIO_LANZAMIENTOS],
                            endDate: pps[FIELD_FECHA_FIN_LANZAMIENTOS],
                        }
                    });
                }
            }
        });
        return events.sort((a,b) => a.date.getTime() - b.date.getTime());
    }, [myEnrollments, allLanzamientos]);
    
    const nextPracticeForTodayOrTomorrow = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setUTCDate(today.getUTCDate() + 1);
        
        return allPracticeEvents.find(e => {
            const eventDate = new Date(e.date);
            eventDate.setUTCHours(0, 0, 0, 0);
            return eventDate.getTime() >= today.getTime() && (eventDate.getTime() === today.getTime() || eventDate.getTime() === tomorrow.getTime());
        });
    }, [allPracticeEvents]);
    
    if (!nextPracticeForTodayOrTomorrow && lanzamientos.length === 0) {
        return (
            <Card
                title="Todo en orden"
                description="No tienes prácticas programadas para hoy y no hay convocatorias abiertas en este momento."
            />
        );
    }
    
    const isToday = nextPracticeForTodayOrTomorrow ? new Date(nextPracticeForTodayOrTomorrow.date).setUTCHours(0,0,0,0) === new Date().setUTCHours(0,0,0,0) : false;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {nextPracticeForTodayOrTomorrow && (
                <NextPracticeCard 
                    event={nextPracticeForTodayOrTomorrow.event} 
                    date={nextPracticeForTodayOrTomorrow.date} 
                    isToday={isToday} 
                />
            )}
            
            {lanzamientos.length > 0 && (
                <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Convocatorias Abiertas</h2>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">Postúlate a las PPS disponibles que se ajusten a tu interés y disponibilidad.</p>
                    </div>
                    <ConvocatoriasList
                        lanzamientos={lanzamientos}
                        student={student}
                        onInscribir={onInscribir}
                        institutionAddressMap={institutionAddressMap}
                        enrollmentMap={enrollmentMap}
                        completedLanzamientoIds={completedLanzamientoIds}
                    />
                </div>
            )}
        </div>
    );
};

export default HomeView;
