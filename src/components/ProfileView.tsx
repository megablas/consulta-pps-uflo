import React, { useState, useEffect } from 'react';
import Card from './Card';
import {
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_DNI_ESTUDIANTES,
  FIELD_CORREO_ESTUDIANTES,
  FIELD_TELEFONO_ESTUDIANTES,
  FIELD_NOTAS_INTERNAS_ESTUDIANTES,
} from '../constants';
import { SkeletonBox } from './Skeletons';
import { useAuth } from '../contexts/AuthContext';
import type { EstudianteFields } from '../types';
import type { UseMutationResult } from '@tanstack/react-query';

const InfoRow: React.FC<{ icon: string; label: string; value?: string | number | null }> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full h-10 w-10 flex items-center justify-center">
        <span className="material-icons !text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-base font-medium text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
};

const ProfileViewSkeleton: React.FC = () => (
    <div className="space-y-4">
        <SkeletonBox className="h-12 w-full" />
        <SkeletonBox className="h-12 w-full" />
        <SkeletonBox className="h-12 w-full" />
    </div>
);

interface ProfileViewProps {
  studentDetails: EstudianteFields | null;
  isLoading: boolean;
  updateInternalNotes: UseMutationResult<any, Error, string, unknown>;
}


const ProfileView: React.FC<ProfileViewProps> = ({ studentDetails, isLoading, updateInternalNotes }) => {
  const { isSuperUserMode, isJefeMode } = useAuth();
  
  const [internalNotes, setInternalNotes] = useState('');
  const [isNotesChanged, setIsNotesChanged] = useState(false);

  useEffect(() => {
    const notes = studentDetails?.[FIELD_NOTAS_INTERNAS_ESTUDIANTES] || '';
    setInternalNotes(notes);
    setIsNotesChanged(false);
  }, [studentDetails]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalNotes(e.target.value);
    setIsNotesChanged(e.target.value !== (studentDetails?.[FIELD_NOTAS_INTERNAS_ESTUDIANTES] || ''));
  };

  const handleSaveNotes = () => {
    if (isNotesChanged) {
        updateInternalNotes.mutate(internalNotes);
    }
  };

  if (isLoading || !studentDetails) {
    return <ProfileViewSkeleton />;
  }

  const {
    [FIELD_NOMBRE_ESTUDIANTES]: nombre,
    [FIELD_LEGAJO_ESTUDIANTES]: legajo,
    [FIELD_DNI_ESTUDIANTES]: dni,
    [FIELD_CORREO_ESTUDIANTES]: correo,
    [FIELD_TELEFONO_ESTUDIANTES]: telefono,
  } = studentDetails;

  const mailToSubject = `Solicitud de Actualización de Datos - Legajo ${legajo}`;
  const mailToBody = `Hola,\n\nQuisiera solicitar una actualización de mis datos personales.\n\n- Nombre Completo: ${nombre}\n- Legajo: ${legajo}\n\nDatos a actualizar (por favor, completar):\n- DNI: \n- Correo Electrónico: \n- Teléfono: \n\nAdjunto la documentación respaldatoria si es necesario.\n\nGracias.`;
  const mailToLink = `mailto:blas.rivera@uflouniversidad.edu.ar?subject=${encodeURIComponent(mailToSubject)}&body=${encodeURIComponent(mailToBody)}`;

  return (
    <>
      <div className="border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
          <InfoRow icon="fingerprint" label="DNI" value={dni} />
          <InfoRow icon="email" label="Correo Electrónico" value={correo} />
          <InfoRow icon="phone" label="Teléfono" value={telefono} />
      </div>
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <a
            href={mailToLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-offset-slate-800 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 active:transform active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span className="material-icons !text-lg transition-transform duration-300 relative z-10">edit</span>
            <span className="relative z-10 tracking-wide">Solicitar Actualización de Datos</span>
          </a>
      </div>

      {(isSuperUserMode || isJefeMode) && (
        <Card className="mt-8" icon="edit_note" title="Anotaciones Internas" description="Estas notas son privadas y solo visibles para administradores y jefes de cátedra.">
           <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                <textarea
                    value={internalNotes}
                    onChange={handleNotesChange}
                    rows={5}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-3 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-50 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-500 dark:focus:ring-blue-400 transition"
                    placeholder="Añadir comentarios, recordatorios o información de seguimiento sobre el estudiante..."
                />
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={handleSaveNotes}
                        disabled={!isNotesChanged || updateInternalNotes.isPending}
                        className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all duration-200 shadow-md hover:bg-blue-700 hover:-translate-y-px flex items-center gap-2 justify-center disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                    >
                        {updateInternalNotes.isPending ? (
                             <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/><span>Guardando...</span></>
                        ) : (
                             <><span className="material-icons !text-base">save</span><span>Guardar Notas</span></>
                        )}
                    </button>
                </div>
            </div>
        </Card>
      )}
    </>
  );
};

export default ProfileView;