import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from '@/context/AuthContext.jsx';
import { ChurchProvider } from '@/context/ChurchContext.jsx';
const queryClient = new QueryClient();

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Unregister any old service workers that had a broken fetch handler,
    // then re-register the clean version.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      const unregisterPromises = registrations.map((r) => r.unregister());
      return Promise.all(unregisterPromises);
    }).then(() => {
      navigator.serviceWorker.register('/sw.js');
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ChurchProvider>
            <App />
          </ChurchProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
