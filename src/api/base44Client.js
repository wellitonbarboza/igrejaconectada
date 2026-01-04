const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'documentos';
const ADMIN_USER_ID =
  import.meta.env.VITE_SUPABASE_ADMIN_USER_ID || '00000000-0000-0000-0000-000000000001';
export const STORAGE_BUCKETS = {
  documentos: 'documentos',
  avatares: 'avatares',
};

const ADMIN_PROFILE = {
  id: ADMIN_USER_ID,
  full_name: 'Administrador Geral',
  email: 'admin@igreja.local',
  role: 'admin',
};

function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para continuar.'
    );
  }
}

function getAdminAuthToken() {
  return SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
}

function getAdminApiKey() {
  return SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
}

function isPlaceholderAdminId(id) {
  return id === '00000000-0000-0000-0000-000000000001';
}

async function fetchAuthAdminUser(id) {
  assertSupabaseEnv();
  const authToken = getAdminAuthToken();
  const apiKey = getAdminApiKey();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new Error(buildUnauthorizedMessage(text));
    }
    throw new Error(text || 'Erro ao consultar usuário administrador');
  }

  return response.json();
}

function buildUnauthorizedMessage(details) {
  const suffix = details ? ` Detalhes: ${details}` : '';
  return (
    'Requisição não autorizada (401). Verifique se o token/chave de autenticação está correto, ' +
    'se a sessão expirou ou se o usuário possui permissão para este recurso.' +
    suffix
  );
}

async function authenticatedRequest(path, { method = 'GET', body, headers = {}, query = '' } = {}) {
  assertSupabaseEnv();
  const authToken = getAdminAuthToken();
  const apiKey = getAdminApiKey();
  const finalHeaders = {
    apikey: apiKey,
    Authorization: `Bearer ${authToken}`,
    ...headers,
  };

  const response = await fetch(`${SUPABASE_URL}${path}${query}`, {
    method,
    headers: finalHeaders,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new Error(buildUnauthorizedMessage(text));
    }
    throw new Error(text || 'Erro ao comunicar com o Supabase');
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function buildOrderQuery(ordering) {
  if (!ordering) return '';
  const ascending = !ordering.startsWith('-');
  const column = ordering.replace(/^[-+]/, '');
  return `&order=${encodeURIComponent(`${column}.${ascending ? 'asc' : 'desc'}`)}`;
}

function createEntityClient(table) {
  return {
    async list(ordering) {
      const query = `?select=*${buildOrderQuery(ordering)}`;
      return authenticatedRequest(`/rest/v1/${table}`, { query });
    },
    async retrieve(id) {
      const query = `?select=*&id=eq.${encodeURIComponent(id)}`;
      const data = await authenticatedRequest(`/rest/v1/${table}`, { query });
      return Array.isArray(data) ? data[0] : data;
    },
    async create(payload) {
      return authenticatedRequest(`/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
        query: '?select=*',
      });
    },
    async update(id, payload) {
      return authenticatedRequest(`/rest/v1/${table}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
        query: `?id=eq.${encodeURIComponent(id)}&select=*`,
      });
    },
    async delete(id) {
      return authenticatedRequest(`/rest/v1/${table}`, {
        method: 'DELETE',
        query: `?id=eq.${encodeURIComponent(id)}`,
      });
    },
  };
}

async function ensureAdminProfile() {
  if (!ADMIN_PROFILE?.id) return null;
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { ...ADMIN_PROFILE };
  }
  if (isPlaceholderAdminId(ADMIN_PROFILE.id)) {
    return { ...ADMIN_PROFILE };
  }
  const adminUser = await fetchAuthAdminUser(ADMIN_PROFILE.id);
  if (!adminUser) {
    return { ...ADMIN_PROFILE };
  }
  const payload = {
    id: ADMIN_PROFILE.id,
    full_name: ADMIN_PROFILE.full_name,
    email: ADMIN_PROFILE.email,
    role: ADMIN_PROFILE.role,
  };
  const data = await authenticatedRequest(`/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
    query: '?on_conflict=id&select=*',
  });
  return Array.isArray(data) ? data[0] : data;
}

export const base44 = {
  auth: {
    async me() {
      await ensureAdminProfile();
      return { ...ADMIN_PROFILE };
    },
    async login() {
      await ensureAdminProfile();
      return { ...ADMIN_PROFILE };
    },
    async register() {
      throw new Error('Cadastro de usuários desativado.');
    },
    async logout() {
      return null;
    },
  },
  entities: {
    Membro: createEntityClient('membros'),
    Congregacao: createEntityClient('congregacoes'),
    Departamento: createEntityClient('departamentos'),
    Config: createEntityClient('configs'),
    Perfil: createEntityClient('profiles'),
  },
  integrations: {
    Core: {
      async UploadFile({ file, bucket = STORAGE_BUCKET, path }) {
        assertSupabaseEnv();
        if (!file) {
          throw new Error('Nenhum arquivo selecionado');
        }
        const authToken = getAdminAuthToken();
        const apiKey = getAdminApiKey();
        const extension = file.name?.split('.').pop() || 'bin';
        const fileName =
          path ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${authToken}`,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!response.ok) {
          const text = await response.text();
          if (response.status === 401) {
            throw new Error(buildUnauthorizedMessage(text));
          }
          throw new Error(text || 'Erro ao enviar arquivo');
        }

        const file_url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
        return { file_url, path: fileName };
      },
    },
  },
};

export const buildStoragePublicUrl = (bucket, path) => {
  if (!SUPABASE_URL || !bucket || !path) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

export default base44;
