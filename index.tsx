import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { AuthProvider } from './src/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Hardcode the base URL to match the manifest and deployment structure.
    const baseUrl = '/consulta-pps-uflo/';
    const swUrl = `${baseUrl}sw.js`;
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}