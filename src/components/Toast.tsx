import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Allow time for fade-out animation before calling onClose
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const isSuccess = type === 'success';

  const baseClasses = 'fixed top-5 right-5 z-[2000] flex items-center gap-4 w-full max-w-sm p-4 rounded-xl shadow-lg border transition-all duration-300 ease-in-out';
  const stateClasses = isSuccess
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : 'bg-rose-50 border-rose-200 text-rose-800';
  const visibilityClasses = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 -translate-y-4';

  const icon = isSuccess ? 'check_circle' : 'error';
  const iconColor = isSuccess ? 'text-emerald-500' : 'text-rose-500';

  return (
    <div 
      className={`${baseClasses} ${stateClasses} ${visibilityClasses}`} 
      role="alert"
      aria-live="polite"
    >
      <div className={`flex-shrink-0 ${iconColor}`}>
        <span className="material-icons">{icon}</span>
      </div>
      <div className="flex-grow text-sm font-medium">{message}</div>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 -m-1 rounded-full hover:bg-black/10 transition-colors"
        aria-label="Cerrar notificación"
      >
        <span className="material-icons !text-base">close</span>
      </button>
    </div>
  );
};

export default Toast;