import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  handleRefresh = () => {
    window.location.reload();
  };

  static getDerivedStateFromError(error: Error): State {
    // Actualiza el estado para que el siguiente renderizado muestre la UI de fallback.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // También puedes registrar el error en un servicio de reporte de errores
    console.error("Error no capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Puedes renderizar cualquier UI de fallback personalizada
      return (
        <div className="flex items-center justify-center min-h-[60vh] animate-fade-in-up">
          <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-red-200/60 max-w-lg">
            <div className="mx-auto bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-full h-16 w-16 flex items-center justify-center">
              <span className="material-icons !text-4xl">report_problem</span>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-slate-800 dark:text-slate-100">Oops, algo salió mal.</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Ocurrió un error inesperado en la aplicación. Nuestro equipo ha sido notificado.
              Por favor, intenta refrescar la página para continuar.
            </p>
            <div className="mt-8">
              <button
                onClick={this.handleRefresh}
                className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refrescar la página
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (this as any).props.children;
  }
}

export default ErrorBoundary;