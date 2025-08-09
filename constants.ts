

// ADVERTENCIA DE SEGURIDAD: Este token está expuesto. En producción, debería estar en un backend.
export const AIRTABLE_PAT = 'patEjnXqyKnMwEUw5.19a19b12ad3c23b36888b9e228c2c9db1cbc923e9a29d7357e4103bb286d4bd1'; // TODO: Move to backend or environment variable
export const AIRTABLE_BASE_ID = 'appBY8PYhPZ1X2ka1';

export const AIRTABLE_TABLE_NAME_PPS = 'Solicitud de PPS';
export const AIRTABLE_TABLE_NAME_PRACTICAS = 'Prácticas';
export const AIRTABLE_TABLE_NAME_ESTUDIANTES = 'Estudiantes';
export const AIRTABLE_TABLE_NAME_AUTH_USERS = 'Auth Users';
export const AIRTABLE_TABLE_NAME_CONVOCATORIAS = 'Convocatorias';
export const AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS = 'Lanzamientos de PPS';


// Field names for Solicitud de PPS Table
export const FIELD_LEGAJO_PPS = 'Legajo';
export const FIELD_ESTADO_PPS = 'Estado de seguimiento';
export const FIELD_EMPRESA_PPS_SOLICITUD = 'Nombre de la Institución';
export const FIELD_NOMBRE_ESTUDIANTE_LOOKUP_PPS = 'Nombre Busqueda'; // This is often a lookup field, might be an array
export const FIELD_NOTAS_PPS = 'Notas';
export const FIELD_ULTIMA_ACTUALIZACION_PPS = 'Actualización';

// Field names for Prácticas Table
export const FIELD_NOMBRE_BUSQUEDA_PRACTICAS = 'Nombre busqueda'; // Lookup, might be array
export const FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS = 'Nombre (de Institución)'; // Lookup, might be array
export const FIELD_HORAS_PRACTICAS = 'Horas Realizadas';
export const FIELD_FECHA_INICIO_PRACTICAS = 'Fecha de Inicio';
export const FIELD_FECHA_FIN_PRACTICAS = 'Fecha de Finalización';
export const FIELD_ESTADO_PRACTICA = 'Estado';
export const FIELD_ESPECIALIDAD_PRACTICAS = 'Especialidad';
export const FIELD_NOTA_PRACTICAS = 'Nota';

// Field names for Estudiantes Table
export const FIELD_LEGAJO_ESTUDIANTES = 'Legajo';
export const FIELD_NOMBRE_ESTUDIANTES = 'Nombre';
export const FIELD_NOMBRE_SEPARADO_ESTUDIANTES = 'Nombre (Separado)';
export const FIELD_APELLIDO_SEPARADO_ESTUDIANTES = 'Apellido (Separado)';
export const FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES = 'Orientación Elegida';
export const FIELD_DNI_ESTUDIANTES = 'DNI';
export const FIELD_FECHA_NACIMIENTO_ESTUDIANTES = 'Fecha de Nacimiento';
export const FIELD_CORREO_ESTUDIANTES = 'Correo';
export const FIELD_TELEFONO_ESTUDIANTES = 'Teléfono';
export const FIELD_GENERO_ESTUDIANTES = 'Género';

// Field names for AuthUsers Table
export const FIELD_LEGAJO_AUTH = 'Legajo';
export const FIELD_NOMBRE_AUTH = 'Nombre';
export const FIELD_PASSWORD_HASH_AUTH = 'PasswordHash';
export const FIELD_SALT_AUTH = 'Salt';

// Field names for Lanzamientos de PPS Table
export const FIELD_NOMBRE_PPS_LANZAMIENTOS = 'Nombre PPS';
export const FIELD_FECHA_INICIO_LANZAMIENTOS = 'Fecha de Inicio';
export const FIELD_FECHA_FIN_LANZAMIENTOS = 'Fecha de Finalización';
export const FIELD_DIRECCION_LANZAMIENTOS = 'Dirección';
export const FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS = 'Horario Seleccionado';
export const FIELD_ORIENTACION_LANZAMIENTOS = 'Orientación';
export const FIELD_HORAS_ACREDITADAS_LANZAMIENTOS = 'Horas Acreditadas';
export const FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS = 'Cupos disponibles';
export const FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS = 'Estado de Convocatoria';

// Field names for Convocatorias Table (Enrollments)
export const FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS = 'Lanzamiento Vinculado'; // Link to 'Lanzamientos de PPS'
export const FIELD_NOMBRE_PPS_CONVOCATORIAS = 'Nombre PPS';
export const FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS = 'Estudiante Inscripto';
export const FIELD_NOMBRE_ESTUDIANTE_LOOKUP_CONVOCATORIAS = 'Nombre (de Estudiante Inscripto)'; // Lookup field from Estudiante
export const FIELD_FECHA_INICIO_CONVOCATORIAS = 'Fecha de Inicio';
export const FIELD_FECHA_FIN_CONVOCATORIAS = 'Fecha de Finalización';
export const FIELD_DIRECCION_CONVOCATORIAS = 'Dirección';
export const FIELD_HORARIO_FORMULA_CONVOCATORIAS = 'Horario';
export const FIELD_ESTADO_CONVOCATORIAS = 'Estado de Convocatoria'; // e.g. 'Abierta', 'Cerrada' - This might be deprecated on the enrollment record
export const FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS = 'Estado'; // e.g. 'No seleccionado', 'Seleccionado', 'Inscripto'
export const FIELD_ORIENTACION_CONVOCATORIAS = 'Orientación';
export const FIELD_TERMINO_CURSAR_CONVOCATORIAS = '¿Terminó de cursar?';
export const FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS = 'Cursando Materias Electivas';
export const FIELD_FINALES_ADEUDA_CONVOCATORIAS = 'Finales que adeuda';
export const FIELD_OTRA_SITUACION_CONVOCATORIAS = 'Otra situación académica';
export const FIELD_DNI_CONVOCATORIAS = 'DNI';
export const FIELD_CORREO_CONVOCATORIAS = 'Correo';
export const FIELD_FECHA_NACIMIENTO_CONVOCATORIAS = 'Fecha de Nacimiento';
export const FIELD_TELEFONO_CONVOCATORIAS = 'Teléfono';
export const FIELD_LEGAJO_CONVOCATORIAS = 'Legajo';


export const HORAS_OBJETIVO_TOTAL = 250;
export const HORAS_OBJETIVO_ORIENTACION = 70;
export const ROTACION_OBJETIVO_ORIENTACIONES = 3;

export const SOLICITUD_PPS_STATUS_OPTIONS = [
  'Solicitud Recibida',
  'Puesta en contacto',
  'En conversaciones',
  'Realizando convenio',
  'Convenio realizado',
  'No se pudo concretar',
  'Stand by',
];

export const ALERT_DISCLAIMER_TITLE = "Importante";
export const ALERT_DISCLAIMER_TEXT = "Esta información es una vista preliminar y puede no ser 100% precisa o estar actualizada. No tiene carácter de certificado oficial, solo una vez que finalicen todos los criterios, se carga en el sac su informacion de forma oficial. Para cualquier solicitud de corrección por omisión o error, es indispensable adjuntar la documentación respaldatoria correspondiente, principalmente la planilla de asistencia. No se responderán correos solicitando cambios sin la documentación adecuada.";