import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Upload, Camera, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [recordingField, setRecordingField] = useState(null);
  const [cepStatus, setCepStatus] = useState({ loading: false, error: '' });
  const recognitionRef = useRef(null);
  const didPrefillRef = useRef(false);
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
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    data_batismo: '',
    local_batismo: '',
    batismo_espirito_santo: false,
    data_batismo_espirito_santo: '',
    obreiro: false,
    cargo_obreiro: '',
    departamento_id: null,
    foto_url: '',
    observacoes: '',
    bairro: '',
    cidade_origem: '',
    cidade_destino: '',
    ativo: true,
  };
  const [formData, setFormData] = useState(() =>
    membro
      ? {
          ...defaultFormData,
          ...membro,
          origem: normalizeOrigem(membro.origem || defaultFormData.origem),
          status: membro.status || defaultFormData.status,
        }
      : defaultFormData
  );

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

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const normalizedDepartamentoId = data.departamento_id || null;
      const congregacao = congregacoes.find((c) => c.id === data.congregacao_id);
      const departamento = departamentos.find((d) => d.id === normalizedDepartamentoId);
      const dataToSave = {
        ...data,
        departamento_id: normalizedDepartamentoId,
        congregacao_nome: congregacao?.nome || '',
        departamento_nome: departamento?.nome || '',
      };

      if (membro) {
        return base44.entities.Membro.update(membro.id, dataToSave);
      }
      return base44.entities.Membro.create(dataToSave);
    },
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_KEY);
      }
      queryClient.invalidateQueries({ queryKey: ['membros'] });
      onClose();
    },
  });

  const handleFotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('foto_url', file_url);
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
    }
    setUploading(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    const checkboxFields = ['batismo_espirito_santo', 'obreiro', 'ativo'];
    const nullableFields = ['departamento_id'];

    let nextValue = value;

    if (checkboxFields.includes(field)) {
      nextValue = value === true;
    } else if (nullableFields.includes(field) && value === '') {
      nextValue = null;
    }

    setFormData((prev) => {
      const updated = { ...prev, [field]: nextValue };
      if (field === 'origem' && nextValue === 'transferencia_envia') {
        updated.status = 'transferido';
      }
      return updated;
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
        setFormData((prev) => ({
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
      setFormData((prev) => ({
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
      setFormData((prev) => ({ ...prev, ...parsedDraft }));
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
      setFormData((prev) => ({ ...prev, status: 'transferido' }));
    }
  }, [formData.origem, formData.status]);

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

        setFormData((prev) => ({
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
                {formData.foto_url ? (
                  <div className="relative">
                    <img
                      src={formData.foto_url}
                      alt="Foto"
                      className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleChange('foto_url', '')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <input id="foto" type="file" accept="image/*" onChange={handleFotoUpload} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('foto').click()} disabled={uploading}>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Escolher Foto'}
                  </Button>
                  <p className="text-sm text-slate-500 mt-2">Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB</p>
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
              <Label htmlFor="data_batismo">Data do Batismo nas Águas</Label>
              <Input
                id="data_batismo"
                type="date"
                value={formData.data_batismo}
                onChange={(e) => handleChange('data_batismo', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="local_batismo">Local do Batismo</Label>
              <div className="relative">
                <Input
                  id="local_batismo"
                  value={formData.local_batismo}
                  onChange={(e) => handleChange('local_batismo', e.target.value)}
                  placeholder="Ex: Igreja Central, Rio Jordão..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => (recordingField === 'local_batismo' ? stopRecording() : startRecording('local_batismo'))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                    recordingField === 'local_batismo' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-label="Gravar áudio para o local do batismo"
                  disabled={!speechSupported}
                >
                  {recordingField === 'local_batismo' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
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
              </div>
            )}

            <div className="md:col-span-2">
              <Label htmlFor="departamento_id">Departamento</Label>
              <Select value={formData.departamento_id || ''} onValueChange={(value) => handleChange('departamento_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um departamento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum departamento</SelectItem>
                  {departamentosDisponiveis.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.nome} {dept.congregacao_nome ? `- ${dept.congregacao_nome}` : '(Global)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
  );
}
