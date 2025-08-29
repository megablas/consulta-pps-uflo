import React from 'react';

const CertificationButton: React.FC = React.memo(() => (
    <a
      href="https://airtable.com/appBY8PYhPZ1X2ka1/paglLBxubDedzl1qz/form"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 active:transform active:scale-95"
      aria-label="Solicitar acreditación final - Se abrirá en nueva ventana"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
      <span className="material-icons !text-lg transition-transform duration-300 relative z-10 group-hover:rotate-12 group-hover:scale-110">school</span>
      <span className="relative z-10 tracking-wide">Solicitar Acreditación</span>
      <span className="material-icons !text-sm opacity-80 transition-transform duration-300 relative z-10 group-hover:translate-x-0.5">open_in_new</span>
    </a>
));

CertificationButton.displayName = 'CertificationButton';
export default CertificationButton;