import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Upload, Camera } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState(
    membro || {
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
      ativo: true,
    }
  );

  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => base44.entities.Departamento.list('nome'),
    initialData: [],
  });

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

    setFormData((prev) => ({ ...prev, [field]: nextValue }));
  };

  const departamentosDisponiveis = isAdmin
    ? departamentos
    : departamentos.filter(
        (d) => !d.congregacao_id || d.congregacao_id === userCongregacaoId || d.congregacao_id === formData.congregacao_id
      );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {membro ? 'Editar Membro' : 'Novo Membro'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => handleChange('nome_completo', e.target.value)}
                required
              />
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
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <Input id="endereco" value={formData.endereco} onChange={(e) => handleChange('endereco', e.target.value)} />
            </div>

            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={formData.cidade} onChange={(e) => handleChange('cidade', e.target.value)} />
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Input id="estado" value={formData.estado} onChange={(e) => handleChange('estado', e.target.value)} placeholder="UF" />
            </div>

            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" value={formData.cep} onChange={(e) => handleChange('cep', e.target.value)} placeholder="00000-000" />
            </div>

            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" value={formData.bairro} onChange={(e) => handleChange('bairro', e.target.value)} />
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
              <Input
                id="local_batismo"
                value={formData.local_batismo}
                onChange={(e) => handleChange('local_batismo', e.target.value)}
                placeholder="Ex: Igreja Central, Rio Jordão..."
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
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
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
