import React, { useState, useEffect } from 'react';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { compressImage } from '@/utils/imageCompression';
import { resolveMemberPhotoUrl } from '@/utils/resolveMemberPhotoUrl';

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Componente standalone de upload de foto de membro.
 *
 * Usa <label htmlFor> nativo para abrir o file picker — não depende de
 * JavaScript .click(), refs ou document.getElementById.
 */
export default function FotoMembroUpload({ membro, onPhotoReady, uploading = false, error = '' }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [localError, setLocalError] = useState('');

  const existingPhotoUrl = membro ? resolveMemberPhotoUrl(membro) : '';
  const displayUrl = previewUrl || existingPhotoUrl;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      setLocalError('Formato inválido. Envie JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setLocalError('A foto deve ter no máximo 5MB.');
      return;
    }

    setLocalError('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    onPhotoReady(file);
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setLocalError('');
    onPhotoReady(null);
  };

  const displayError = error || localError;

  return (
    <div className="md:col-span-2">
      <span className="text-sm font-medium">Foto do Membro</span>
      <div className="mt-2 flex items-center gap-4">
        {displayUrl ? (
          <div className="relative flex-shrink-0">
            <img
              src={displayUrl}
              alt="Foto"
              className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
              onError={() => {
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl('');
                }
              }}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Camera className="w-8 h-8 text-white" />
          </div>
        )}

        <div className="flex-1">
          {/* File inputs com id único - labels abrem o picker nativamente */}
          <input
            id="membro-foto-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <input
            id="membro-foto-camera"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div className="flex flex-wrap gap-2">
            {uploading ? (
              <span className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </span>
            ) : (
              <>
                <label
                  htmlFor="membro-foto-file"
                  className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Carregar Foto
                </label>
                <label
                  htmlFor="membro-foto-camera"
                  className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Câmera
                </label>
              </>
            )}
          </div>

          <p className="text-sm text-slate-500 mt-2">
            JPG, PNG ou WEBP. Máximo 5MB.
          </p>

          {displayError && (
            <p className="text-sm text-red-600 mt-1 font-medium">{displayError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Faz o upload da foto para o Supabase Storage.
 */
export async function uploadMemberPhoto(file, membroId) {
  if (!file) return null;

  const compressed = await compressImage(file, { maxSize: 800, quality: 0.8 });
  const ext = compressed.name?.split('.').pop() || 'jpg';
  const path = `membros/${membroId}/perfil.${ext}`;

  const { file_url, path: returnedPath } = await base44.integrations.Core.UploadFile({
    file: compressed,
    bucket: STORAGE_BUCKETS.fotosMembros,
    path,
  });

  return { file_url, filePath: returnedPath || path };
}
