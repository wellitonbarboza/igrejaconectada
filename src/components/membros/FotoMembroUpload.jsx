import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { compressImage } from '@/utils/imageCompression';
import { resolveMemberPhotoUrl } from '@/utils/resolveMemberPhotoUrl';

const VALID_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/heic', 'image/heif', 'image/avif', 'image/gif',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function FotoMembroUpload({ membro, onPhotoReady, uploading = false, error = '' }) {
  const [fileName, setFileName] = useState('');
  const [localError, setLocalError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const objectUrlRef = useRef('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  // IDs únicos para evitar colisão se múltiplos componentes renderizarem.
  const idSuffix = useRef(Math.random().toString(36).slice(2, 9)).current;
  const fileInputId = `foto-membro-file-${idSuffix}`;
  const cameraInputId = `foto-membro-camera-${idSuffix}`;
  const existingPhotoUrl = membro ? resolveMemberPhotoUrl(membro) : '';

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  // FIX React18 + Portal: listeners React (onChange) nao captam eventos
  // em inputs renderizados via createPortal para document.body, porque
  // React 18 anexa delegacao de eventos no root container (#root) e nao
  // no document. Por isso usamos addEventListener vanilla via ref.
  useEffect(() => {
    const file = fileInputRef.current;
    const cam = cameraInputRef.current;
    if (!file && !cam) return;
    file?.addEventListener('change', handleFileSelect);
    cam?.addEventListener('change', handleFileSelect);
    return () => {
      file?.removeEventListener('change', handleFileSelect);
      cam?.removeEventListener('change', handleFileSelect);
    };
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      console.log('[FotoMembro] sem arquivo selecionado (cancelou)');
      return;
    }
    console.log('[FotoMembro] arquivo selecionado:', file.name, file.type, file.size);
    const isImage =
      (file.type && file.type.startsWith('image/')) ||
      VALID_TYPES.includes(file.type) ||
      /\.(heic|heif|jpe?g|png|webp|avif|gif)$/i.test(file.name);
    if (!isImage) {
      setLocalError(`Formato não suportado: ${file.type || file.name}`);
      console.warn('[FotoMembro] formato rejeitado:', file.type, file.name);
      return;
    }
    if (file.size > MAX_SIZE) {
      setLocalError(`Foto muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máx 10MB.`);
      return;
    }
    setLocalError('');
    setFileName(file.name);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    console.log('[FotoMembro] onPhotoReady chamado com file');
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
  const displayedPhoto = previewUrl || existingPhotoUrl;

  // Inputs renderizados via portal em document.body (FORA do Dialog).
  const portalInputs = typeof document !== 'undefined' ? createPortal(
    <>
      <input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept="image/*,.heic,.heif"
        disabled={uploading}
        style={{ position: 'fixed', bottom: 0, left: 0, width: 1, height: 1, opacity: 0.001 }}
      />
      <input
        ref={cameraInputRef}
        id={cameraInputId}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        disabled={uploading}
        style={{ position: 'fixed', bottom: 0, left: 0, width: 1, height: 1, opacity: 0.001 }}
      />
    </>,
    document.body
  ) : null;

  return (
    <div className="md:col-span-2">
      {portalInputs}
      <span className="text-sm font-medium">Foto do Membro</span>
      <div className="mt-2 flex items-start gap-4">
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
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={fileInputId}
              className={`inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Carregar Foto
            </label>
            <label
              htmlFor={cameraInputId}
              className={`inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Camera className="w-4 h-4 mr-2" />
              Câmera
            </label>
            {uploading && (
              <span className="inline-flex items-center text-sm text-slate-500">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enviando...
              </span>
            )}
          </div>
          {fileName && !previewUrl && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="truncate">Foto selecionada: {fileName}</span>
              <button type="button" onClick={handleRemove} className="text-red-500 hover:text-red-700 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">JPG, PNG, WEBP, HEIC, AVIF, GIF. Máximo 10MB.</p>
          {displayError && <p className="text-sm text-red-600 font-medium">{displayError}</p>}
        </div>
      </div>
    </div>
  );
}

export async function uploadMemberPhoto(file, membroId) {
  if (!file) return null;
  console.log('[uploadMemberPhoto] iniciando, file=', file.name, 'membroId=', membroId);
  let toUpload = file;
  try {
    toUpload = await compressImage(file, { maxSize: 800, quality: 0.8 });
    console.log('[uploadMemberPhoto] comprimida, tamanho=', toUpload.size);
  } catch (err) {
    console.warn('[uploadMemberPhoto] compressão falhou, subindo original:', err);
    toUpload = file;
  }
  const ext = (toUpload.name || file.name)?.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `membros/${membroId}/perfil.${ext}`;
  console.log('[uploadMemberPhoto] enviando p/ bucket=fotos-membros path=', path);
  const { file_url, path: returnedPath } = await base44.integrations.Core.UploadFile({
    file: toUpload,
    bucket: STORAGE_BUCKETS.fotosMembros,
    path,
  });
  console.log('[uploadMemberPhoto] sucesso file_url=', file_url);
  return { file_url, filePath: returnedPath || path };
}
