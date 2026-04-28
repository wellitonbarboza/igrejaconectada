import React, { useState, useEffect, useRef } from 'react';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { compressImage } from '@/utils/imageCompression';
import { resolveMemberPhotoUrl } from '@/utils/resolveMemberPhotoUrl';

const VALID_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/heic', 'image/heif', 'image/avif', 'image/gif',
];
const MAX_SIZE = 10 * 1024 * 1024;

export default function FotoMembroUpload({ membro, onPhotoReady, uploading = false, error = '' }) {
  const [fileName, setFileName] = useState('');
  const [localError, setLocalError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const objectUrlRef = useRef('');
  // Refs estáveis para handlers (evita closure stale entre renders)
  const onPhotoReadyRef = useRef(onPhotoReady);
  const setFileNameRef = useRef(setFileName);
  const setLocalErrorRef = useRef(setLocalError);
  const setPreviewUrlRef = useRef(setPreviewUrl);
  const objectUrlRefRef = useRef(objectUrlRef);

  useEffect(() => { onPhotoReadyRef.current = onPhotoReady; }, [onPhotoReady]);

  const existingPhotoUrl = membro ? resolveMemberPhotoUrl(membro) : '';

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const handleRemove = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setPreviewUrl('');
    setFileName('');
    setLocalError('');
    onPhotoReadyRef.current?.(null);
  };

  // Cria input DINAMICAMENTE no momento do click. Vive só durante o ciclo
  // (até change ou cancel). Imune a re-renders do componente porque está
  // fora do React tree e tem ciclo curto.
  const openPicker = (capture) => {
    if (uploading) return;
    console.log('[FotoMembro] criando input dinâmico, capture=', capture);
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*,.heic,.heif';
    if (capture) inp.setAttribute('capture', 'environment');
    inp.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0.001';

    let consumed = false;
    const cleanup = () => {
      try { inp.remove(); } catch {}
    };

    inp.addEventListener('change', (e) => {
      consumed = true;
      const file = e.target.files?.[0];
      console.log('[FotoMembro] change disparou, file=', file?.name);
      cleanup();
      if (!file) return;

      const isImage = (file.type && file.type.startsWith('image/'))
        || VALID_TYPES.includes(file.type)
        || /\.(heic|heif|jpe?g|png|webp|avif|gif)$/i.test(file.name);
      if (!isImage) {
        setLocalErrorRef.current(`Formato não suportado: ${file.type || file.name}`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setLocalErrorRef.current(`Foto muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máx 10MB.`);
        return;
      }
      setLocalErrorRef.current('');
      setFileNameRef.current(file.name);
      if (objectUrlRefRef.current.current) URL.revokeObjectURL(objectUrlRefRef.current.current);
      const url = URL.createObjectURL(file);
      objectUrlRefRef.current.current = url;
      setPreviewUrlRef.current(url);
      console.log('[FotoMembro] onPhotoReady chamado');
      onPhotoReadyRef.current?.(file);
    });

    // se user cancelar (cancel event ou focus volta sem change), limpa em 60s
    setTimeout(() => { if (!consumed) cleanup(); }, 60000);

    document.body.appendChild(inp);
    // Click programático IMEDIATAMENTE no mesmo tick do user click
    // → preserva trusted user gesture
    inp.click();
  };

  const displayError = error || localError;
  const displayedPhoto = previewUrl || existingPhotoUrl;

  return (
    <div className="md:col-span-2">
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
            <button
              type="button"
              onClick={() => openPicker(false)}
              disabled={uploading}
              className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Carregar Foto
            </button>
            <button
              type="button"
              onClick={() => openPicker(true)}
              disabled={uploading}
              className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4 mr-2" />
              Câmera
            </button>
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
