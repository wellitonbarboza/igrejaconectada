export function createPageUrl(pageName) {
  if (!pageName) {
    return '/';
  }

  const normalized = pageName
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .toLowerCase();

  return `/${normalized}`;
}

export function formatError(error) {
  if (!error) return 'Ocorreu um erro inesperado.';
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'Ocorreu um erro inesperado.';
}
