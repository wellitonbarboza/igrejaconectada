import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext.jsx';
import { canView, canCreate, canEdit, canDelete, isAdminUser } from '@/utils/accessControl';

/**
 * Hook para verificar as permissões do usuário logado em uma página.
 *
 * Uso:
 *   const { canView, canCreate, canEdit, canDelete, isAdmin } = usePermissions('Membros');
 */
export default function usePermissions(page) {
  const { user } = useAuth();

  return useMemo(() => ({
    canView: canView(user, page),
    canCreate: canCreate(user, page),
    canEdit: canEdit(user, page),
    canDelete: canDelete(user, page),
    isAdmin: isAdminUser(user),
  }), [user, page]);
}
