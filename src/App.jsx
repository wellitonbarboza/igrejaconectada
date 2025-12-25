import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './Layout.jsx';
import Dashboard from '@/pages/Dashboard.jsx';
import Membros from '@/pages/Membros.jsx';
import DetalhesMembro from '@/pages/DetalhesMembro.jsx';
import Departamentos from '@/pages/Departamentos.jsx';
import Congregacoes from '@/pages/Congregacoes.jsx';
import Relatorios from '@/pages/Relatorios.jsx';
import Cartoes from '@/pages/Cartoes.jsx';
import Configuracoes from '@/pages/Configuracoes.jsx';
import Cartas from '@/pages/Cartas.jsx';
import UsuariosAdmin from '@/pages/UsuariosAdmin.jsx';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/context/AuthContext.jsx';

function ProtectedShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center space-y-2">
          <p className="text-slate-600">Carregando acesso administrativo...</p>
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedShell />}>
        <Route index element={<Navigate to={createPageUrl('Dashboard')} replace />} />
        <Route path={createPageUrl('Dashboard')} element={<Dashboard />} />
        <Route path={createPageUrl('Membros')} element={<Membros />} />
        <Route path={createPageUrl('DetalhesMembro')} element={<DetalhesMembro />} />
        <Route path={createPageUrl('Departamentos')} element={<Departamentos />} />
        <Route path={createPageUrl('Congregacoes')} element={<Congregacoes />} />
        <Route path={createPageUrl('Relatorios')} element={<Relatorios />} />
        <Route path={createPageUrl('Cartoes')} element={<Cartoes />} />
        <Route path={createPageUrl('Configuracoes')} element={<Configuracoes />} />
        <Route path={createPageUrl('Cartas')} element={<Cartas />} />
        <Route path={createPageUrl('Usuarios')} element={<UsuariosAdmin />} />
        <Route path="*" element={<Navigate to={createPageUrl('Dashboard')} replace />} />
      </Route>
    </Routes>
  );
}
