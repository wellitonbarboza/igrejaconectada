const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'documentos';
const ADMIN_USER_ID =
  import.meta.env.VITE_SUPABASE_ADMIN_USER_ID || '00000000-0000-0000-0000-000000000001';
export const STORAGE_BUCKETS = {
  documentos: 'documentos',
  avatares: 'avatares',
  fotosMembros: 'fotos-membros',
};

const ADMIN_PROFILE = {
  id: ADMIN_USER_ID,
  full_name: 'Administrador Geral',
  email: 'admin@igreja.local',
  role: 'admin',
};
const AUTH_TOKEN_STORAGE_KEY = 'igrejaconectada.auth.access_token';

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

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object' || payload instanceof FormData) {
    return payload;
  }
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function getPersistedAccessToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function setPersistedAccessToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function getRuntimeAuthToken() {
  return getPersistedAccessToken() || getAdminAuthToken();
}

async function authenticatedRequest(path, { method = 'GET', body, headers = {}, query = '' } = {}) {
  assertSupabaseEnv();
  const authToken = getRuntimeAuthToken();
  const apiKey = getAdminApiKey();
  const contentTypeHeader = Object.keys(headers).find(
    (headerName) => headerName.toLowerCase() === 'content-type'
  );
  const contentType = contentTypeHeader ? headers[contentTypeHeader] : '';
  const shouldStringifyBody =
    body &&
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    contentType.includes('application/json');
  const finalHeaders = {
    apikey: apiKey,
    Authorization: `Bearer ${authToken}`,
    ...headers,
  };

  const response = await fetch(`${SUPABASE_URL}${path}${query}`, {
    method,
    headers: finalHeaders,
    body: shouldStringifyBody ? JSON.stringify(body) : body,
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

  const responseContentType = response.headers.get('Content-Type') || '';
  if (responseContentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}


async function createAuthAdminUser({ email, password, full_name }) {
  assertSupabaseEnv();
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Para criar usuários no painel, configure VITE_SUPABASE_SERVICE_ROLE_KEY.');
  }

  const authToken = getAdminAuthToken();
  const apiKey = getAdminApiKey();
  const fallbackPassword =
    password || `${Math.random().toString(36).slice(2)}A!${Date.now().toString(36)}`;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: fallbackPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new Error(buildUnauthorizedMessage(text));
    }
    throw new Error(text || 'Erro ao criar usuário no auth.users');
  }

  return response.json();
}

async function deleteAuthAdminUser(userId) {
  if (!userId || !SUPABASE_SERVICE_ROLE_KEY) return;

  const authToken = getAdminAuthToken();
  const apiKey = getAdminApiKey();
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${authToken}`,
    },
  });
}

async function fetchCurrentAuthUser() {
  const accessToken = getPersistedAccessToken();
  if (!accessToken) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    setPersistedAccessToken(null);
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Não foi possível validar a sessão atual.');
  }

  return response.json();
}

async function fetchProfileByUserId(userId) {
  const profiles = await authenticatedRequest('/rest/v1/profiles', {
    query: `?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`,
  });
  return Array.isArray(profiles) ? profiles[0] || null : profiles;
}

function mergeAuthAndProfile(authUser, profile) {
  if (!authUser) return null;
  return {
    ...authUser,
    ...profile,
    id: authUser.id,
    email: profile?.email || authUser.email,
    full_name:
      profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
    role: profile?.role || 'usuario',
    cargo: profile?.cargo || '',
  };
}

async function ensureProfileForAuthUser(authUser) {
  if (!authUser?.id) return null;
  const existingProfile = await fetchProfileByUserId(authUser.id);

  if (existingProfile) {
    return existingProfile;
  }

  return upsertProfileById({
    id: authUser.id,
    email: authUser.email || '',
    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
    role: 'usuario',
    cargo: '',
  });
}

async function loginWithPassword({ email, password }) {
  assertSupabaseEnv();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Informe e-mail e senha para continuar.');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: normalizedEmail,
      password: normalizedPassword,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = data?.error_description || data?.msg || data?.error || '';
    if (response.status === 400) {
      throw new Error(
        `Não foi possível autenticar (400). Verifique e-mail/senha e se o usuário possui senha válida no Supabase Auth.${details ? ` Detalhes: ${details}` : ''}`
      );
    }
    throw new Error(details || 'E-mail ou senha inválidos.');
  }

  const accessToken = data?.access_token;
  if (!accessToken || !data?.user?.id) {
    throw new Error('Não foi possível iniciar a sessão do usuário.');
  }

  setPersistedAccessToken(accessToken);
  const profile = await ensureProfileForAuthUser(data.user);
  return mergeAuthAndProfile(data.user, profile);
}

async function upsertProfileById(profilePayload) {
  const data = await authenticatedRequest(`/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: profilePayload,
    query: '?on_conflict=id&select=*',
  });

  return Array.isArray(data) ? data[0] : data;
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
      const sanitizedPayload = sanitizePayload(payload);
      return authenticatedRequest(`/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: sanitizedPayload,
        query: '?select=*',
      });
    },
    async update(id, payload) {
      const { id: _ignoredId, ...payloadWithoutId } = payload || {};
      const sanitizedPayload = sanitizePayload(payloadWithoutId);
      return authenticatedRequest(`/rest/v1/${table}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: sanitizedPayload,
        query: `?id=eq.${encodeURIComponent(id)}`,
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
      const authUser = await fetchCurrentAuthUser();
      if (!authUser) return null;
      const profile = await ensureProfileForAuthUser(authUser);
      return mergeAuthAndProfile(authUser, profile);
    },
    async login(credentials) {
      return loginWithPassword(credentials || {});
    },
    async register() {
      throw new Error('Cadastro de usuários desativado.');
    },
    async createUserWithProfile({ full_name, email, password, role = 'usuario', cargo = '' }) {
      const normalizedEmail = email?.trim().toLowerCase();
      const normalizedPassword = typeof password === 'string' ? password.trim() : '';

      if (!normalizedEmail) {
        throw new Error('E-mail é obrigatório para cadastrar usuário.');
      }
      if (!normalizedPassword || normalizedPassword.length < 8) {
        throw new Error('Defina uma senha provisória com pelo menos 8 caracteres para o novo usuário.');
      }

      const profiles = await authenticatedRequest('/rest/v1/profiles', {
        query: `?select=*&email=eq.${encodeURIComponent(normalizedEmail)}`,
      });
      const existingProfile = Array.isArray(profiles) ? profiles[0] : null;

      if (existingProfile?.id) {
        return upsertProfileById({
          id: existingProfile.id,
          full_name: full_name || existingProfile.full_name || '',
          email: normalizedEmail,
          role,
          cargo,
        });
      }

      const createdAuthUser = await createAuthAdminUser({
        email: normalizedEmail,
        password: normalizedPassword,
        full_name,
      });

      const userId = createdAuthUser?.user?.id || createdAuthUser?.id;
      if (!userId) {
        throw new Error('Não foi possível obter o id do usuário criado no auth.users.');
      }

      try {
        return await upsertProfileById({
          id: userId,
          full_name: full_name || '',
          email: normalizedEmail,
          role,
          cargo,
        });
      } catch (error) {
        await deleteAuthAdminUser(userId);
        throw error;
      }
    },
    async logout() {
      const accessToken = getPersistedAccessToken();
      setPersistedAccessToken(null);

      if (!accessToken) {
        return null;
      }

      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return null;
    },
  },
  entities: {
    Membro: createEntityClient('membros'),
    Congregacao: createEntityClient('congregacoes'),
    Departamento: createEntityClient('departamentos'),
    Config: createEntityClient('configs'),
    Perfil: createEntityClient('profiles'),
    CartaEmitida: createEntityClient('cartas_emitidas'),
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
        const encodedPath = fileName
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/');
        const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodedPath}`, {
          method: 'PUT',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${authToken}`,
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'true',
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

        const file_url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;
        return { file_url, path: fileName };
      },
    },
  },
};

export const buildStoragePublicUrl = (bucket, path) => {
  if (!SUPABASE_URL || !bucket || !path) return '';
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;
};

export default base44;
