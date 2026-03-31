import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { compressImage } from '@/utils/imageCompression';
import { resolveMemberPhotoUrl } from '@/utils/resolveMemberPhotoUrl';

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Componente standalone de upload de foto de membro.
 *
 * Props:
 *   membro          – objeto do membro (null se criando)
 *   onPhotoReady    – callback(file | null)  chamado sempre que a foto selecionada muda
 *   uploading       – boolean vindo do form pai (para desabilitar durante save)
 *   error           – string de erro vindo do form pai
 */
export default function FotoMembroUpload({ membro, onPhotoReady, uploading = false, error = '' }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [localError, setLocalError] = useState('');

  // Resolve a foto existente do membro (do Supabase)
  const existingPhotoUrl = membro ? resolveMemberPhotoUrl(membro) : '';

  // A imagem exibida: preview local tem prioridade, depois a foto existente
  const displayUrl = previewUrl || existingPhotoUrl;

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    // Sempre limpa o input para permitir re-selecionar o mesmo arquivo
    if (e.target) e.target.value = '';
    if (!file) return;

    // Validação
    if (!VALID_TYPES.includes(file.type)) {
      setLocalError('Formato inválido. Envie JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setLocalError('A foto deve ter no máximo 5MB.');
      return;
    }

    setLocalError('');

    // Preview local instantâneo
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Notifica o pai que há uma foto pronta
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
      <Label>Foto do Membro</Label>
      <div className="mt-2 flex items-center gap-4">
        {/* Preview / placeholder */}
        {displayUrl ? (
          <div className="relative flex-shrink-0">
            <img
              src={displayUrl}
              alt="Foto"
              className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
              onError={() => {
                // Se a imagem falhar (URL inválida), limpa
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
          {/* Inputs de arquivo - FORA de qualquer fieldset/form */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Enviando...' : 'Carregar Foto'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="w-4 h-4 mr-2" />
              Câmera
            </Button>
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
 * Retorna { file_url, filePath } ou lança erro.
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
