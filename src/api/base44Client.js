const API_BASE_URL = import.meta.env.VITE_BASE44_API_URL || '/api';

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = options.headers ? { ...options.headers } : {};

  if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Erro ao comunicar com o servidor Base44');
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

function createEntityClient(resource) {
  return {
    async list(ordering) {
      const query = ordering ? `?ordering=${encodeURIComponent(ordering)}` : '';
      return request(`/entities/${resource}${query}`);
    },
    async retrieve(id) {
      return request(`/entities/${resource}/${id}`);
    },
    async create(data) {
      return request(`/entities/${resource}`, {
        method: 'POST',
        body: data,
      });
    },
    async update(id, data) {
      return request(`/entities/${resource}/${id}`,
        {
          method: 'PUT',
          body: data,
        }
      );
    },
    async delete(id) {
      return request(`/entities/${resource}/${id}`, {
        method: 'DELETE',
      });
    },
  };
}

export const base44 = {
  auth: {
    async me() {
      return request('/auth/me');
    },
    async login(credentials) {
      return request('/auth/login', {
        method: 'POST',
        body: credentials,
      });
    },
    async logout() {
      return request('/auth/logout', {
        method: 'POST',
      });
    },
  },
  entities: {
    Membro: createEntityClient('membros'),
    Congregacao: createEntityClient('congregacoes'),
    Departamento: createEntityClient('departamentos'),
    Config: createEntityClient('configs'),
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const formData = new FormData();
        formData.append('file', file);
        return request('/integrations/upload', {
          method: 'POST',
          body: formData,
        });
      },
    },
  },
};

export default base44;
