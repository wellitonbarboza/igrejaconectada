import React, { useState } from 'react';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { compressImage } from '@/utils/imageCompression';
import { resolveMemberPhotoUrl } from '@/utils/resolveMemberPhotoUrl';

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export default function FotoMembroUpload({ membro, onPhotoReady, uploading = false, error = '' }) {
  const [fileName, setFileName] = useState('');
  const [localError, setLocalError] = useState('');

  const existingPhotoUrl = membro ? resolveMemberPhotoUrl(membro) : '';

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
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
    setFileName(file.name);
    onPhotoReady(file);
  };

  const handleRemove = () => {
    setFileName('');
    setLocalError('');
    onPhotoReady(null);
  };

  const displayError = error || localError;

  return (
    <div className="md:col-span-2">
      <span className="text-sm font-medium">Foto do Membro</span>
      <div className="mt-2 flex items-start gap-4">
        {/* Foto existente do Supabase */}
        {existingPhotoUrl && !fileName && (
          <img
            src={existingPhotoUrl}
            alt="Foto atual"
            className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
          />
        )}

        <div className="flex-1 space-y-2">
          {/* Botão nativo de upload - sem preview, sem JS click, sem refs */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              Carregar Foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                disabled={uploading}
                style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
              />
            </label>

            <label className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 cursor-pointer transition-colors">
              <Camera className="w-4 h-4 mr-2" />
              Câmera
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileSelect}
                disabled={uploading}
                style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
              />
            </label>

            {uploading && (
              <span className="inline-flex items-center text-sm text-slate-500">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Enviando...
              </span>
            )}
          </div>

          {/* Nome do arquivo selecionado */}
          {fileName && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="truncate">Foto selecionada: {fileName}</span>
              <button type="button" onClick={handleRemove} className="text-red-500 hover:text-red-700 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-xs text-slate-500">JPG, PNG ou WEBP. Máximo 5MB.</p>

          {displayError && (
            <p className="text-sm text-red-600 font-medium">{displayError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

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
