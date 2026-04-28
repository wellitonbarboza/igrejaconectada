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

// Module-level: sobrevive a re-mounts do componente que possam acontecer
// durante o ciclo do upload. Funciona como "store global" simples para
// guardar o File entre o momento da seleção e o momento do Salvar.
const photoStore = {
  file: null,
  set(f) { this.file = f; if (typeof window !== 'undefined') window.__photoStoreFile = f; },
  get() { return this.file || (typeof window !== 'undefined' ? window.__photoStoreFile : null); },
  clear() { this.file = null; if (typeof window !== 'undefined') window.__photoStoreFile = null; },
};
export const getPendingPhotoFile = () => photoStore.get();
export const clearPendingPhotoFile = () => photoStore.clear();

export default function FotoMembroUpload({ membro, onPhotoReady, uploading = false, error = '' }) {
  const [fileName, setFileName] = useState('');
  const [localError, setLocalError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const objectUrlRef = useRef('');
  const onPhotoReadyRef = useRef(onPhotoReady);

  useEffect(() => { onPhotoReadyRef.current = onPhotoReady; }, [onPhotoReady]);

  const existingPhotoUrl = membro ? resolveMemberPhotoUrl(membro) : '';

  // Recupera estado do photoStore se houver (caso componente foi remontado
  // depois de selecionar uma foto)
  useEffect(() => {
    const stored = photoStore.get();
    if (stored && !previewUrl) {
      setFileName(stored.name);
      const url = URL.createObjectURL(stored);
      objectUrlRef.current = url;
      setPreviewUrl(url);
    }
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleRemove = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    photoStore.clear();
    setPreviewUrl('');
    setFileName('');
    setLocalError('');
    onPhotoReadyRef.current?.(null);
  };

  const openPicker = (capture) => {
    if (uploading) return;
    console.log('[FotoMembro] criando input dinâmico, capture=', capture);
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*,.heic,.heif';
    if (capture) inp.setAttribute('capture', 'environment');
    inp.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0.001';

    let consumed = false;
    inp.addEventListener('change', (e) => {
      consumed = true;
      const file = e.target.files?.[0];
      console.log('[FotoMembro] change disparou, file=', file?.name);
      try { inp.remove(); } catch {}
      if (!file) return;

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
      setFileName(file.name);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPreviewUrl(url);
      // Guarda no store global (sobrevive a re-mounts do componente)
      photoStore.set(file);
      console.log('[FotoMembro] foto guardada no store, aguardando Salvar');
      onPhotoReadyRef.current?.(file);
    });

    setTimeout(() => { if (!consumed) try { inp.remove(); } catch {} }, 60000);

    document.body.appendChild(inp);
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
            {previewUrl && !uploading && (
              <button type="button" onClick={handleRemove}
                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
                title="Remover">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => openPicker(false)} disabled={uploading}
              className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <Upload className="w-4 h-4 mr-2" />
              Carregar Foto
            </button>
            <button type="button" onClick={() => openPicker(true)} disabled={uploading}
              className="inline-flex items-center h-10 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <Camera className="w-4 h-4 mr-2" />
              Câmera
            </button>
            {uploading && (
              <span className="inline-flex items-center text-sm text-blue-600">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enviando...
              </span>
            )}
          </div>
          {previewUrl && (
            <p className="text-xs text-blue-600 font-medium">📸 Foto pronta — clique em Salvar</p>
          )}
          <p className="text-xs text-slate-500">JPG, PNG, WEBP, HEIC, AVIF, GIF. Máximo 10MB.</p>
          {displayError && <p className="text-sm text-red-600 font-medium">{displayError}</p>}
        </div>
      </div>
    </div>
  );
}

// Upload final (chamado pelo handleSubmit do ModalMembro)
export async function uploadMemberPhoto(file, membroId) {
  if (!file) return null;
  console.log('[uploadMemberPhoto] iniciando, file=', file.name, 'membroId=', membroId, 'size=', file.size);

  let toUpload = file;
  // Compressão só pra arquivos maiores que 1MB; pra pequenos o ganho não compensa o tempo
  if (file.size > 1024 * 1024) {
    try {
      const t0 = performance.now();
      toUpload = await compressImage(file, { maxSize: 1024, quality: 0.85 });
      console.log('[uploadMemberPhoto] comprimida em', Math.round(performance.now() - t0), 'ms, size=', toUpload.size);
    } catch (err) {
      console.warn('[uploadMemberPhoto] compressão falhou, sobe original:', err);
      toUpload = file;
    }
  } else {
    console.log('[uploadMemberPhoto] arquivo pequeno, sem compressão');
  }

  const ext = (toUpload.name || file.name)?.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `membros/${membroId}/perfil.${ext}`;
  console.log('[uploadMemberPhoto] enviando p/ bucket=fotos-membros path=', path);
  const t1 = performance.now();
  const { file_url, path: returnedPath } = await base44.integrations.Core.UploadFile({
    file: toUpload,
    bucket: STORAGE_BUCKETS.fotosMembros,
    path,
  });
  console.log('[uploadMemberPhoto] upload em', Math.round(performance.now() - t1), 'ms — sucesso file_url=', file_url);
  return { file_url, filePath: returnedPath || path };
}
