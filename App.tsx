import React from 'react';
import Loader from './components/Loader';
import Modal from './components/Modal';
import Auth from './components/Auth';
import StudentView from './views/StudentView';
import AdminView from './views/AdminView';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

const AppContent: React.FC = () => {
  const { authenticatedUser, isSuperUserMode } = useAuth();
  
  if (!authenticatedUser) {
    // This case should ideally not be hit if App logic is correct, but as a safeguard.
    return null;
  }
  
  // Each View gets its own DataProvider to encapsulate its state.
  // The key ensures that when an admin searches a new student, the DataProvider is re-mounted.
  return (
    <DataProvider 
      key={isSuperUserMode ? 'admin' : authenticatedUser.legajo}
      user={authenticatedUser}
    >
      {isSuperUserMode ? <AdminView /> : <StudentView />}
    </DataProvider>
  );
};


const App: React.FC = () => {
  const { authenticatedUser, isAuthLoading } = useAuth();
  const [modalInfo, setModalInfo] = React.useState<{title: string, message: string} | null>(null);

  const handleShowModal = (title: string, message: string) => {
    setModalInfo({ title, message });
  };
  
  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <>
      <Modal
        isOpen={!!modalInfo}
        title={modalInfo?.title || ''}
        message={modalInfo?.message || ''}
        onClose={() => setModalInfo(null)}
      />
      <Layout>
        {!authenticatedUser ? (
          <Auth showModal={handleShowModal} />
        ) : (
          <AppContent />
        )}
      </Layout>
    </>
  );
};

export default App;