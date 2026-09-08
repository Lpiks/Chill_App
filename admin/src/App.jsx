import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Posts from './pages/Posts';
import Reports from './pages/Reports';
import Revenue from './pages/Revenue';
import Trending from './pages/Trending';
import Streams from './pages/Streams';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

// Components
import Sidebar from './components/Sidebar';

const queryClient = new QueryClient();

const ProtectedLayout = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) return <div>Chargement...</div>;
  if (!token) return <Navigate to="/login" />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: '120px', padding: '0px' }}>
        {children}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#111118', color: '#fff', border: '1px solid rgba(229,9,20,0.15)' } }} />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            } />

            <Route path="/users" element={
              <ProtectedLayout>
                <Users />
              </ProtectedLayout>
            } />

            <Route path="/users/:id" element={
              <ProtectedLayout>
                <UserDetail />
              </ProtectedLayout>
            } />

            <Route path="/posts" element={
              <ProtectedLayout>
                <Posts />
              </ProtectedLayout>
            } />

            <Route path="/reports" element={
              <ProtectedLayout>
                <Reports />
              </ProtectedLayout>
            } />

            <Route path="/revenue" element={
              <ProtectedLayout>
                <Revenue />
              </ProtectedLayout>
            } />

            <Route path="/trending" element={
              <ProtectedLayout>
                <Trending />
              </ProtectedLayout>
            } />

            <Route path="/streams" element={
              <ProtectedLayout>
                <Streams />
              </ProtectedLayout>
            } />

            <Route path="/notifications" element={
              <ProtectedLayout>
                <Notifications />
              </ProtectedLayout>
            } />

            <Route path="/settings" element={
              <ProtectedLayout>
                <Settings />
              </ProtectedLayout>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
