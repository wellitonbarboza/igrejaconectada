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

export default function FotoMembroUpload({ membro, onPhotoReady, uploading: externalUploading = false, error = '' }) {
  const [fileName, setFileName] = useState('');
  const [localError, setLocalError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [internalUploading, setInternalUploading] = useState(false);
  const objectUrlRef = useRef('');
  const onPhotoReadyRef = useRef(onPhotoReady);
  const membroRef = useRef(membro);

  useEffect(() => { onPhotoReadyRef.current = onPhotoReady; }, [onPhotoReady]);
  useEffect(() => { membroRef.current = membro; }, [membro]);

  const existingPhotoUrl = membro ? resolveMemberPhotoUrl(membro) : '';
  const uploading = externalUploading || internalUploading;

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

  // Sobe a foto direto ao Storage e devolve {file_url, filePath} para o pai.
  // Se o membro já existe, ATUALIZA o registro imediatamente. Assim o save
  // do form não precisa segurar pendingFile (que se perdia em remounts).
  const doUploadAndPersist = async (file) => {
    setInternalUploading(true);
    try {
      console.log('[uploadMemberPhoto] iniciando, file=', file.name);
      let toUpload = file;
      try {
        toUpload = await compressImage(file, { maxSize: 800, quality: 0.8 });
        console.log('[uploadMemberPhoto] comprimida, tamanho=', toUpload.size);
      } catch (err) {
        console.warn('[uploadMemberPhoto] compressão falhou, sobe original:', err);
        toUpload = file;
      }
      const ext = (toUpload.name || file.name)?.split('.').pop()?.toLowerCase() || 'jpg';
      const m = membroRef.current;
      const tmpId = m?.id || `tmp-${Date.now()}`;
      const path = `membros/${tmpId}/perfil.${ext}`;
      console.log('[uploadMemberPhoto] enviando p/ bucket=fotos-membros path=', path);
      const { file_url, path: returnedPath } = await base44.integrations.Core.UploadFile({
        file: toUpload,
        bucket: STORAGE_BUCKETS.fotosMembros,
        path,
      });
      console.log('[uploadMemberPhoto] sucesso file_url=', file_url);

      // Se editando, atualiza membro IMEDIATAMENTE (não depende do Salvar)
      if (m?.id) {
        console.log('[uploadMemberPhoto] atualizando membro', m.id, 'com foto_url');
        await base44.entities.Membro.update(m.id, {
          foto_url: file_url,
          foto_path: returnedPath || path,
          foto_bucket: STORAGE_BUCKETS.fotosMembros,
        });
        console.log('[uploadMemberPhoto] membro atualizado!');
      }

      // Notifica pai (para casos de criação ou tracking)
      onPhotoReadyRef.current?.(file, { file_url, filePath: returnedPath || path });
    } catch (err) {
      console.error('[uploadMemberPhoto] ERRO:', err);
      setLocalError('Falha ao enviar foto: ' + (err?.message || 'tente novamente'));
      handleRemove();
    } finally {
      setInternalUploading(false);
    }
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
    inp.addEventListener('change', async (e) => {
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

      // Upload IMEDIATO — não espera Salvar
      await doUploadAndPersist(file);
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
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enviando foto...
              </span>
            )}
          </div>
          {fileName && !previewUrl && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="truncate">Foto: {fileName}</span>
            </div>
          )}
          {previewUrl && !uploading && (
            <p className="text-xs text-green-600 font-medium">✓ Foto salva</p>
          )}
          <p className="text-xs text-slate-500">JPG, PNG, WEBP, HEIC, AVIF, GIF. Máximo 10MB.</p>
          {displayError && <p className="text-sm text-red-600 font-medium">{displayError}</p>}
        </div>
      </div>
    </div>
  );
}

// Mantém export para compat — agora upload acontece dentro do componente.
export async function uploadMemberPhoto(file, membroId) {
  if (!file) return null;
  console.log('[uploadMemberPhoto-legacy] iniciando, file=', file.name, 'membroId=', membroId);
  let toUpload = file;
  try {
    toUpload = await compressImage(file, { maxSize: 800, quality: 0.8 });
  } catch (err) {
    toUpload = file;
  }
  const ext = (toUpload.name || file.name)?.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `membros/${membroId}/perfil.${ext}`;
  const { file_url, path: returnedPath } = await base44.integrations.Core.UploadFile({
    file: toUpload,
    bucket: STORAGE_BUCKETS.fotosMembros,
    path,
  });
  return { file_url, filePath: returnedPath || path };
}
