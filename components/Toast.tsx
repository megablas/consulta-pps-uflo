import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const toastTypeStyles = {
  success: {
    bg: 'bg-green-500',
    icon: 'check_circle',
  },
  error: {
    bg: 'bg-rose-500',
    icon: 'error',
  },
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Wait for exit animation to finish
  };

  const styles = toastTypeStyles[type];
  const animationClass = isExiting ? 'animate-fade-out' : 'animate-fade-in-up';

  return ReactDOM.createPortal(
    <div
      className={`fixed top-5 right-5 z-[2000] p-4 rounded-lg text-white shadow-2xl flex items-center gap-4 ${styles.bg} ${animationClass}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="material-icons !text-2xl">{styles.icon}</span>
      <p className="font-semibold text-sm">{message}</p>
      <button onClick={handleClose} className="p-1 rounded-full hover:bg-black/20" aria-label="Cerrar notificación">
        <span className="material-icons !text-lg">close</span>
      </button>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(-20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
        
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
      `}</style>
    </div>,
    document.body
  );
};

export default Toast;
