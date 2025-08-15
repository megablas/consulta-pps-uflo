import React from 'react';
import { ALERT_DISCLAIMER_TITLE, ALERT_DISCLAIMER_TEXT } from '../constants';
import Card from './Card';

const Footer: React.FC = () => {
  const mailToLink = `mailto:blas.rivera@uflouniversidad.edu.ar?subject=${encodeURIComponent('Solicitud de Corrección de Datos - Mi Panel Académico')}&body=${encodeURIComponent(
    'Hola,\n\nSolicito una corrección en mis datos. Adjunto la documentación respaldatoria (ej. planilla de asistencia).\n\n- Nombre Completo: [Escribe tu nombre]\n- Legajo: [Escribe tu legajo]\n\nGracias.'
  )}`;

  return (
    <footer className="mt-16 mb-8">
      <Card>
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            <div className="bg-blue-100 text-blue-600 rounded-full size-11 flex items-center justify-center">
              <span className="material-icons" aria-hidden="true">
                gavel
              </span>
            </div>
          </div>
          <div className="flex-grow">
            <h3 className="font-bold text-slate-800 text-lg leading-tight">
              {ALERT_DISCLAIMER_TITLE}
            </h3>
            <p className="mt-2 text-slate-600 text-sm leading-relaxed max-w-prose">
              {ALERT_DISCLAIMER_TEXT}
            </p>
            <a
              href={mailToLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2.5 bg-blue-600 text-white font-bold text-sm py-2.5 px-6 rounded-lg border border-transparent hover:bg-blue-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-white"
            >
              <span className="material-icons !text-base">email</span>
              <span>Enviar correo para corrección</span>
            </a>
          </div>
        </div>
      </Card>
    </footer>
  );
};

export default Footer;