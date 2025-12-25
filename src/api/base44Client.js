const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'documentos';
const SESSION_KEY = 'igreja-conectada.profile.session';
const ADMIN_DEFAULT_PASSWORD = '123456';
const ADMIN_PROFILE = {
  id: 'admin-geral',
  full_name: 'Administrador Geral',
  email: 'admin@igreja.local',
  role: 'admin',
  access_token: 'admin-session',
  expires_in: 60 * 60 * 24 * 30,
};
const JWT_SEGMENTS = 3;

function isValidJwt(token) {
  return typeof token === 'string' && token.split('.').length === JWT_SEGMENTS;
}

function getAuthorizationToken(session) {
  if (session?.role === 'admin' && SUPABASE_SERVICE_ROLE_KEY) {
    return SUPABASE_SERVICE_ROLE_KEY;
  }
  if (session?.access_token && isValidJwt(session.access_token)) {
    return session.access_token;
  }
  return SUPABASE_ANON_KEY;
}

function getApiKey(session) {
  if (session?.role === 'admin' && SUPABASE_SERVICE_ROLE_KEY) {
    return SUPABASE_SERVICE_ROLE_KEY;
  }
  return SUPABASE_ANON_KEY;
}

function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para continuar.'
    );
  }
}

function getStoredSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Erro ao ler a sessão do Supabase', error);
    return null;
  }
}

function storeSession(session) {
  if (typeof window === 'undefined') return;
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  const expiresAt = Date.now() + session.expires_in * 1000;
  const payload = { ...session, expires_at: expiresAt };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  return payload;
}

async function ensureSession() {
  const currentSession = getStoredSession();
  return currentSession;
}

async function authenticatedRequest(path, { method = 'GET', body, headers = {}, query = '' } = {}) {
  assertSupabaseEnv();
  const session = await ensureSession();
  const hasServiceRole = Boolean(SUPABASE_SERVICE_ROLE_KEY);
  if (!session && !hasServiceRole) {
    throw new Error('Usuário não autenticado. Faça login para continuar.');
  }

  const sessionOrAdmin = session || { role: 'admin' };
  const authToken = getAuthorizationToken(sessionOrAdmin);
  const apiKey = getApiKey(sessionOrAdmin);
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

async function fetchProfile(userId) {
  const data = await authenticatedRequest(`/rest/v1/profiles`, {
    query: `?select=*&id=eq.${encodeURIComponent(userId)}`,
  });

  if (Array.isArray(data)) {
    return data[0];
  }

  return data;
}

async function getCurrentUser() {
  return ensureSession();
}

export const base44 = {
  auth: {
    async me() {
      return getCurrentUser();
    },
    async login({ password }) {
      if (password !== ADMIN_DEFAULT_PASSWORD) {
        throw new Error('Senha de administrador inválida.');
      }
      const stored = storeSession(ADMIN_PROFILE);
      if (!stored) {
        throw new Error('Não foi possível iniciar a sessão do administrador.');
      }
      const { access_token, expires_in, expires_at, ...safeProfile } = stored;
      return safeProfile;
    },
    async register({ email, password, full_name, role }) {
      throw new Error('Cadastro de usuários desativado.');
    },
    async logout() {
      storeSession(null);
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
      async UploadFile({ file, bucket = STORAGE_BUCKET }) {
        assertSupabaseEnv();
        if (!file) {
          throw new Error('Nenhum arquivo selecionado');
        }
      const session = await ensureSession();
      const hasServiceRole = Boolean(SUPABASE_SERVICE_ROLE_KEY);
      if (!session && !hasServiceRole) {
        throw new Error('É necessário estar autenticado para enviar arquivos.');
      }
      const sessionOrAdmin = session || { role: 'admin' };
      const authToken = getAuthorizationToken(sessionOrAdmin);
      const apiKey = getApiKey(sessionOrAdmin);
      const extension = file.name?.split('.').pop() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
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
          throw new Error(text || 'Erro ao enviar arquivo');
        }

        const file_url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
        return { file_url, path: fileName };
      },
    },
  },
};

export default base44;
