// --- Airtable Configuration ---
// Las claves se cargan desde variables de entorno para mayor seguridad y flexibilidad.
// El archivo .env en la raíz del proyecto debe contener estas variables.
export const AIRTABLE_PAT = "";
export const AIRTABLE_BASE_ID = "";

// Table Names
export const AIRTABLE_TABLE_NAME_PPS = 'Solicitud de PPS';
export const AIRTABLE_TABLE_NAME_PRACTICAS = 'Prácticas';
export const AIRTABLE_TABLE_NAME_ESTUDIANTES = 'Estudiantes';
export const AIRTABLE_TABLE_NAME_AUTH_USERS = 'Auth Users';
export const AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS = 'Lanzamientos de PPS';
export const AIRTABLE_TABLE_NAME_CONVOCATORIAS = 'Convocatorias';
export const AIRTABLE_TABLE_NAME_INSTITUCIONES = 'Instituciones';
export const AIRTABLE_TABLE_NAME_FINALIZACION = 'Finalización de PPS';
export const AIRTABLE_TABLE_NAME_PENALIZACIONES = 'Historial de Penalizaciones';


// --- Fields for 'Estudiantes' table ---
export const FIELD_LEGAJO_ESTUDIANTES = 'Legajo';
export const FIELD_NOMBRE_ESTUDIANTES = 'Nombre';
export const FIELD_NOMBRE_SEPARADO_ESTUDIANTES = 'Nombre (Separado)';
export const FIELD_APELLIDO_SEPARADO_ESTUDIANTES = 'Apellido (Separado)';
export const FIELD_GENERO_ESTUDIANTES = 'Género';
export const FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES = 'Orientación Elegida';
export const FIELD_DNI_ESTUDIANTES = 'DNI';
export const FIELD_FECHA_NACIMIENTO_ESTUDIANTES = 'Fecha de Nacimiento';
export const FIELD_CORREO_ESTUDIANTES = 'Correo';
export const FIELD_TELEFONO_ESTUDIANTES = 'Teléfono';
export const FIELD_NOTAS_INTERNAS_ESTUDIANTES = 'Notas Internas';
export const FIELD_FECHA_FINALIZACION_ESTUDIANTES = 'Fecha de Finalización';


// --- Fields for 'Prácticas' table ---
export const FIELD_NOMBRE_BUSQUEDA_PRACTICAS = 'Legajo Busqueda'; // Lookup from Estudiantes (should contain the Legajo value as text)
export const FIELD_ESTUDIANTE_LINK_PRACTICAS = 'Estudiante Inscripto'; // Link to Estudiantes table record
export const FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS = 'Nombre (de Institución)'; // Lookup from Institucion
export const FIELD_HORAS_PRACTICAS = 'Horas Realizadas';
export const FIELD_FECHA_INICIO_PRACTICAS = 'Fecha de Inicio';
export const FIELD_FECHA_FIN_PRACTICAS = 'Fecha de Finalización';
export const FIELD_ESTADO_PRACTICA = 'Estado';
export const FIELD_ESPECIALIDAD_PRACTICAS = 'Especialidad';
export const FIELD_NOTA_PRACTICAS = 'Nota';
export const FIELD_LANZAMIENTO_VINCULADO_PRACTICAS = 'Lanzamiento Vinculado';
export const FIELD_INSTITUCION_LINK_PRACTICAS = 'Institución';


// --- Fields for 'Solicitud de PPS' table ---
export const FIELD_LEGAJO_PPS = 'Legajo'; // Link to Estudiantes
export const FIELD_EMPRESA_PPS_SOLICITUD = 'Nombre de la Institución'; // Company Name
export const FIELD_ESTADO_PPS = 'Estado de seguimiento';
export const FIELD_ULTIMA_ACTUALIZACION_PPS = 'Actualización';
export const FIELD_NOTAS_PPS = 'Notas';

// --- Fields for 'AuthUsers' table ---
export const FIELD_LEGAJO_AUTH = 'Legajo';
export const FIELD_NOMBRE_AUTH = 'Nombre';
export const FIELD_PASSWORD_HASH_AUTH = 'PasswordHash';
export const FIELD_SALT_AUTH = 'Salt';
export const FIELD_ROLE_AUTH = 'Role';
export const FIELD_ORIENTACIONES_AUTH = 'Orientaciones';

// --- Fields for 'Lanzamientos de PPS' table ---
export const FIELD_NOMBRE_PPS_LANZAMIENTOS = 'Nombre PPS';
export const FIELD_FECHA_INICIO_LANZAMIENTOS = 'Fecha Inicio';
export const FIELD_FECHA_FIN_LANZAMIENTOS = 'Fecha Finalización';
export const FIELD_DIRECCION_LANZAMIENTOS = 'Dirección';
export const FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS = 'Horario Seleccionado';
export const FIELD_ORIENTACION_LANZAMIENTOS = 'Orientación';
export const FIELD_HORAS_ACREDITADAS_LANZAMIENTOS = 'Horas Acreditadas';
export const FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS = 'Cupos disponibles';
export const FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS = 'Estado de Convocatoria';
export const FIELD_DURACION_INSCRIPCION_DIAS_LANZAMIENTOS = 'Plazo Inscripción (días)';
export const FIELD_PLANTILLA_SEGURO_LANZAMIENTOS = 'Plantilla Seguro';
export const FIELD_INFORME_LANZAMIENTOS = 'Informe';
export const FIELD_ESTADO_GESTION_LANZAMIENTOS = 'Estado de Gestión';
export const FIELD_NOTAS_GESTION_LANZAMIENTOS = 'Notas de Gestión';
export const FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS = 'Fecha de Relanzamiento';
export const FIELD_TELEFONO_INSTITUCION_LANZAMIENTOS = 'Teléfono (from Instituciones)';
export const FIELD_PERMITE_CERTIFICADO_LANZAMIENTOS = 'Permite Certificado';


// --- Fields for 'Instituciones' table ---
export const FIELD_NOMBRE_INSTITUCIONES = 'Nombre';
export const FIELD_TELEFONO_INSTITUCIONES = 'Teléfono';
export const FIELD_DIRECCION_INSTITUCIONES = 'Dirección';
export const FIELD_CONVENIO_NUEVO_INSTITUCIONES = 'Convenio Nuevo';
export const FIELD_TUTOR_INSTITUCIONES = 'Tutor';


// --- Fields for 'Convocatorias' table ---
export const FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS = 'Lanzamiento Vinculado';
export const FIELD_NOMBRE_PPS_CONVOCATORIAS = 'Nombre PPS'; // Lookup from Lanzamientos
export const FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS = 'Estudiante Inscripto';
export const FIELD_FECHA_INICIO_CONVOCATORIAS = 'Fecha Inicio';
export const FIELD_FECHA_FIN_CONVOCATORIAS = 'Fecha Finalización';
export const FIELD_DIRECCION_CONVOCATORIAS = 'Dirección';
export const FIELD_HORARIO_FORMULA_CONVOCATORIAS = 'Horario';
export const FIELD_HORAS_ACREDITADAS_CONVOCATORIAS = 'Horas Acreditadas';
export const FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS = 'Cupos disponibles';
export const FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS = 'Estado'; // e.g., 'Inscripto', 'Seleccionado'
export const FIELD_ORIENTACION_CONVOCATORIAS = 'Orientación';
export const FIELD_TERMINO_CURSAR_CONVOCATORIAS = '¿Terminó de cursar?';
export const FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS = 'Cursando Materias Electivas';
export const FIELD_FINALES_ADEUDA_CONVOCATORIAS = 'Finales que adeuda';
export const FIELD_OTRA_SITUACION_CONVOCATORIAS = 'Otra situación académica';
export const FIELD_LEGAJO_CONVOCATORIAS = 'Legajo'; // Lookup
export const FIELD_DNI_CONVOCATORIAS = 'DNI'; // Lookup
export const FIELD_CORREO_CONVOCATORIAS = 'Correo'; // Lookup
export const FIELD_FECHA_NACIMIENTO_CONVOCATORIAS = 'Fecha de Nacimiento'; // Lookup
export const FIELD_TELEFONO_CONVOCATORIAS = 'Teléfono'; // Lookup
export const FIELD_INFORME_SUBIDO_CONVOCATORIAS = 'Informe Subido';
export const FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS = 'Fecha_Entrega_Informe';
export const FIELD_CERTIFICADO_CONVOCATORIAS = 'Certificado';

// --- Fields for 'Finalizacion PPS' table ---
export const FIELD_ESTUDIANTE_FINALIZACION = 'Nombre';

// --- Fields for 'Historial de Penalizaciones' table ---
export const FIELD_PENALIZACION_ESTUDIANTE_LINK = 'Estudiante';
export const FIELD_PENALIZACION_TIPO = 'Tipo de Incumplimiento';
export const FIELD_PENALIZACION_NOTAS = 'Notas';
export const FIELD_PENALIZACION_FECHA = 'Fecha del Incidente';
export const FIELD_PENALIZACION_PUNTAJE = 'Puntaje Penalización';
export const FIELD_PENALIZACION_CONVOCATORIA_LINK = 'Convocatoria Afectada';

// --- Academic criteria constants ---
export const HORAS_OBJETIVO_TOTAL = 250;
export const HORAS_OBJETIVO_ORIENTACION = 70;
export const ROTACION_OBJETIVO_ORIENTACIONES = 3;

// --- UI text constants ---
export const ALERT_PRACTICAS_TITLE = 'Aviso Importante';
export const ALERT_PRACTICAS_TEXT = 'La información visualizada es una herramienta de seguimiento interno y no constituye un registro académico oficial; puede contener errores. Para solicitar una corrección, es indispensable enviar un correo electrónico adjuntando la documentación que respalde el cambio (ej: planillas, certificados). No se procesarán solicitudes que no incluyan la documentación requerida.';
export const ALERT_INFORMES_TITLE = 'Sobre las Fechas de Entrega de Informes';
export const ALERT_INFORMES_TEXT = 'Las fechas de entrega de los informes pueden variar levemente, ya que se basan en la proyección de finalización de una PPS. Si la fecha no coincide con la finalización real, no te preocupes: siempre se respetarán los 30 días reglamentarios para entregar el informe. Puedes solicitar una corrección de fecha a través del correo.';


// --- Misc ---
export const EMAIL_SEGUROS = 'mesadeayuda.patagonia@uflouniversidad.edu.ar';
export const TEMPLATE_PPS_NAME = 'Colegio Virgen de Luján';