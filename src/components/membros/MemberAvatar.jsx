import React, { useMemo, useState } from 'react';
import { resolveMemberPhotoUrl } from '@/utils/resolveMemberPhotoUrl';

export default function MemberAvatar({ membro, sizeClass = 'w-10 h-10', textClass = 'text-sm', className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = useMemo(() => resolveMemberPhotoUrl(membro), [membro]);
  const initial = (membro?.nome_completo || '?').trim().charAt(0).toUpperCase();

  if (!photoUrl || imageFailed) {
    return (
      <div className={`${sizeClass} bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center ${className}`}>
        <span className={`text-white font-semibold ${textClass}`}>{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={`Foto de ${membro?.nome_completo || 'membro'}`}
      className={`${sizeClass} rounded-full object-cover border border-white shadow-sm ${className}`}
      onError={() => setImageFailed(true)}
      loading="lazy"
    />
  );
}
