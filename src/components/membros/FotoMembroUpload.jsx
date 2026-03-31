import React, { useState, useEffect, useRef } from 'react';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { compressImage } from '@/utils/imageCompression';
import { resolveMemberPhotoUrl } from '@/utils/resolveMemberPhotoUrl';

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export default function FotoMembroUpload({ membro, onPhotoReady, uploading = false, error = '' }) {
  const [fileName, setFileName] = useState('');
  const [localError, setLocalError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const objectUrlRef = useRef('');

  const existingPhotoUrl = membro ? resolveMemberPhotoUrl(membro) : '';

  // Limpa o object URL ao desmontar para evitar memory leak
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    // Reseta o value do input para permitir re-selecionar o mesmo arquivo
    e.target.value = '';
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

    // Cria preview local imediato
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);

    onPhotoReady(file);
  };

  const handleRemove = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setPreviewUrl('');
    setFileName('');
    setLocalError('');
    onPhotoReady(null);
  };

  const displayError = error || localError;

  // A foto exibida: preview local tem prioridade sobre a foto já salva
  const displayedPhoto = previewUrl || existingPhotoUrl;

  return (
    <div className="md:col-span-2">
      <span className="text-sm font-medium">Foto do Membro</span>
      <div className="mt-2 flex items-start gap-4">
        {/* Preview: foto nova selecionada ou foto existente */}
        {displayedPhoto && (
          <div className="relative flex-shrink-0">
            <img
              src={displayedPhoto}
              alt={previewUrl ? 'Nova foto selecionada' : 'Foto atual'}
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
            />
            {previewUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
                title="Remover foto selecionada"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 space-y-2">
          {/* Botões de upload e câmera */}
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="relative inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 cursor-pointer transition-colors overflow-hidden"
            >
              <Upload className="w-4 h-4 mr-2 pointer-events-none" />
              <span className="pointer-events-none">Carregar Foto</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>

            <label
              className="relative inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 cursor-pointer transition-colors overflow-hidden"
            >
              <Camera className="w-4 h-4 mr-2 pointer-events-none" />
              <span className="pointer-events-none">Câmera</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileSelect}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>

            {uploading && (
              <span className="inline-flex items-center text-sm text-slate-500">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Enviando...
              </span>
            )}
          </div>

          {/* Feedback do arquivo selecionado (quando não há preview) */}
          {fileName && !previewUrl && (
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
