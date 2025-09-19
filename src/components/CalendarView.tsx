import React, { useState, useMemo } from 'react';
import type { Convocatoria, LanzamientoPPS, CalendarEvent } from '../types';
import {
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_FECHA_INICIO_CONVOCATORIAS,
    FIELD_NOMBRE_PPS_CONVOCATORIAS,
} from '../constants';
import { parseToUTCDate, getEspecialidadClasses, normalizeStringForComparison } from '../utils/formatters';
import EmptyState from './EmptyState';

const WEEK_DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const WEEK_DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];


// Modal Component
const DayDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: CalendarEvent[];
}> = ({ isOpen, onClose, date, events }) => {
    if (!isOpen || !date) return null;

    const formattedDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up"
            style={{ animationDuration: '200ms' }}
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            >
                <header className="p-5 border-b border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between">
                    <div>
                        <h2 id="modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">{formattedDate}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Prácticas agendadas</p>
                    </div>
                    <button onClick={onClose} className="p-2 -m-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Cerrar modal">
                        <span className="material-icons">close</span>
                    </button>
                </header>
                <div className="p-6 overflow-y-auto">
                    {events.length > 0 ? (
                        <ul className="space-y-4">
                            {events.map((event, index) => (
                                <li key={`${event.id}-${index}`} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-900 dark:text-slate-50 pr-2">{event.name}</h3>
                                        <span className={event.colorClasses.tag}>{event.orientation}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md font-medium">{event.schedule}</p>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                        <span className="material-icons !text-base mt-0.5 text-slate-400">location_on</span>
                                        <span>{event.location}</span>
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400">No hay eventos para este día.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

interface CalendarViewProps {
  myEnrollments: Convocatoria[];
  allLanzamientos: LanzamientoPPS[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ myEnrollments, allLanzamientos }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const enrolledPractices = useMemo(() => {
        return myEnrollments
            .filter(e => normalizeStringForComparison(e[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]) === 'seleccionado')
            .map(enrollment => {
                let pps: LanzamientoPPS | undefined;
                const lanzamientoId = (enrollment[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
                
                if (lanzamientoId) {
                    pps = allLanzamientos.find(l => l.id === lanzamientoId);
                }
                
                // Fallback logic if direct link fails or is missing
                if (!pps) {
                    const convPpsNameRaw = enrollment[FIELD_NOMBRE_PPS_CONVOCATORIAS];
                    const ppsNameToMatch = Array.isArray(convPpsNameRaw) ? convPpsNameRaw[0] : convPpsNameRaw;
                    const convStartDate = parseToUTCDate(enrollment[FIELD_FECHA_INICIO_CONVOCATORIAS]);
    
                    if (ppsNameToMatch && convStartDate) {
                        pps = allLanzamientos.find(l => {
                            const lanzamientoStartDate = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                            if (!lanzamientoStartDate) return false;
                            
                            const timeDiff = Math.abs(lanzamientoStartDate.getTime() - convStartDate.getTime());
                            const daysDiff = timeDiff / (1000 * 3600 * 24);

                            const normLanzamientoName = normalizeStringForComparison(l[FIELD_NOMBRE_PPS_LANZAMIENTOS]);
                            const normConvocatoriaName = normalizeStringForComparison(ppsNameToMatch as string);
                            const namesMatch = normLanzamientoName.includes(normConvocatoriaName) || normConvocatoriaName.includes(normLanzamientoName);
                            
                            return namesMatch && daysDiff <= 31;
                        });
                    }
                }
                
                if (!pps) return null;
                
                const startDate = parseToUTCDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                const endDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
                if (!startDate || !endDate) return null;

                // Devolvemos un objeto combinado con los datos del lanzamiento y la inscripción
                return { pps, enrollment };
            })
            .filter((item): item is { pps: LanzamientoPPS, enrollment: Convocatoria } => item !== null);
    }, [myEnrollments, allLanzamientos]);

    const eventsByDate = useMemo(() => {
        const events = new Map<string, CalendarEvent[]>();
        if (enrolledPractices.length === 0) return events;
        
        const year = currentDate.getUTCFullYear();
        const month = currentDate.getUTCMonth();
        const daysInMonth = new Date(year, month + 1, 0).getUTCDate();
        
        const dayMap: { [key: string]: number } = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0 };

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(Date.UTC(year, month, day));
            const dayOfWeek = date.getUTCDay();
            const dateString = date.toISOString().split('T')[0];

            enrolledPractices.forEach(({ pps, enrollment }) => {
                const ppsStartDate = parseToUTCDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                const ppsEndDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
                if (!ppsStartDate || !ppsEndDate || date < ppsStartDate || date > ppsEndDate) {
                    return;
                }

                // **LÓGICA DE HORARIO DEFINITIVA**
                // El horario DEBE provenir EXCLUSIVAMENTE del registro de 'Convocatorias' del estudiante ('Horario').
                // Si este campo está vacío, no hay horario asignado y no se debe mostrar el evento.
                const schedule = (enrollment[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || '').trim();

                if (!schedule) {
                    return; // No schedule assigned, so do not process this event for this day.
                }

                const normalizedSchedule = normalizeStringForComparison(schedule);
                const scheduleDays = Object.keys(dayMap).filter(d => normalizedSchedule.includes(d) && !normalizedSchedule.includes(`no ${d}`));

                if (scheduleDays.some(d => dayMap[d] === dayOfWeek)) {
                    if (!events.has(dateString)) {
                        events.set(dateString, []);
                    }
                    const orientation = pps[FIELD_ORIENTACION_LANZAMIENTOS] || 'General';
                    events.get(dateString)!.push({
                        id: pps.id,
                        name: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica',
                        schedule: schedule, // Use the original, non-normalized schedule string for display
                        orientation: orientation,
                        location: pps[FIELD_DIRECCION_LANZAMIENTOS] || 'No especificada',
                        colorClasses: getEspecialidadClasses(orientation),
                    });
                }
            });
        }
        return events;
    }, [currentDate, enrolledPractices]);

    const openModalForDate = (day: number) => {
        const date = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), day));
        setSelectedDate(date);
    };

    const closeModal = () => {
        setSelectedDate(null);
    };

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + offset, 1)));
    };

    const calendarGrid = useMemo(() => {
        const year = currentDate.getUTCFullYear();
        const month = currentDate.getUTCMonth();
        const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
        const daysInMonth = new Date(year, month + 1, 0).getUTCDate();
        const adjustedFirstDay = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;

        const grid = [];
        for (let i = 0; i < adjustedFirstDay; i++) {
            grid.push({ key: `prev-${i}`, day: null });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push({ key: `current-${i}`, day: i });
        }
        const gridLength = grid.length;
        for (let i = 0; i < (7 - (gridLength % 7)) % 7; i++) {
             grid.push({ key: `next-${i}`, day: null });
        }
        return grid;
    }, [currentDate]);

    const todayString = new Date().toISOString().split('T')[0];

    if (enrolledPractices.length === 0) {
        return <EmptyState icon="event_busy" title="Sin Prácticas Agendadas" message="Cuando seas seleccionado para una PPS y esté en curso, los días de cursada aparecerán aquí."/>;
    }

    return (
        <div className="bg-white dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/80 shadow-lg animate-fade-in-up">
            <header className="flex items-center justify-between mb-6 px-2">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Mes anterior"><span className="material-icons">chevron_left</span></button>
                <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize">{new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(currentDate)}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">Hoy</button>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Mes siguiente"><span className="material-icons">chevron_right</span></button>
                </div>
            </header>
            <div className="grid grid-cols-7 md:grid-cols-[repeat(5,1fr)_0.7fr_0.7fr] gap-1.5">
                {/* Desktop header */}
                {WEEK_DAYS_FULL.map((day, index) => <div key={day} className={`hidden text-center text-xs font-bold py-2 sm:block ${(index > 4) ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>{day}</div>)}
                {/* Mobile header */}
                {WEEK_DAYS_SHORT.map(day => <div key={day} className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-2 sm:hidden">{day}</div>)}
                
                {calendarGrid.map((cell, i) => {
                    const dateString = cell.day ? `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}` : '';
                    const isToday = !!cell.day && dateString === todayString;
                    const events = eventsByDate.get(dateString) || [];
                    const hasEvents = events.length > 0;
                    const isWeekend = cell.day && (i % 7 === 5 || i % 7 === 6);
                    
                    const cellClasses = `relative h-24 sm:h-32 border border-slate-200/60 dark:border-slate-700/60 rounded-lg p-2 flex flex-col transition-colors duration-200 ${cell.day ? (isWeekend ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-800') : 'bg-slate-50/50 dark:bg-slate-800/30'} ${hasEvents ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600' : ''}`;
                    
                    const CellWrapper = hasEvents ? 'button' as const : 'div' as const;
                    
                    return (
                        <CellWrapper 
                            key={cell.key} 
                            className={cellClasses}
                            onClick={hasEvents ? () => openModalForDate(cell.day!) : undefined}
                            aria-label={hasEvents ? `Ver detalles para el día ${cell.day}` : undefined}
                        >
                            {cell.day && (
                                <>
                                    <span className={`text-sm mb-1 ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold' : (isWeekend ? 'text-slate-500 dark:text-slate-400 font-medium' : 'text-slate-700 dark:text-slate-200 font-semibold')}`}>{cell.day}</span>
                                    {hasEvents && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {events.map((event, index) => (
                                                <div key={index} className={`w-2 h-2 rounded-full ${event.colorClasses.dot}`} title={event.name} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </CellWrapper>
                    );
                })}
            </div>
             <DayDetailModal 
                isOpen={!!selectedDate}
                onClose={closeModal}
                date={selectedDate}
                events={selectedDate ? eventsByDate.get(selectedDate.toISOString().split('T')[0]) || [] : []}
            />
        </div>
    );
};

export default CalendarView;