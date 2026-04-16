import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Login from '@/pages/Login.jsx';
import Layout from './Layout.jsx';
import Dashboard from '@/pages/Dashboard.jsx';
import Membros from '@/pages/Membros.jsx';
import DetalhesMembro from '@/pages/DetalhesMembro.jsx';
import DetalhesCongregacao from '@/pages/DetalhesCongregacao.jsx';
import DetalhesDepartamento from '@/pages/DetalhesDepartamento.jsx';
import Departamentos from '@/pages/Departamentos.jsx';
import Congregacoes from '@/pages/Congregacoes.jsx';
import Relatorios from '@/pages/Relatorios.jsx';
import Cartoes from '@/pages/Cartoes.jsx';
import Configuracoes from '@/pages/Configuracoes.jsx';
import Cartas from '@/pages/Cartas.jsx';
import UsuariosAdmin from '@/pages/UsuariosAdmin.jsx';
import Download from '@/pages/Download.jsx';
import ArquivoMorto from '@/pages/ArquivoMorto.jsx';
import AdminIgrejas from '@/pages/AdminIgrejas.jsx';
import AdminModulos from '@/pages/AdminModulos.jsx';
import TesourariaLancamentos from '@/pages/TesourariaLancamentos.jsx';
import TesourariaFluxoCaixa from '@/pages/TesourariaFluxoCaixa.jsx';
import TesourariaRelatorios from '@/pages/TesourariaRelatorios.jsx';
import EbdClasses from '@/pages/EbdClasses.jsx';
import EbdAulas from '@/pages/EbdAulas.jsx';
import EbdCaixa from '@/pages/EbdCaixa.jsx';
import EbdRelatorios from '@/pages/EbdRelatorios.jsx';
import PresencaSetores from '@/pages/PresencaSetores.jsx';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/context/AuthContext.jsx';
import { hasPageAccess } from '@/utils/accessControl';

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
    return <Navigate to={createPageUrl('Login')} replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function ProtectedRoute({ page, children }) {
  const { user } = useAuth();

  if (!hasPageAccess(user, page)) {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  return children;
}

function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  return <Login />;
}

export default function App() {
  return (
    <Routes>
      <Route path={createPageUrl('Login')} element={<LoginRoute />} />
      <Route element={<ProtectedShell />}>
        <Route index element={<Navigate to={createPageUrl('Dashboard')} replace />} />
        <Route path={createPageUrl('Dashboard')} element={<Dashboard />} />
        <Route path={createPageUrl('Membros')} element={<ProtectedRoute page="Membros"><Membros /></ProtectedRoute>} />
        <Route path={createPageUrl('DetalhesMembro')} element={<ProtectedRoute page="DetalhesMembro"><DetalhesMembro /></ProtectedRoute>} />
        <Route path={createPageUrl('ArquivoMorto')} element={<ProtectedRoute page="ArquivoMorto"><ArquivoMorto /></ProtectedRoute>} />
        <Route path={createPageUrl('DetalhesCongregacao')} element={<ProtectedRoute page="Congregacoes"><DetalhesCongregacao /></ProtectedRoute>} />
        <Route path={createPageUrl('DetalhesDepartamento')} element={<ProtectedRoute page="DetalhesDepartamento"><DetalhesDepartamento /></ProtectedRoute>} />
        <Route path={createPageUrl('Departamentos')} element={<ProtectedRoute page="Departamentos"><Departamentos /></ProtectedRoute>} />
        <Route path={createPageUrl('Congregacoes')} element={<ProtectedRoute page="Congregacoes"><Congregacoes /></ProtectedRoute>} />
        <Route path={createPageUrl('Relatorios')} element={<ProtectedRoute page="Relatorios"><Relatorios /></ProtectedRoute>} />
        <Route path={createPageUrl('Cartoes')} element={<ProtectedRoute page="Cartoes"><Cartoes /></ProtectedRoute>} />
        <Route path={createPageUrl('Configuracoes')} element={<ProtectedRoute page="Configuracoes"><Configuracoes /></ProtectedRoute>} />
        <Route path={createPageUrl('Cartas')} element={<ProtectedRoute page="Cartas"><Cartas /></ProtectedRoute>} />
        <Route path={createPageUrl('Usuarios')} element={<ProtectedRoute page="Usuarios"><UsuariosAdmin /></ProtectedRoute>} />
        <Route path={createPageUrl('AdminIgrejas')} element={<ProtectedRoute page="AdminIgrejas"><AdminIgrejas /></ProtectedRoute>} />
        <Route path={createPageUrl('AdminModulos')} element={<ProtectedRoute page="AdminModulos"><AdminModulos /></ProtectedRoute>} />
        <Route path={createPageUrl('TesourariaLancamentos')} element={<ProtectedRoute page="TesourariaLancamentos"><TesourariaLancamentos /></ProtectedRoute>} />
        <Route path={createPageUrl('TesourariaFluxoCaixa')} element={<ProtectedRoute page="TesourariaFluxoCaixa"><TesourariaFluxoCaixa /></ProtectedRoute>} />
        <Route path={createPageUrl('TesourariaRelatorios')} element={<ProtectedRoute page="TesourariaRelatorios"><TesourariaRelatorios /></ProtectedRoute>} />
        <Route path={createPageUrl('EbdClasses')} element={<ProtectedRoute page="EbdClasses"><EbdClasses /></ProtectedRoute>} />
        <Route path={createPageUrl('EbdAulas')} element={<ProtectedRoute page="EbdAulas"><EbdAulas /></ProtectedRoute>} />
        <Route path={createPageUrl('EbdCaixa')} element={<ProtectedRoute page="EbdCaixa"><EbdCaixa /></ProtectedRoute>} />
        <Route path={createPageUrl('EbdRelatorios')} element={<ProtectedRoute page="EbdRelatorios"><EbdRelatorios /></ProtectedRoute>} />
        <Route path={createPageUrl('PresencaSetores')} element={<ProtectedRoute page="PresencaSetores"><PresencaSetores /></ProtectedRoute>} />
        <Route path={createPageUrl('Download')} element={<Navigate to={`${createPageUrl('Download')}/mobile`} replace />} />
        <Route path={`${createPageUrl('Download')}/:platform`} element={<ProtectedRoute page="Download"><Download /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={createPageUrl('Dashboard')} replace />} />
      </Route>
    </Routes>
  );
}
