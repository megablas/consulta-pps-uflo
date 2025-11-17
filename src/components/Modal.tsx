import React from 'react';

interface ModalProps {
  title: string;
  message: string;
  isOpen: boolean;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ title, message, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-300"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md sm:max-w-lg text-center transform transition-all duration-300 scale-100 opacity-100">
        <h2 id="modal-title" className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-300 mb-4 text-left">{title}</h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base mb-6 sm:mb-8 leading-relaxed whitespace-pre-wrap text-left">{message}</p>
        <button
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg text-sm sm:text-base 
                     transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          aria-label="Cerrar modal"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

export default Modal;