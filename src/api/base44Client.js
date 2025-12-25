const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'documentos';
export const STORAGE_BUCKETS = {
  documentos: 'documentos',
  avatares: 'avatares',
};

const ADMIN_PROFILE = {
  id: '00000000-0000-0000-0000-000000000001',
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

function getFileExtensionFromType(type) {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg') return 'jpg';
  return 'bin';
}

function stripFileExtension(fileName = '') {
  return fileName.replace(/\.[^/.]+$/, '') || 'arquivo';
}

async function compressImageFile(file) {
  if (!file?.type?.startsWith('image/')) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const maxSize = 1600;
  const scale = Math.min(1, maxSize / bitmap.width, maxSize / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);

  const outputType = file.type === 'image/png' ? 'image/webp' : file.type || 'image/jpeg';
  const quality = 0.8;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
  if (!blob) return file;

  const extension = getFileExtensionFromType(outputType);
  const baseName = stripFileExtension(file.name);
  return new File([blob], `${baseName}.${extension}`, { type: outputType });
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
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new Error(buildUnauthorizedMessage(text));
    }
    throw new Error(text || 'Erro ao buscar usuário');
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
      async UploadFile({ file, bucket = STORAGE_BUCKET }) {
        assertSupabaseEnv();
        if (!file) {
          throw new Error('Nenhum arquivo selecionado');
        }
        const authToken = getAdminAuthToken();
        const apiKey = getAdminApiKey();
        const optimizedFile = await compressImageFile(file);
        const extension = optimizedFile.name?.split('.').pop() || 'bin';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${fileName}`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${authToken}`,
            'Content-Type': optimizedFile.type || 'application/octet-stream',
          },
          body: optimizedFile,
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

export default base44;
