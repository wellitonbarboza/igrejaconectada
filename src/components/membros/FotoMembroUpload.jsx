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
  const onPhotoReadyRef = useRef(onPhotoReady);
  const existingPhotoUrl = membro ? resolveMemberPhotoUrl(membro) : '';

  // mantém callback atualizada sem recriar inputs
  useEffect(() => { onPhotoReadyRef.current = onPhotoReady; }, [onPhotoReady]);

  const setPreviewFromFile = (file) => {
    setFileName(file.name);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
  };

  // Refs para os inputs reais (criados via DOM, não JSX)
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Cria os inputs UMA VEZ via DOM e anexa ao body. Persiste entre re-renders
  // porque não fazem parte do React tree. Resolve o bug em que React desmontava
  // o input entre o click do user e o evento change do file picker.
  useEffect(() => {
    const handleFileSelect = (e) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // permite re-selecionar mesmo arquivo
      if (!file) {
        console.log('[FotoMembro] sem arquivo (cancelou)');
        return;
      }
      console.log('[FotoMembro] arquivo selecionado:', file.name, file.type, file.size);
      const isImage = (file.type && file.type.startsWith('image/'))
        || VALID_TYPES.includes(file.type)
        || /\.(heic|heif|jpe?g|png|webp|avif|gif)$/i.test(file.name);
      if (!isImage) {
        setLocalError(`Formato não suportado: ${file.type || file.name}`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setLocalError(`Foto muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máx 10MB.`);
        return;
      }
      setLocalError('');
      setPreviewFromFile(file);
      console.log('[FotoMembro] onPhotoReady chamado');
      onPhotoReadyRef.current?.(file);
    };

    const make = (capture = false) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*,.heic,.heif';
      if (capture) inp.setAttribute('capture', 'environment');
      inp.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0.001';
      inp.addEventListener('change', handleFileSelect);
      document.body.appendChild(inp);
      return inp;
    };

    fileInputRef.current = make(false);
    cameraInputRef.current = make(true);

    return () => {
      fileInputRef.current?.removeEventListener('change', handleFileSelect);
      cameraInputRef.current?.removeEventListener('change', handleFileSelect);
      fileInputRef.current?.remove();
      cameraInputRef.current?.remove();
    };
  }, []);

  // disable durante upload
  useEffect(() => {
    if (fileInputRef.current) fileInputRef.current.disabled = uploading;
    if (cameraInputRef.current) cameraInputRef.current.disabled = uploading;
  }, [uploading]);

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

  const triggerUpload = (which) => {
    const ref = which === 'camera' ? cameraInputRef : fileInputRef;
    ref.current?.click();
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
              onClick={() => triggerUpload('file')}
              disabled={uploading}
              className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Carregar Foto
            </button>
            <button
              type="button"
              onClick={() => triggerUpload('camera')}
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
