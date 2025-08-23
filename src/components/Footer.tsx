import React from 'react';
import { ALERT_PRACTICAS_TITLE, ALERT_PRACTICAS_TEXT, ALERT_INFORMES_TITLE } from '../constants';
import Card from './Card';
import type { TabId } from '../types';

interface FooterProps {
  activeTab: TabId;
}

interface NoticeConfig {
  title: string;
  text: string;
  icon: string;
  mailToSubject: string;
  mailToBody: string;
  buttonText: string;
}

const noticeConfig: Partial<Record<TabId, NoticeConfig>> = {
  convocatorias: {
    title: 'Sobre las Convocatorias',
    text: 'Las convocatorias se abren y cierran según las necesidades de las instituciones. Si no ves una PPS de tu interés, ¡vuelve a consultar pronto! Las fechas y horarios son definidos por cada institución y no pueden modificarse.',
    icon: 'campaign',
    mailToSubject: 'Consulta sobre Convocatorias de PPS - Mi Panel Académico',
    mailToBody: 'Hola,\n\nTengo una consulta sobre las convocatorias de PPS.\n\n- Nombre Completo: [Escribe tu nombre]\n- Legajo: [Escribe tu legajo]\n- Mi consulta es: [Describe tu duda]\n\nGracias.',
    buttonText: 'Consultar sobre convocatorias'
  },
  informes: {
    title: ALERT_INFORMES_TITLE,
    text: 'El proceso de entrega tiene dos pasos: primero, haz clic en la tarjeta del informe para ir al campus y subir tu archivo. Luego, regresa a este panel y presiona "Confirmar Entrega" para notificarnos. Las fechas límite pueden variar levemente; siempre se respetarán los 30 días reglamentarios desde tu finalización real para la entrega.',
    icon: 'rule_folder',
    mailToSubject: 'Consulta sobre Fecha de Entrega de Informe - Mi Panel Académico',
    mailToBody: 'Hola,\n\nQuisiera solicitar una corrección o consultar sobre la fecha de entrega de un informe.\n\n- Nombre Completo: [Escribe tu nombre]\n- Legajo: [Escribe tu legajo]\n- PPS Involucrada: [Escribe el nombre de la PPS]\n\nGracias.',
    buttonText: 'Consultar sobre fecha de entrega'
  },
  solicitudes: {
    title: 'Acerca de tus Solicitudes',
    text: 'El estado de tus solicitudes de PPS se actualiza a medida que avanzan las gestiones con las instituciones, lo cual puede tomar tiempo. Te mantendremos informado de cada avance a través de notificaciones por correo electrónico. Si tienes dudas sobre un estado en particular, puedes contactarnos.',
    icon: 'list_alt',
    mailToSubject: 'Consulta sobre Estado de Solicitud de PPS - Mi Panel Académico',
    mailToBody: 'Hola,\n\nTengo una consulta sobre el estado de mi solicitud de PPS.\n\n- Nombre Completo: [Escribe tu nombre]\n- Legajo: [Escribe tu legajo]\n- Institución Solicitada: [Escribe el nombre de la institución]\n\nGracias.',
    buttonText: 'Consultar sobre una solicitud'
  },
  practicas: {
    title: ALERT_PRACTICAS_TITLE,
    text: ALERT_PRACTICAS_TEXT,
    icon: 'gavel',
    mailToSubject: 'Solicitud de Corrección de Datos - Mi Panel Académico',
    mailToBody: 'Hola,\n\nSolicito una corrección en mis datos. Adjunto la documentación respaldatoria (ej. planilla de asistencia).\n\n- Nombre Completo: [Escribe tu nombre]\n- Legajo: [Escribe tu legajo]\n\nGracias.',
    buttonText: 'Enviar correo para corrección'
  }
};


const Footer: React.FC<FooterProps> = ({ activeTab }) => {
  const currentNotice = noticeConfig[activeTab];

  if (!currentNotice) {
    return null;
  }
  
  const mailToLink = `mailto:blas.rivera@uflouniversidad.edu.ar?subject=${encodeURIComponent(currentNotice.mailToSubject)}&body=${encodeURIComponent(currentNotice.mailToBody)}`;

  return (
    <footer className="mt-16 mb-8 animate-fade-in-up">
      <Card>
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            <div className="bg-blue-100 text-blue-600 rounded-full size-11 flex items-center justify-center">
              <span className="material-icons" aria-hidden="true">
                {currentNotice.icon}
              </span>
            </div>
          </div>
          <div className="flex-grow">
            <h3 className="font-bold text-slate-800 text-lg leading-tight">
              {currentNotice.title}
            </h3>
            <p className="mt-2 text-slate-600 text-sm leading-relaxed max-w-prose">
              {currentNotice.text}
            </p>
            <a
              href={mailToLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2.5 bg-blue-600 text-white font-bold text-sm py-2.5 px-6 rounded-lg border border-transparent hover:bg-blue-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-white"
            >
              <span className="material-icons !text-base">email</span>
              <span>{currentNotice.buttonText}</span>
            </a>
          </div>
        </div>
      </Card>
    </footer>
  );
};

export default Footer;
