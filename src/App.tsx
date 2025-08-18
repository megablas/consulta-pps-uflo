import React from 'react';
import Loader from './components/Loader';
import Auth from './components/Auth';
import StudentView from './views/StudentView';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ModalProvider } from './contexts/ModalContext';
import AppModals from './components/AppModals';
import AdminView from './views/AdminView';

const App: React.FC = () => {
  const { authenticatedUser, isAuthLoading, isSuperUserMode } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <ModalProvider>
      {!authenticatedUser ? (
        <Layout>
          <Auth />
        </Layout>
      ) : (
        <DataProvider
          key={isSuperUserMode ? 'admin' : authenticatedUser.legajo}
          user={authenticatedUser}
        >
          <Layout>
            {isSuperUserMode ? <AdminView /> : <StudentView />}
          </Layout>
          <AppModals />
        </DataProvider>
      )}
    </ModalProvider>
  );
};

export default App;