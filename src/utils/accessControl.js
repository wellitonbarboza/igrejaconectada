export const ROLES = {
  ADMIN: 'admin',
  USUARIO: 'usuario',
};

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
};

export const ACTION_LABELS = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
};

/**
 * Páginas configuráveis com as ações CRUD disponíveis em cada uma.
 */
export const ALL_MANAGEABLE_PAGES = [
  { page: 'Dashboard', label: 'Dashboard', actions: ['view'] },
  { page: 'Membros', label: 'Membros', actions: ['view', 'create', 'edit', 'delete'] },
  { page: 'ArquivoMorto', label: 'Arquivo Morto', actions: ['view', 'edit'] },
  { page: 'DetalhesMembro', label: 'Detalhes do Membro', actions: ['view'] },
  { page: 'Departamentos', label: 'Departamentos', actions: ['view', 'create', 'edit', 'delete'] },
  { page: 'DetalhesDepartamento', label: 'Detalhes do Departamento', actions: ['view'] },
  { page: 'Congregacoes', label: 'Congregações', actions: ['view', 'create', 'edit', 'delete'] },
  { page: 'Relatorios', label: 'Relatórios', actions: ['view'] },
  { page: 'Cartoes', label: 'Cartões', actions: ['view'] },
  { page: 'Cartas', label: 'Cartas', actions: ['view', 'create', 'edit', 'delete'] },
  { page: 'Configuracoes', label: 'Configurações', actions: ['view', 'edit'] },
  { page: 'Download', label: 'Download', actions: ['view'] },
];

/**
 * Permissões padrão do papel "usuario" quando não há permissões customizadas.
 * Formato: { pagina: [ações] }
 */
const DEFAULT_USUARIO_PERMISSIONS = {
  Dashboard: ['view'],
  Membros: ['view', 'create', 'edit'],
  ArquivoMorto: ['view'],
  DetalhesMembro: ['view'],
  Departamentos: ['view'],
  DetalhesDepartamento: ['view'],
  Relatorios: ['view'],
  Cartoes: ['view'],
  Cartas: ['view'],
  Download: ['view'],
};

export const normalizeRole = (role) => (role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USUARIO);

export const isAdminUser = (user) => normalizeRole(user?.role) === ROLES.ADMIN;

export const canManageUsers = (user) => isAdminUser(user);

export const canUploadMemberPhotos = (user) => isAdminUser(user);

/**
 * Retorna as permissões resolvidas do usuário como objeto { page: [actions] }.
 */
export const getResolvedPermissions = (user) => {
  if (!user) return {};
  if (isAdminUser(user)) {
    const allPerms = {};
    ALL_MANAGEABLE_PAGES.forEach(({ page, actions }) => {
      allPerms[page] = [...actions];
    });
    return allPerms;
  }

  const custom = user.permissions;
  if (custom && typeof custom === 'object' && !Array.isArray(custom) && Object.keys(custom).length > 0) {
    return { ...ALWAYS_ACCESSIBLE_PAGES, ...custom };
  }

  // Compatibilidade: se permissions é um array antigo de strings, converte
  if (Array.isArray(custom) && custom.length > 0) {
    const converted = {};
    custom.forEach((page) => {
      const pageDef = ALL_MANAGEABLE_PAGES.find((p) => p.page === page);
      converted[page] = pageDef ? [...pageDef.actions] : ['view'];
    });
    return { ...ALWAYS_ACCESSIBLE_PAGES, ...converted };
  }

  return { ...DEFAULT_USUARIO_PERMISSIONS };
};

/**
 * Páginas que devem sempre estar acessíveis (landing page).
 * Dashboard é a rota padrão de redirecionamento após login e para rotas sem acesso.
 */
const ALWAYS_ACCESSIBLE_PAGES = { Dashboard: ['view'] };

/**
 * Verifica se o usuário tem acesso a uma página (qualquer ação, mínimo "view").
 */
export const hasPageAccess = (user, page) => {
  if (!user || !page) return false;
  if (isAdminUser(user)) return true;

  const perms = getResolvedPermissions(user);
  const pagePerms = perms[page];
  return Array.isArray(pagePerms) && pagePerms.length > 0;
};

/**
 * Verifica se o usuário tem uma ação específica em uma página.
 * Ex: hasAction(user, 'Membros', 'create')
 */
export const hasAction = (user, page, action) => {
  if (!user || !page || !action) return false;
  if (isAdminUser(user)) return true;

  const perms = getResolvedPermissions(user);
  const pagePerms = perms[page];
  return Array.isArray(pagePerms) && pagePerms.includes(action);
};

/**
 * Atalhos para verificações comuns.
 */
export const canView = (user, page) => hasAction(user, page, ACTIONS.VIEW);
export const canCreate = (user, page) => hasAction(user, page, ACTIONS.CREATE);
export const canEdit = (user, page) => hasAction(user, page, ACTIONS.EDIT);
export const canDelete = (user, page) => hasAction(user, page, ACTIONS.DELETE);

export const describeRole = (role) => {
  if (normalizeRole(role) === ROLES.ADMIN) return 'Administrador';
  return 'Usuário';
};
