import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/context/AuthContext.jsx';

const SUPER_ADMIN_EMAIL = 'welliton.tec@hotmail.com';
const STORAGE_KEY = 'igrejaconectada.church.selected';

export const MODULOS = [
  { key: 'secretaria', label: 'Secretaria' },
  { key: 'tesouraria', label: 'Tesouraria' },
  { key: 'ebd', label: 'EBD' },
  { key: 'setores', label: 'Presença de Setores' },
];

const ChurchContext = createContext({
  igrejas: [],
  igrejaAtiva: null,
  modulosAtivos: [],
  isSuperAdmin: false,
  loading: true,
  setIgrejaAtivaId: () => {},
  refresh: async () => {},
});

function isSuper(user) {
  if (!user) return false;
  if (user.is_super_admin) return true;
  return (user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function ChurchProvider({ children }) {
  const { user } = useAuth();
  const [igrejas, setIgrejas] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [igrejaAtivaId, setIgrejaAtivaIdState] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_KEY) || null;
  });

  const superAdmin = isSuper(user);

  const setIgrejaAtivaId = (id) => {
    setIgrejaAtivaIdState(id);
    if (typeof window !== 'undefined') {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const refresh = async () => {
    if (!user) {
      setIgrejas([]);
      setModulos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [listaIgrejas, listaModulos] = await Promise.all([
        base44.entities.Igreja.list('nome').catch(() => []),
        base44.entities.IgrejaModulo.list().catch(() => []),
      ]);
      setIgrejas(Array.isArray(listaIgrejas) ? listaIgrejas : []);
      setModulos(Array.isArray(listaModulos) ? listaModulos : []);
    } catch (error) {
      console.warn('Falha ao carregar igrejas/módulos', error);
      setIgrejas([]);
      setModulos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Determinar igreja ativa: super admin usa a escolhida; demais usam a do profile
  const igrejaAtiva = useMemo(() => {
    if (!igrejas.length) return null;
    if (superAdmin && igrejaAtivaId) {
      return igrejas.find((i) => i.id === igrejaAtivaId) || igrejas[0];
    }
    if (user?.igreja_id) {
      return igrejas.find((i) => i.id === user.igreja_id) || igrejas[0];
    }
    return igrejas[0];
  }, [igrejas, igrejaAtivaId, superAdmin, user?.igreja_id]);

  const modulosAtivos = useMemo(() => {
    if (!igrejaAtiva) return [];
    // Super admin vê todos os módulos independente da ativação
    if (superAdmin) return MODULOS.map((m) => m.key);
    return modulos
      .filter((m) => m.igreja_id === igrejaAtiva.id && m.ativo)
      .map((m) => m.modulo);
  }, [modulos, igrejaAtiva, superAdmin]);

  const value = useMemo(
    () => ({
      igrejas,
      igrejaAtiva,
      modulosAtivos,
      isSuperAdmin: superAdmin,
      loading,
      setIgrejaAtivaId,
      refresh,
    }),
    [igrejas, igrejaAtiva, modulosAtivos, superAdmin, loading]
  );

  return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>;
}

export function useChurch() {
  return useContext(ChurchContext);
}

export function isModuloAtivo(modulosAtivos, modulo) {
  return Array.isArray(modulosAtivos) && modulosAtivos.includes(modulo);
}
