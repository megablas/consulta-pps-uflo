import React from 'react';
import Loader from './components/Loader';
import Auth from './components/Auth';
import StudentView from './views/StudentView';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import AdminView from './views/AdminView';
import JefeView from './views/JefeView';

const App: React.FC = () => {
  const { authenticatedUser, isAuthLoading, isSuperUserMode, isJefeMode } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  // ModalProvider envuelve toda la aplicación para que los modales estén disponibles globalmente.
  // La lógica de datos y acciones se gestiona ahora dentro de cada vista (StudentView, AdminView),
  // eliminando la necesidad de un DataProvider global.
  return (
    <ModalProvider>
      <Layout>
        {!authenticatedUser ? (
          <Auth />
        ) : isSuperUserMode ? (
          <AdminView />
        ) : isJefeMode ? (
          <JefeView />
        ) : (
          <StudentView />
        )}
      </Layout>
    </ModalProvider>
  );
};

export default App;
