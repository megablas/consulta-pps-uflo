import React, { lazy, Suspense } from 'react';
import Loader from './components/Loader';
import Auth from './components/Auth';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { PwaInstallProvider } from './contexts/PwaInstallContext';

// Carga diferida (lazy loading) de las vistas principales para optimizar el rendimiento.
// Cada vista se cargará en un "chunk" de JavaScript separado solo cuando sea necesario.
const AdminView = lazy(() => import('./views/AdminView'));
const JefeView = lazy(() => import('./views/JefeView'));
const StudentView = lazy(() => import('./views/StudentView'));
const DirectivoView = lazy(() => import('./views/DirectivoView'));
const AdminTestingView = lazy(() => import('./views/AdminTestingView'));
const ReporteroView = lazy(() => import('./views/ReporteroView'));


const App: React.FC = () => {
  const { authenticatedUser, isAuthLoading, isSuperUserMode, isJefeMode, isDirectivoMode, isAdminTesterMode, isReporteroMode } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  // ModalProvider y ThemeProvider envuelven la aplicación para que sus contextos estén disponibles globalmente.
  return (
    <ThemeProvider>
      <ModalProvider>
        <PwaInstallProvider>
          <Layout>
            <ErrorBoundary>
              <Suspense fallback={(
                <div className="flex justify-center items-center min-h-[60vh]">
                  <Loader />
                </div>
              )}>
                {!authenticatedUser ? (
                  <Auth />
                ) : isSuperUserMode ? (
                  <AdminView />
                ) : isJefeMode ? (
                  <JefeView />
                ) : isDirectivoMode ? (
                  <DirectivoView />
                ) : isReporteroMode ? (
                  <ReporteroView />
                ) : isAdminTesterMode ? (
                  <AdminTestingView />
                ) : (
                  <StudentView />
                )}
              </Suspense>
            </ErrorBoundary>
          </Layout>
        </PwaInstallProvider>
      </ModalProvider>
    </ThemeProvider>
  );
};

export default App;