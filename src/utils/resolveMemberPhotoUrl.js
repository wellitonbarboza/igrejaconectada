import { STORAGE_BUCKETS, buildStoragePublicUrl } from '@/api/base44Client';

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value) || value?.startsWith('data:');

export const resolveMemberPhotoUrl = (membro) => {
  if (!membro) return '';
  const fotoUrl = membro.foto_url || '';
  if (fotoUrl && isAbsoluteUrl(fotoUrl)) {
    return fotoUrl;
  }

  const fotoPath = membro.foto_path || fotoUrl;
  if (!fotoPath) return '';

  return buildStoragePublicUrl(
    membro.foto_bucket || STORAGE_BUCKETS.fotosMembros,
    fotoPath
  );
};
