import React, { useEffect, useRef, useState } from 'react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { compressImage } from '@/utils/imageCompression';
import { resolveMemberPhotoUrl } from '@/utils/resolveMemberPhotoUrl';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Upload, Camera, Mic, MicOff, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ModalMembro({
  membro,
  onClose,
  congregacoes,
  userCongregacaoId,
  isAdmin,
}) {
  const DRAFT_KEY = 'draft_membro';
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const [pendingFotoFile, setPendingFotoFile] = useState(null);
  const [pendingFotoPreview, setPendingFotoPreview] = useState('');
  const [rawFotoFile, setRawFotoFile] = useState(null);
  const [rawFotoPreview, setRawFotoPreview] = useState('');
  const [fotoEditorOpen, setFotoEditorOpen] = useState(false);
  const [fotoEditorZoom, setFotoEditorZoom] = useState(1);
  const [recordingField, setRecordingField] = useState(null);
  const [cepStatus, setCepStatus] = useState({ loading: false, error: '' });
  const recognitionRef = useRef(null);
  const didPrefillRef = useRef(false);
  const uploadSessionIdRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const normalizeOrigem = (origemValue) => {
    if (origemValue === 'transferencia') return 'transferencia_recebe';
    return origemValue;
  };
  const defaultFormData = {
    nome_completo: '',
    tipo: 'congregado',
    origem: 'novo',
    status: 'ativo',
    congregacao_id: isAdmin ? '' : userCongregacaoId,
    data_nascimento: '',
    sexo: '',
    estado_civil: '',
    nome_conjuge: '',
    conjuge_tipo: '',
    conjuge_outros: '',
    telefone: '',
    email: '',
    cpf: '',
    rg: '',
    escolaridade: '',
    profissao: '',
    nacionalidade: '',
    nacionalidade_outros: '',
    naturalidade: '',
    pai: '',
    mae: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    religiao_origem: '',
    data_conversao: '',
    data_batismo: '',
    local_batismo: '',
    batismo_espirito_santo: false,
    data_batismo_espirito_santo: '',
    obreiro: false,
    cargo_obreiro: '',
    data_obreiro: '',
    departamento_id: null,
    departamentos_ids: [],
    foto_url: '',
    foto_path: '',
    foto_bucket: STORAGE_BUCKETS.fotosMembros,
    observacoes: '',
    bairro: '',
    cidade_origem: '',
    cidade_destino: '',
    ativo: true,
  };
  const [formData, setFormData] = useState(() => {
    if (!membro) return defaultFormData;
    const departamentosIdsFromMembro = Array.isArray(membro.departamentos_ids) ? membro.departamentos_ids : [];
    const fallbackDepartamentoId = membro.departamento_id ? [membro.departamento_id] : [];
    return {
      ...defaultFormData,
      ...membro,
      departamentos_ids: Array.from(new Set([...departamentosIdsFromMembro, ...fallbackDepartamentoId])),
      origem: normalizeOrigem(membro.origem || defaultFormData.origem),
      status: membro.status || defaultFormData.status,
    };
  });
  const updateFormData = (updater) => {
    setFormData((prev) => {
      const nextValue = typeof updater === 'function' ? updater(prev) : updater;
      return nextValue ?? prev;
    });
  };

  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => base44.entities.Departamento.list('nome'),
    initialData: [],
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configs'],
    queryFn: () => base44.entities.Config.list(),
    initialData: [],
  });

  const config = configs[0];

  const normalizeMembroPayload = (data) => {
    const dateFields = [
      'data_nascimento',
      'data_conversao',
      'data_batismo',
      'data_batismo_espirito_santo',
      'data_membresia',
      'data_obreiro',
    ];
    const uuidFields = ['congregacao_id', 'departamento_id'];
    const optionalFields = ['foto_url', 'foto_path', 'foto_bucket'];
    const payload = { ...data };

    optionalFields.forEach((field) => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });

    uuidFields.forEach((field) => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });

    dateFields.forEach((field) => {
      if (!payload[field]) {
        payload[field] = null;
      }
    });

    if (!payload.batismo_espirito_santo) {
      payload.data_batismo_espirito_santo = null;
    }

    if (!payload.obreiro) {
      payload.cargo_obreiro = '';
      payload.data_obreiro = null;
    }

    if (payload.estado_civil !== 'casado') {
      payload.nome_conjuge = '';
      payload.conjuge_tipo = '';
      payload.conjuge_outros = '';
    }

    if (payload.conjuge_tipo !== 'outros') {
      payload.conjuge_outros = '';
    }

    if (payload.nacionalidade !== 'estrangeiro') {
      payload.nacionalidade_outros = '';
    }

    if (payload.origem !== 'novo') {
      payload.religiao_origem = '';
    }

    if (!payload.cargo_obreiro) {
      payload.data_obreiro = null;
    }

    if (!Array.isArray(payload.departamentos_ids)) {
      payload.departamentos_ids = [];
    }

    payload.departamentos_ids = payload.departamentos_ids.filter(Boolean);

    return payload;
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const normalizedData = normalizeMembroPayload(data);
      const departamentosIds = Array.isArray(normalizedData.departamentos_ids)
        ? normalizedData.departamentos_ids
        : normalizedData.departamento_id
        ? [normalizedData.departamento_id]
        : [];
      const normalizedDepartamentoId = departamentosIds[0] || null;
      const congregacao = congregacoes.find((c) => c.id === normalizedData.congregacao_id);
      const departamentosSelecionados = departamentos.filter((d) => departamentosIds.includes(d.id));
      const dataToSave = {
        ...normalizedData,
        departamentos_ids: departamentosIds,
        departamento_id: normalizedDepartamentoId,
        congregacao_nome: congregacao?.nome || '',
        departamento_nome: departamentosSelecionados.map((dept) => dept.nome).join(', '),
        departamentos_nomes: departamentosSelecionados.map((dept) => dept.nome),
      };

      if (membro) {
        return base44.entities.Membro.update(membro.id, dataToSave);
      }
      return base44.entities.Membro.create(dataToSave);
    },
  });

  const uploadFotoFile = async (file, membroId = null) => {
    if (!file) return;

    const fileToUpload = await compressImage(file, { maxSize: 800, quality: 0.8 });
    const extension = fileToUpload.name?.split('.').pop() || 'jpg';
    const baseId = membroId || membro?.id || uploadSessionIdRef.current;
    const filePath = `membros/${baseId}/perfil.${extension}`;
    const { file_url, path } = await base44.integrations.Core.UploadFile({
      file: fileToUpload,
      bucket: STORAGE_BUCKETS.fotosMembros,
      path: filePath,
    });
    return { file_url, filePath: path || filePath };
  };

  const validateFotoFile = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeInBytes = 5 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      return 'Formato inválido. Envie JPG, PNG ou WEBP.';
    }

    if (file.size > maxSizeInBytes) {
      return 'A foto deve ter no máximo 5MB.';
    }

    return '';
  };

  const handleFotoFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!isAdmin) {
      setUploadError('Somente administradores podem fazer upload de fotos.');
      return;
    }

    if (!file) return;
    const validationError = validateFotoFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError('');
    if (rawFotoPreview) {
      URL.revokeObjectURL(rawFotoPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setRawFotoFile(file);
    setRawFotoPreview(previewUrl);
    setFotoEditorZoom(1);
    setFotoEditorOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setUploadError('');

    const dataToSave = { ...formData };
    if (!isAdmin && membro) {
      dataToSave.foto_url = membro.foto_url || '';
      dataToSave.foto_path = membro.foto_path || '';
      dataToSave.foto_bucket = membro.foto_bucket || STORAGE_BUCKETS.fotosMembros;
    }
    setUploading(true);

    try {
      if (!membro) {
        const createdMembro = await saveMutation.mutateAsync({
          ...dataToSave,
          foto_url: '',
          foto_path: '',
          foto_bucket: STORAGE_BUCKETS.fotosMembros,
        });

        const createdRecord = Array.isArray(createdMembro) ? createdMembro[0] : createdMembro;
        if (isAdmin && pendingFotoFile && createdRecord?.id) {
          const { file_url, filePath } = await uploadFotoFile(pendingFotoFile, createdRecord.id);
          await base44.entities.Membro.update(createdRecord.id, {
            foto_url: file_url,
            foto_path: filePath,
            foto_bucket: STORAGE_BUCKETS.fotosMembros,
          });
        }
      } else {
        let payload = dataToSave;
        const previousFotoPath = membro.foto_path;
        const previousFotoBucket = membro.foto_bucket || STORAGE_BUCKETS.fotosMembros;

        if (isAdmin && pendingFotoFile) {
          const { file_url, filePath } = await uploadFotoFile(pendingFotoFile);
          payload = {
            ...payload,
            foto_url: file_url,
            foto_path: filePath,
            foto_bucket: STORAGE_BUCKETS.fotosMembros,
          };
        }

        await saveMutation.mutateAsync(payload);

        const shouldDeleteOldPhoto =
          isAdmin &&
          pendingFotoFile &&
          previousFotoPath &&
          previousFotoPath !== payload.foto_path;

        if (shouldDeleteOldPhoto) {
          try {
            await base44.integrations.Core.DeleteFile({
              bucket: previousFotoBucket,
              path: previousFotoPath,
            });
          } catch (deleteError) {
            console.warn('Não foi possível remover a foto antiga do membro.', deleteError);
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_KEY);
      }
      queryClient.invalidateQueries({ queryKey: ['membros'] });
      queryClient.invalidateQueries({ queryKey: ['membro'] });
      onClose();
      setPendingFotoFile(null);
      setPendingFotoPreview('');
    } catch (error) {
      console.error('Erro ao salvar membro com foto:', error);
      setUploadError(error?.message || 'Não foi possível salvar a foto. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (field, value) => {
    const checkboxFields = ['batismo_espirito_santo', 'obreiro', 'ativo'];
    const nullableFields = ['departamento_id', 'congregacao_id'];

    let nextValue = value;

    if (checkboxFields.includes(field)) {
      nextValue = value === true;
    } else if (nullableFields.includes(field) && value === '') {
      nextValue = null;
    }

    updateFormData((prev) => {
      const updated = { ...prev, [field]: nextValue };
      if (field === 'origem' && nextValue === 'transferencia_envia') {
        updated.status = 'transferido';
      }
      return updated;
    });
  };

  const handleDepartamentoToggle = (departamentoId) => {
    updateFormData((prev) => {
      const currentIds = Array.isArray(prev.departamentos_ids) ? prev.departamentos_ids : [];
      const nextIds = currentIds.includes(departamentoId)
        ? currentIds.filter((id) => id !== departamentoId)
        : [...currentIds, departamentoId];
      return {
        ...prev,
        departamentos_ids: nextIds,
      };
    });
  };

  const handleSaveDraft = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  };

  const speechSupported = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecordingField(null);
  };

  const startRecording = (field) => {
    if (!speechSupported) return;

    if (recordingField) {
      stopRecording();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript)
        .join(' ')
        .trim();
      if (transcript) {
        updateFormData((prev) => ({
          ...prev,
          [field]: prev[field] ? `${prev[field].trim()} ${transcript}` : transcript,
        }));
      }
    };

    recognition.onerror = () => {
      setRecordingField(null);
    };

    recognition.onend = () => {
      setRecordingField(null);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setRecordingField(field);
    recognition.start();
  };

  useEffect(() => {
    if (membro || didPrefillRef.current) return;
    if (!config) return;

    const hasAnyLocal = formData.cidade || formData.estado || formData.cep;
    if (!hasAnyLocal) {
      updateFormData((prev) => ({
        ...prev,
        cidade: config.cidade || prev.cidade,
        estado: config.estado || prev.estado,
        cep: config.cep || prev.cep,
      }));
      didPrefillRef.current = true;
    }
  }, [config, formData.cidade, formData.estado, formData.cep, membro]);

  useEffect(() => {
    if (membro) return;
    if (typeof window === 'undefined') return;
    const storedDraft = window.localStorage.getItem(DRAFT_KEY);
    if (!storedDraft) return;
    try {
      const parsedDraft = JSON.parse(storedDraft);
      updateFormData((prev) => ({ ...prev, ...parsedDraft }));
    } catch (error) {
      console.warn('Não foi possível carregar o rascunho do membro.', error);
    }
  }, [membro]);

  useEffect(() => {
    if (membro) return;
    if (typeof window === 'undefined') return;
    const timeout = setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, 400);

    return () => clearTimeout(timeout);
  }, [formData, membro]);

  useEffect(() => {
    if (formData.origem === 'transferencia_envia' && formData.status !== 'transferido') {
      updateFormData((prev) => ({ ...prev, status: 'transferido' }));
    }
  }, [formData.origem, formData.status]);

  useEffect(() => {
    return () => {
      if (pendingFotoPreview) {
        URL.revokeObjectURL(pendingFotoPreview);
      }
      if (rawFotoPreview) {
        URL.revokeObjectURL(rawFotoPreview);
      }
    };
  }, [pendingFotoPreview, rawFotoPreview]);

  const createEditedFotoFile = (file, zoom) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const size = 512;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Não foi possível preparar o editor de imagem.'));
            return;
          }

          const scale = Math.max(size / image.width, size / image.height) * zoom;
          const scaledWidth = image.width * scale;
          const scaledHeight = image.height * scale;
          const offsetX = (size - scaledWidth) / 2;
          const offsetY = (size - scaledHeight) / 2;

          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, size, size);
          context.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Não foi possível gerar a imagem editada.'));
                return;
              }
              const extension = file.name?.split('.').pop() || 'jpg';
              const editedFile = new File([blob], `foto-editada.${extension}`, {
                type: blob.type,
              });
              resolve(editedFile);
            },
            'image/jpeg',
            0.9
          );
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  const handleConfirmFotoEdit = async () => {
    if (!rawFotoFile) return;
    try {
      const editedFile = await createEditedFotoFile(rawFotoFile, fotoEditorZoom);
      if (pendingFotoPreview) {
        URL.revokeObjectURL(pendingFotoPreview);
      }
      const previewUrl = URL.createObjectURL(editedFile);
      setPendingFotoFile(editedFile);
      setPendingFotoPreview(previewUrl);
      setPreviewFailed(false);
      setFotoEditorOpen(false);
      setRawFotoFile(null);
      if (rawFotoPreview) {
        URL.revokeObjectURL(rawFotoPreview);
      }
      setRawFotoPreview('');
    } catch (error) {
      console.error('Erro ao preparar a foto:', error);
    }
  };

  const handleCancelFotoEdit = () => {
    setFotoEditorOpen(false);
    setRawFotoFile(null);
    if (rawFotoPreview) {
      URL.revokeObjectURL(rawFotoPreview);
    }
    setRawFotoPreview('');
    setFotoEditorZoom(1);
  };

  const currentFotoUrl = resolveMemberPhotoUrl(formData);
  const fotoPreview = previewFailed ? '' : pendingFotoPreview || currentFotoUrl;

  useEffect(() => {
    const cepDigits = (formData.cep || '').replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      setCepStatus({ loading: false, error: '' });
      return;
    }

    let isActive = true;
    setCepStatus({ loading: true, error: '' });

    fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
      .then((response) => response.json())
      .then((data) => {
        if (!isActive) return;
        if (data?.erro) {
          setCepStatus({ loading: false, error: 'CEP não encontrado.' });
          return;
        }

        updateFormData((prev) => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
        setCepStatus({ loading: false, error: '' });
      })
      .catch(() => {
        if (!isActive) return;
        setCepStatus({ loading: false, error: 'Não foi possível buscar o CEP agora.' });
      });

    return () => {
      isActive = false;
    };
  }, [formData.cep]);

  const departamentosDisponiveis = isAdmin
    ? departamentos
    : departamentos.filter(
        (d) => !d.congregacao_id || d.congregacao_id === userCongregacaoId || d.congregacao_id === formData.congregacao_id
      );

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {membro ? 'Editar Membro' : 'Novo Membro'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Foto do Membro</Label>
              <div className="mt-2 flex items-center gap-4">
                {fotoPreview ? (
                  <div className="relative">
                    <img
                      src={fotoPreview}
                      alt="Foto"
                      className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                      onError={() => {
                        setPreviewFailed(true);
                        setUploadError('Não foi possível carregar a foto selecionada.');
                      }}
                    />
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (pendingFotoPreview) {
                            URL.revokeObjectURL(pendingFotoPreview);
                          }
                          setPendingFotoFile(null);
                          setPendingFotoPreview('');
                          updateFormData((prev) => ({
                            ...prev,
                            foto_url: '',
                            foto_path: '',
                            foto_bucket: STORAGE_BUCKETS.fotosMembros,
                          }));
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <input id="foto-upload" type="file" accept="image/*" onChange={handleFotoFileChange} className="hidden" />
                  <input
                    id="foto-camera"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('foto-upload').click()}
                      disabled={uploading || !isAdmin}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Carregar Arquivo'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('foto-camera').click()}
                      disabled={uploading || !isAdmin}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Usar Câmera'}
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">Formatos aceitos: JPG, PNG ou WEBP. Tamanho máximo: 5MB</p>
                  {!isAdmin && (
                    <p className="text-xs text-amber-700 mt-2 inline-flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Somente administradores podem salvar foto de membro.
                    </p>
                  )}
                  {uploadError && <p className="text-sm text-red-600 mt-1">{uploadError}</p>}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="nome_completo">Nome Completo *</Label>
              <div className="relative">
                <Input
                  id="nome_completo"
                  value={formData.nome_completo}
                  onChange={(e) => handleChange('nome_completo', e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => (recordingField === 'nome_completo' ? stopRecording() : startRecording('nome_completo'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'nome_completo' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para o nome completo"
                  disabled={!speechSupported}
                >
                  {recordingField === 'nome_completo' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Use o microfone para ditar e edite o texto se necessário.</p>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(value) => handleChange('tipo', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membro">Membro</SelectItem>
                  <SelectItem value="congregado">Congregado</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                  <SelectItem value="crianca">Criança</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="origem">Origem *</Label>
              <Select value={formData.origem} onValueChange={(value) => handleChange('origem', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo Convertido</SelectItem>
                  <SelectItem value="membro_antigo">Membro (Antigo)</SelectItem>
                  <SelectItem value="transferencia_recebe">Transferência (Recebe)</SelectItem>
                  <SelectItem value="transferencia_envia">Transferência (Envia)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.origem === 'novo' && (
              <div>
                <Label htmlFor="religiao_origem">Religião de Origem</Label>
                <div className="relative">
                  <Input
                    id="religiao_origem"
                    value={formData.religiao_origem}
                    onChange={(e) => handleChange('religiao_origem', e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => (recordingField === 'religiao_origem' ? stopRecording() : startRecording('religiao_origem'))}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                      recordingField === 'religiao_origem' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    aria-label="Gravar áudio para a religião de origem"
                    disabled={!speechSupported}
                  >
                    {recordingField === 'religiao_origem' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {formData.origem === 'transferencia_recebe' && (
              <div>
                <Label htmlFor="cidade_origem">Cidade Origem</Label>
                <Input
                  id="cidade_origem"
                  value={formData.cidade_origem}
                  onChange={(e) => handleChange('cidade_origem', e.target.value)}
                  placeholder="Cidade de origem"
                />
              </div>
            )}

            {formData.origem === 'transferencia_envia' && (
              <div>
                <Label htmlFor="cidade_destino">Cidade Destino</Label>
                <Input
                  id="cidade_destino"
                  value={formData.cidade_destino}
                  onChange={(e) => handleChange('cidade_destino', e.target.value)}
                  placeholder="Cidade de destino"
                />
              </div>
            )}

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="transferido">Transferido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div>
                <Label htmlFor="congregacao_id">Congregação *</Label>
                <Select value={formData.congregacao_id || ''} onValueChange={(value) => handleChange('congregacao_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {congregacoes.map((cong) => (
                      <SelectItem key={cong.id} value={cong.id}>
                        {cong.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => handleChange('data_nascimento', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="nacionalidade">Nacionalidade</Label>
              <Select value={formData.nacionalidade} onValueChange={(value) => handleChange('nacionalidade', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brasileiro">Brasileiro</SelectItem>
                  <SelectItem value="estrangeiro">Estrangeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.nacionalidade === 'estrangeiro' && (
              <div>
                <Label htmlFor="nacionalidade_outros">Nacionalidade (especifique)</Label>
                <div className="relative">
                  <Input
                    id="nacionalidade_outros"
                    value={formData.nacionalidade_outros}
                    onChange={(e) => handleChange('nacionalidade_outros', e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      recordingField === 'nacionalidade_outros' ? stopRecording() : startRecording('nacionalidade_outros')
                    }
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                      recordingField === 'nacionalidade_outros' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    aria-label="Gravar áudio para a nacionalidade"
                    disabled={!speechSupported}
                  >
                    {recordingField === 'nacionalidade_outros' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="naturalidade">Naturalidade</Label>
              <div className="relative">
                <Input
                  id="naturalidade"
                  value={formData.naturalidade}
                  onChange={(e) => handleChange('naturalidade', e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => (recordingField === 'naturalidade' ? stopRecording() : startRecording('naturalidade'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'naturalidade' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para a naturalidade"
                  disabled={!speechSupported}
                >
                  {recordingField === 'naturalidade' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="pai">Pai</Label>
              <div className="relative">
                <Input id="pai" value={formData.pai} onChange={(e) => handleChange('pai', e.target.value)} className="pr-10" />
                <button
                  type="button"
                  onClick={() => (recordingField === 'pai' ? stopRecording() : startRecording('pai'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'pai' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para o nome do pai"
                  disabled={!speechSupported}
                >
                  {recordingField === 'pai' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="mae">Mãe</Label>
              <div className="relative">
                <Input id="mae" value={formData.mae} onChange={(e) => handleChange('mae', e.target.value)} className="pr-10" />
                <button
                  type="button"
                  onClick={() => (recordingField === 'mae' ? stopRecording() : startRecording('mae'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'mae' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para o nome da mãe"
                  disabled={!speechSupported}
                >
                  {recordingField === 'mae' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="sexo">Sexo</Label>
              <Select value={formData.sexo} onValueChange={(value) => handleChange('sexo', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estado_civil">Estado Civil</Label>
              <Select value={formData.estado_civil} onValueChange={(value) => handleChange('estado_civil', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                  <SelectItem value="casado">Casado(a)</SelectItem>
                  <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                  <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.estado_civil === 'casado' && (
              <>
                <div>
                  <Label htmlFor="nome_conjuge">Nome Cônjuge</Label>
                  <div className="relative">
                    <Input
                      id="nome_conjuge"
                      value={formData.nome_conjuge}
                      onChange={(e) => handleChange('nome_conjuge', e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => (recordingField === 'nome_conjuge' ? stopRecording() : startRecording('nome_conjuge'))}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                        recordingField === 'nome_conjuge' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                      }`}
                      aria-label="Gravar áudio para o nome do cônjuge"
                      disabled={!speechSupported}
                    >
                      {recordingField === 'nome_conjuge' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="conjuge_tipo">Cônjuge é</Label>
                  <Select value={formData.conjuge_tipo} onValueChange={(value) => handleChange('conjuge_tipo', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membro">Membro</SelectItem>
                      <SelectItem value="congregado">Congregado</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.conjuge_tipo === 'outros' && (
                  <div>
                    <Label htmlFor="conjuge_outros">Cônjuge é (especifique)</Label>
                    <div className="relative">
                      <Input
                        id="conjuge_outros"
                        value={formData.conjuge_outros}
                        onChange={(e) => handleChange('conjuge_outros', e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => (recordingField === 'conjuge_outros' ? stopRecording() : startRecording('conjuge_outros'))}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                          recordingField === 'conjuge_outros' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                        aria-label="Gravar áudio para o tipo de cônjuge"
                        disabled={!speechSupported}
                      >
                        {recordingField === 'conjuge_outros' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => handleChange('cpf', e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="rg">RG</Label>
              <Input id="rg" value={formData.rg} onChange={(e) => handleChange('rg', e.target.value)} />
            </div>

            <div>
              <Label htmlFor="escolaridade">Escolaridade</Label>
              <Select value={formData.escolaridade} onValueChange={(value) => handleChange('escolaridade', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analfabeto">Analfabeto</SelectItem>
                  <SelectItem value="fundamental_incompleto">Fundamental Incompleto</SelectItem>
                  <SelectItem value="fundamental_completo">Fundamental Completo</SelectItem>
                  <SelectItem value="medio_incompleto">Médio Incompleto</SelectItem>
                  <SelectItem value="medio_completo">Médio Completo</SelectItem>
                  <SelectItem value="superior_incompleto">Superior Incompleto</SelectItem>
                  <SelectItem value="superior_completo">Superior Completo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="profissao">Profissão</Label>
              <div className="relative">
                <Input
                  id="profissao"
                  value={formData.profissao}
                  onChange={(e) => handleChange('profissao', e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => (recordingField === 'profissao' ? stopRecording() : startRecording('profissao'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'profissao' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para a profissão"
                  disabled={!speechSupported}
                >
                  {recordingField === 'profissao' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <div className="relative">
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleChange('endereco', e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => (recordingField === 'endereco' ? stopRecording() : startRecording('endereco'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'endereco' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para o endereço"
                  disabled={!speechSupported}
                >
                  {recordingField === 'endereco' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <div className="relative">
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => (recordingField === 'cidade' ? stopRecording() : startRecording('cidade'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'cidade' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para a cidade"
                  disabled={!speechSupported}
                >
                  {recordingField === 'cidade' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <div className="relative">
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  placeholder="UF"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => (recordingField === 'estado' ? stopRecording() : startRecording('estado'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'estado' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para o estado"
                  disabled={!speechSupported}
                >
                  {recordingField === 'estado' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="cep">CEP</Label>
              <div className="relative">
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => handleChange('cep', e.target.value)}
                  placeholder="00000-000"
                  className="pr-10"
                />
                {cepStatus.loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-500" />}
              </div>
              {cepStatus.error && <p className="text-xs text-red-600 mt-1">{cepStatus.error}</p>}
              {!cepStatus.error && !cepStatus.loading && (
                <p className="text-xs text-slate-500 mt-1">Digite o CEP para preencher endereço automaticamente.</p>
              )}
            </div>

            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <div className="relative">
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => (recordingField === 'bairro' ? stopRecording() : startRecording('bairro'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'bairro' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para o bairro"
                  disabled={!speechSupported}
                >
                  {recordingField === 'bairro' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t">
              <h3 className="font-semibold text-lg mb-4 text-slate-900">Informações Eclesiásticas</h3>
            </div>

            <div>
              <Label htmlFor="data_conversao">Data de Conversão</Label>
              <Input
                id="data_conversao"
                type="date"
                value={formData.data_conversao}
                onChange={(e) => handleChange('data_conversao', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="data_batismo">Data do Batismo nas Águas</Label>
              <Input
                id="data_batismo"
                type="date"
                value={formData.data_batismo}
                onChange={(e) => handleChange('data_batismo', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <Checkbox
                  id="batismo_espirito_santo"
                  checked={formData.batismo_espirito_santo}
                  onCheckedChange={(checked) => handleChange('batismo_espirito_santo', checked)}
                />
                <div className="flex-1">
                  <Label htmlFor="batismo_espirito_santo" className="cursor-pointer font-semibold text-purple-900">
                    Batismo com Espírito Santo?
                  </Label>
                  <p className="text-sm text-purple-700 mt-1">
                    Marque se o membro já recebeu o batismo com o Espírito Santo
                  </p>
                </div>
              </div>
            </div>

            {formData.batismo_espirito_santo && (
              <div className="md:col-span-2 bg-purple-50 p-4 rounded-lg border border-purple-200">
                <Label htmlFor="data_batismo_espirito_santo">Data do Batismo com Espírito Santo</Label>
                <Input
                  id="data_batismo_espirito_santo"
                  type="date"
                  value={formData.data_batismo_espirito_santo}
                  onChange={(e) => handleChange('data_batismo_espirito_santo', e.target.value)}
                  className="mt-2"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Checkbox id="obreiro" checked={formData.obreiro} onCheckedChange={(checked) => handleChange('obreiro', checked)} />
                <div className="flex-1">
                  <Label htmlFor="obreiro" className="cursor-pointer font-semibold text-blue-900">
                    Obreiro?
                  </Label>
                  <p className="text-sm text-blue-700 mt-1">Marque se o membro exerce cargo de obreiro</p>
                </div>
              </div>
            </div>

            {formData.obreiro && (
              <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label htmlFor="cargo_obreiro">Cargo de Obreiro</Label>
                <Select value={formData.cargo_obreiro} onValueChange={(value) => handleChange('cargo_obreiro', value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o cargo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cooperador">Cooperador</SelectItem>
                    <SelectItem value="diacono">Diácono</SelectItem>
                    <SelectItem value="presbitero">Presbítero</SelectItem>
                    <SelectItem value="evangelista">Evangelista</SelectItem>
                    <SelectItem value="pastor">Pastor</SelectItem>
                  </SelectContent>
                </Select>
                {formData.cargo_obreiro && (
                  <div className="mt-4">
                    <Label htmlFor="data_obreiro">Data</Label>
                    <Input
                      id="data_obreiro"
                      type="date"
                      value={formData.data_obreiro}
                      onChange={(e) => handleChange('data_obreiro', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <Label>Departamentos</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleChange('departamentos_ids', [])}
                  className="text-xs"
                >
                  Limpar seleção
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Você pode selecionar mais de um departamento.</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {departamentosDisponiveis.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum departamento disponível.</p>
                ) : (
                  departamentosDisponiveis.map((dept) => (
                    <label
                      key={dept.id}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"
                    >
                      <Checkbox
                        checked={formData.departamentos_ids?.includes(dept.id)}
                        onCheckedChange={() => handleDepartamentoToggle(dept.id)}
                      />
                      <span>
                        {dept.nome} {dept.congregacao_nome ? `- ${dept.congregacao_nome}` : '(Global)'}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <div className="relative">
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  rows={3}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => (recordingField === 'observacoes' ? stopRecording() : startRecording('observacoes'))}
                  className={`absolute right-2 top-3 rounded-full p-1 transition ${
                    recordingField === 'observacoes' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para observações"
                  disabled={!speechSupported}
                >
                  {recordingField === 'observacoes' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Após a transcrição, revise e edite se necessário.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" variant="outline" onClick={handleSaveDraft}>
              Rascunho
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fotoEditorOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelFotoEdit();
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Pré-visualizar e editar foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              {rawFotoPreview ? (
                <div className="w-64 h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={rawFotoPreview}
                    alt="Pré-visualização da foto"
                    className="w-full h-full object-cover"
                    style={{ transform: `scale(${fotoEditorZoom})` }}
                  />
                </div>
              ) : (
                <div className="w-64 h-64 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-sm text-slate-500">
                  Nenhuma imagem selecionada
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="foto-zoom">Zoom</Label>
              <input
                id="foto-zoom"
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={fotoEditorZoom}
                onChange={(event) => setFotoEditorZoom(Number(event.target.value))}
                className="w-full"
              />
              <div className="text-xs text-slate-500">Ajuste o enquadramento antes de salvar.</div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancelFotoEdit}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmFotoEdit} disabled={!rawFotoFile}>
                Aplicar foto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
