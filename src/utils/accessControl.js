const ROLE_PERMISSIONS = {
  admin: ['*'],
  usuario: [
    'Dashboard',
    'Membros',
    'DetalhesMembro',
    'Departamentos',
    'DetalhesDepartamento',
    'Relatorios',
    'Cartoes',
    'Cartas',
    'Download',
  ],
};

export const hasPageAccess = (user, page) => {
  if (!user || !page) return false;
  const role = user.role || 'usuario';
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(page);
};

export const describeRole = (role) => {
  if (role === 'admin') return 'Administrador';
  return 'Usuário';
};
