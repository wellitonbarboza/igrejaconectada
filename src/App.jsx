import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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
import { createPageUrl } from '@/utils';

export default function App() {
  return (
    <Layout>
      <Routes>
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
        <Route path="*" element={<Navigate to={createPageUrl('Dashboard')} replace />} />
      </Routes>
    </Layout>
  );
}
