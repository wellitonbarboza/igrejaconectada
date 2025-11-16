const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'documentos';
const SESSION_KEY = 'igreja-conectada.supabase.session';
const REFRESH_MARGIN = 60 * 1000; // 1 minuto

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

async function refreshSession(session) {
  assertSupabaseEnv();
  if (!session?.refresh_token) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.refresh_token}`,
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }
  );

  if (!response.ok) {
    storeSession(null);
    throw new Error('Não foi possível renovar a sessão. Faça login novamente.');
  }

  const data = await response.json();
  return storeSession(data);
}

async function ensureSession() {
  const currentSession = getStoredSession();
  if (!currentSession) return null;
  if (!currentSession.expires_at || currentSession.expires_at - Date.now() > REFRESH_MARGIN) {
    return currentSession;
  }

  try {
    return await refreshSession(currentSession);
  } catch (error) {
    console.error('Erro ao renovar sessão', error);
    return null;
  }
}

async function authenticatedRequest(path, { method = 'GET', body, headers = {}, query = '' } = {}) {
  assertSupabaseEnv();
  const session = await ensureSession();
  if (!session) {
    throw new Error('Usuário não autenticado. Faça login para continuar.');
  }

  const finalHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
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
  const session = await ensureSession();
  if (!session?.user) return null;
  const profile = await fetchProfile(session.user.id);
  if (!profile) {
    return {
      id: session.user.id,
      email: session.user.email,
      role: 'usuario',
    };
  }
  return {
    ...profile,
    email: profile.email || session.user.email,
  };
}

export const base44 = {
  auth: {
    async me() {
      return getCurrentUser();
    },
    async login({ email, password }) {
      assertSupabaseEnv();
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Não foi possível entrar. Verifique suas credenciais.');
      }

      const data = await response.json();
      storeSession(data);
      return getCurrentUser();
    },
    async register({ email, password, full_name, role }) {
      assertSupabaseEnv();
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, data: { full_name, role } }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Erro ao criar conta');
      }

      const session = await response.json();
      if (!session.user) {
        return null;
      }

      const storedSession = storeSession(session);

      if (storedSession?.access_token) {
        await authenticatedRequest(`/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: session.user.id,
            full_name,
            email,
            role: role || 'usuario',
          }),
          query: '',
        }).catch(() => null);
      }

      return getCurrentUser();
    },
    async logout() {
      assertSupabaseEnv();
      const session = getStoredSession();
      if (session?.access_token) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
        }).catch(() => null);
      }
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
        if (!session) {
          throw new Error('É necessário estar autenticado para enviar arquivos.');
        }
        const extension = file.name?.split('.').pop() || 'bin';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
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
