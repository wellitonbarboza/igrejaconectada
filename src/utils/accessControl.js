export const ROLES = {
  ADMIN: 'admin',
  USUARIO: 'usuario',
};

const DEFAULT_USUARIO_PERMISSIONS = [
  'Dashboard',
  'Membros',
  'ArquivoMorto',
  'DetalhesMembro',
  'Departamentos',
  'DetalhesDepartamento',
  'Relatorios',
  'Cartoes',
  'Cartas',
  'Download',
];

/**
 * Todas as páginas disponíveis para configuração de permissões.
 * label: nome exibido na UI, page: identificador interno da rota.
 */
export const ALL_MANAGEABLE_PAGES = [
  { page: 'Dashboard', label: 'Dashboard' },
  { page: 'Membros', label: 'Membros' },
  { page: 'ArquivoMorto', label: 'Arquivo Morto' },
  { page: 'DetalhesMembro', label: 'Detalhes do Membro' },
  { page: 'Departamentos', label: 'Departamentos' },
  { page: 'DetalhesDepartamento', label: 'Detalhes do Departamento' },
  { page: 'Congregacoes', label: 'Congregações' },
  { page: 'Relatorios', label: 'Relatórios' },
  { page: 'Cartoes', label: 'Cartões' },
  { page: 'Cartas', label: 'Cartas' },
  { page: 'Configuracoes', label: 'Configurações' },
  { page: 'Download', label: 'Download' },
];

export const normalizeRole = (role) => (role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USUARIO);

export const isAdminUser = (user) => normalizeRole(user?.role) === ROLES.ADMIN;

export const canManageUsers = (user) => isAdminUser(user);

export const canUploadMemberPhotos = (user) => isAdminUser(user);

export const hasPageAccess = (user, page) => {
  if (!user || !page) return false;
  const role = normalizeRole(user.role);

  // Admin tem acesso a tudo
  if (role === ROLES.ADMIN) return true;

  // Se o usuário tem permissões personalizadas, usa elas
  const customPermissions = user.permissions;
  if (Array.isArray(customPermissions) && customPermissions.length > 0) {
    return customPermissions.includes(page);
  }

  // Caso contrário, usa as permissões padrão do papel
  return DEFAULT_USUARIO_PERMISSIONS.includes(page);
};

export const getUserPermissions = (user) => {
  if (!user) return [];
  if (isAdminUser(user)) return ALL_MANAGEABLE_PAGES.map((p) => p.page);

  const customPermissions = user.permissions;
  if (Array.isArray(customPermissions) && customPermissions.length > 0) {
    return customPermissions;
  }

  return [...DEFAULT_USUARIO_PERMISSIONS];
};

export const describeRole = (role) => {
  if (normalizeRole(role) === ROLES.ADMIN) return 'Administrador';
  return 'Usuário';
};
