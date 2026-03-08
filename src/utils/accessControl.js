export const ROLES = {
  ADMIN: 'admin',
  USUARIO: 'usuario',
};

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

export const normalizeRole = (role) => (role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USUARIO);

export const isAdminUser = (user) => normalizeRole(user?.role) === ROLES.ADMIN;

export const canManageUsers = (user) => isAdminUser(user);

export const canUploadMemberPhotos = (user) => isAdminUser(user);

export const hasPageAccess = (user, page) => {
  if (!user || !page) return false;
  const role = normalizeRole(user.role);
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(page);
};

export const describeRole = (role) => {
  if (normalizeRole(role) === ROLES.ADMIN) return 'Administrador';
  return 'Usuário';
};
