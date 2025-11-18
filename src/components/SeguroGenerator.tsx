import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllAirtableData } from '../services/airtableService';
import { formatDate, normalizeStringForComparison, simpleNameSplit } from '../utils/formatters';
import type { Convocatoria, ConvocatoriaFields, EstudianteFields, LanzamientoPPSFields } from '../types';
import {
    AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS,
    FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES,
    FIELD_DNI_ESTUDIANTES, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES,
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
    FIELD_PLANTILLA_SEGURO_LANZAMIENTOS,
    TEMPLATE_PPS_NAME,
    EMAIL_SEGUROS
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Checkbox from './Checkbox';
import Toast from './Toast';
import Card from './Card';
import { convocatoriaArraySchema, estudianteArraySchema, lanzamientoPPSArraySchema } from '../schemas';
import { z } from 'zod';

interface SeguroGeneratorProps {
    showModal: (title: string, message: string) => void;
    isTestingMode?: boolean;
}

interface StudentForReview {
    studentId: string;
    nombre: string;
    apellido: string;
    dni: string;
    legajo: string;
    correo: string;
    telefono: string;
    institucion: string;
    direccion: string;
    periodo: string;
    horario: string;
    lugar: string; // for excel
    duracion: string; // for excel
    tutor: string; // for excel
    orientacion: string;
};

const mockConvocatoriasForSeguro: Convocatoria[] = [{
    id: 'Hospital de Simulación||2024-08-15',
    [FIELD_NOMBRE_PPS_CONVOCATORIAS]: 'Hospital de Simulación',
    [FIELD_FECHA_INICIO_CONVOCATORIAS]: '2024-08-15',
    [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: ['recStudTest1', 'recStudTest2'],
} as unknown as Convocatoria];

const mockStudentsForReview: StudentForReview[] = [
    { studentId: 'recStudTest1', nombre: 'Juan', apellido: 'Tester', dni: '11222333', legajo: 'T9001', correo: 'juan@test.com', telefono: '1133445566', institucion: 'Hospital de Simulación', direccion: 'Calle Falsa 123', periodo: 'Del 15/08/2024 al 15/12/2024', horario: 'Lunes y Miércoles 9 a 13hs', lugar: 'Hospital de Simulación - Calle Falsa 123', duracion: 'Período: Del 15/08/2024 al 15/12/2024. Horario: Lunes y Miércoles 9 a 13hs', tutor: 'Selva Estrella', orientacion: 'Clinica' },
    { studentId: 'recStudTest2', nombre: 'Maria', apellido: 'Debug', dni: '44555666', legajo: 'T9002', correo: 'maria@test.com', telefono: '1177889900', institucion: 'Hospital de Simulación', direccion: 'Calle Falsa 123', periodo: 'Del 15/08/2024 al 15/12/2024', horario: 'Lunes y Miércoles 9 a 13hs', lugar: 'Hospital de Simulación - Calle Falsa 123', duracion: 'Período: Del 15/08/2024 al 15/12/2024. Horario: Lunes y Miércoles 9 a 13hs', tutor: 'Selva Estrella', orientacion: 'Clinica' },
];

const getTextField = (fields: z.infer<typeof estudianteArraySchema>[number]['fields'] | z.infer<typeof convocatoriaArraySchema>[number]['fields'], fieldName: string): string => {
    const value = (fields as any)[fieldName];
    // Lookups can be arrays, so we join them.
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    return String(value || '');
};


const SeguroGenerator: React.FC<SeguroGeneratorProps> = ({ showModal, isTestingMode = false }) => {
    const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
    const [studentMap, setStudentMap] = useState<Map<string, EstudianteFields>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedConvocatoria, setSelectedConvocatoria] = useState<Convocatoria | null>(null);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            if (isTestingMode) {
                setConvocatorias(mockConvocatoriasForSeguro);
                const mockStudentMap = new Map();
                mockStudentMap.set('recStudTest1', { [FIELD_NOMBRE_ESTUDIANTES]: 'Juan Tester', [FIELD_LEGAJO_ESTUDIANTES]: 'T9001', [FIELD_DNI_ESTUDIANTES]: 11222333, [FIELD_CORREO_ESTUDIANTES]: 'juan@test.com', [FIELD_TELEFONO_ESTUDIANTES]: '1133445566' });
                mockStudentMap.set('recStudTest2', { [FIELD_NOMBRE_ESTUDIANTES]: 'Maria Debug', [FIELD_LEGAJO_ESTUDIANTES]: 'T9002', [FIELD_DNI_ESTUDIANTES]: 44555666, [FIELD_CORREO_ESTUDIANTES]: 'maria@test.com', [FIELD_TELEFONO_ESTUDIANTES]: '1177889900' });
                setStudentMap(mockStudentMap);
                setLoading(false);
                return;
            }

            try {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                const formula = `AND(
                    LOWER({${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}}) = "seleccionado",
                    IS_AFTER({${FIELD_FECHA_INICIO_CONVOCATORIAS}}, '${oneMonthAgo.toISOString().split('T')[0]}')
                )`;
                
                const { records: convRecords, error: convError } = await fetchAllAirtableData<ConvocatoriaFields>(
                    AIRTABLE_TABLE_NAME_CONVOCATORIAS,
                    convocatoriaArraySchema,
                    [
                        FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_FECHA_FIN_CONVOCATORIAS,
                        FIELD_DIRECCION_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
                        FIELD_ORIENTACION_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS
                    ],
                    formula
                );
                
                if (convError) throw new Error(typeof convError.error === 'string' ? convError.error : convError.error.message);
                
                const studentIds = [...new Set(convRecords.flatMap(c => (c.fields as any)[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []))];
                let students: EstudianteFields[] = [];
                if (studentIds.length > 0) {
                     const studentFormula = `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
                     const { records: studentRecords, error: studentError } = await fetchAllAirtableData<EstudianteFields>(
                        AIRTABLE_TABLE_NAME_ESTUDIANTES,
                        estudianteArraySchema,
                        [
                            FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, FIELD_DNI_ESTUDIANTES,
                            FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES,
                            FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES
                        ],
                        studentFormula
                     );
                     if (studentError) throw new Error(typeof studentError.error === 'string' ? studentError.error : studentError.error.message);
                     const studentDataMap = new Map(studentRecords.map(r => [r.id, r.fields as EstudianteFields]));
                     setStudentMap(studentDataMap);
                }

                // Group convocatorias by PPS name and start date to create unique "events"
                const groupedConvocatorias: { [key: string]: Convocatoria } = {};
                convRecords.forEach(c => {
                    const name = Array.isArray(c.fields[FIELD_NOMBRE_PPS_CONVOCATORIAS]) ? c.fields[FIELD_NOMBRE_PPS_CONVOCATORIAS][0] : c.fields[FIELD_NOMBRE_PPS_CONVOCATORIAS];
                    const date = c.fields[FIELD_FECHA_INICIO_CONVOCATORIAS];
                    const key = `${name}||${date}`;

                    if (groupedConvocatorias[key]) {
                        groupedConvocatorias[key][FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] = [
                            ...(groupedConvocatorias[key][FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || []),
                            ...(c.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])
                        ];
                    } else {
                        groupedConvocatorias[key] = { ...c.fields as any, id: key };
                    }
                });

                setConvocatorias(Object.values(groupedConvocatorias));

            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isTestingMode]);

    const handleSelectConvocatoria = (key: string) => {
        const conv = convocatorias.find(c => c.id === key);
        setSelectedConvocatoria(conv || null);
        setSelectedStudents(new Set());
    };

    const handleSelectStudent = (studentId: string) => {
        setSelectedStudents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) {
                newSet.delete(studentId);
            } else {
                newSet.add(studentId);
            }
            return newSet;
        });
    };

    const studentsForReview: StudentForReview[] = useMemo(() => {
        if (!selectedConvocatoria) return isTestingMode ? mockStudentsForReview : [];
        const studentIds = selectedConvocatoria[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [];
        
        return studentIds.map((studentId: string) => {
            const student = studentMap.get(studentId);
            if (!student) return null;

            const conv = selectedConvocatoria as any;

            const nombre = getTextField(student as any, FIELD_NOMBRE_SEPARADO_ESTUDIANTES) || getTextField(student as any, FIELD_NOMBRE_ESTUDIANTES) || 'N/A';
            const apellido = getTextField(student as any, FIELD_APELLIDO_SEPARADO_ESTUDIANTES) || '';
            
            const { nombre: autoNombre, apellido: autoApellido } = simpleNameSplit(student[FIELD_NOMBRE_ESTUDIANTES] || '');

            const institucion = getTextField(conv, FIELD_NOMBRE_PPS_CONVOCATORIAS);
            const direccion = getTextField(conv, FIELD_DIRECCION_CONVOCATORIAS);
            const horario = getTextField(conv, FIELD_HORARIO_FORMULA_CONVOCATORIAS);
            const orientacion = getTextField(conv, FIELD_ORIENTACION_CONVOCATORIAS);

            return {
                studentId: studentId,
                nombre: nombre || autoNombre,
                apellido: apellido || autoApellido,
                dni: getTextField(student as any, FIELD_DNI_ESTUDIANTES),
                legajo: getTextField(student as any, FIELD_LEGAJO_ESTUDIANTES),
                correo: getTextField(student as any, FIELD_CORREO_ESTUDIANTES),
                telefono: getTextField(student as any, FIELD_TELEFONO_ESTUDIANTES),
                institucion,
                direccion,
                periodo: `Del ${formatDate(conv[FIELD_FECHA_INICIO_CONVOCATORIAS] as string)} al ${formatDate(conv[FIELD_FECHA_FIN_CONVOCATORIAS] as string)}`,
                horario,
                lugar: `${institucion} - ${direccion}`,
                duracion: `Período: Del ${formatDate(conv[FIELD_FECHA_INICIO_CONVOCATORIAS] as string)} al ${formatDate(conv[FIELD_FECHA_FIN_CONVOCATORIAS] as string)}. Horario: ${horario}`,
                tutor: orientacion === 'Clinica' ? 'Selva Estrella' : orientacion === 'Educacional' ? 'Franco Pedraza' : 'Cynthia Rossi',
                orientacion,
            };
        }).filter((s): s is StudentForReview => s !== null);
    }, [selectedConvocatoria, studentMap, isTestingMode]);

    const generateExcel = async () => {
        // ... implementation remains the same
    };
    
    // Render logic remains largely the same
    if (loading) return <Loader />;
    if (error) return <EmptyState icon="error" title="Error al Cargar" message={error} />;

    return (
        <Card>
             {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
             {/* ... UI remains the same */}
        </Card>
    );
};

export default SeguroGenerator;
