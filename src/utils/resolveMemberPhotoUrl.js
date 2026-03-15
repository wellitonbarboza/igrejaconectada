import { STORAGE_BUCKETS, buildStoragePublicUrl } from '@/api/base44Client';

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value) || value?.startsWith('data:');

export const resolveMemberPhotoUrl = (membro) => {
  if (!membro) return '';

  const fotoPath = membro.foto_path || '';
  if (fotoPath) {
    const bucket = membro.foto_bucket || STORAGE_BUCKETS.fotosMembros;
    const baseUrl = buildStoragePublicUrl(bucket, fotoPath);
    const updatedAt = membro.updated_date || membro.updated_at || '';
    return updatedAt ? `${baseUrl}?v=${encodeURIComponent(updatedAt)}` : baseUrl;
  }

  const fotoUrl = membro.foto_url || '';
  if (fotoUrl && isAbsoluteUrl(fotoUrl)) {
    return fotoUrl;
  }

  return '';
};
