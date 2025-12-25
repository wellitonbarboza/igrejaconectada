import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const CORES_PADRAO = [
  { nome: 'Azul', valor: '#3b82f6' },
  { nome: 'Verde', valor: '#10b981' },
  { nome: 'Roxo', valor: '#8b5cf6' },
  { nome: 'Rosa', valor: '#ec4899' },
  { nome: 'Laranja', valor: '#f97316' },
  { nome: 'Vermelho', valor: '#ef4444' },
];

export default function ModalDepartamento({ departamento, onClose, membros, userCongregacaoId, isAdmin }) {
  const DRAFT_KEY = 'draft_departamento';
  const queryClient = useQueryClient();
  const defaultFormData = {
    nome: '',
    descricao: '',
    congregacao_id: isAdmin ? null : userCongregacaoId,
    lider_id: null,
    membros_ids: [],
    cor: '#3b82f6',
    ativo: true,
  };
  const [formData, setFormData] = useState(() =>
    departamento ? { ...defaultFormData, ...departamento } : defaultFormData
  );

  const { data: congregacoes = [] } = useQuery({
    queryKey: ['congregacoes'],
    queryFn: () => base44.entities.Congregacao.list('nome'),
    initialData: [],
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const lider = membros.find((m) => m.id === data.lider_id);
      const congregacao = congregacoes.find((c) => c.id === data.congregacao_id);

      const dataToSave = {
        ...data,
        lider_nome: lider?.nome_completo || '',
        congregacao_nome: congregacao?.nome || '',
      };

      if (departamento) {
        return base44.entities.Departamento.update(departamento.id, dataToSave);
      }
      return base44.entities.Departamento.create(dataToSave);
    },
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_KEY);
      }
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      onClose();
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    const shouldNormalize = ['congregacao_id', 'lider_id'].includes(field);
    const nextValue = shouldNormalize && value === '' ? null : value;

    setFormData((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleMembroToggle = (membroId) => {
    setFormData((prev) => ({
      ...prev,
      membros_ids: prev.membros_ids?.includes(membroId)
        ? prev.membros_ids.filter((id) => id !== membroId)
        : [...(prev.membros_ids || []), membroId],
    }));
  };

  const membrosDisponiveis = isAdmin
    ? membros
    : membros.filter(
        (m) => m.congregacao_id === userCongregacaoId || m.congregacao_id === formData.congregacao_id
      );

  const handleSaveDraft = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  };

  useEffect(() => {
    if (departamento) return;
    if (typeof window === 'undefined') return;
    const storedDraft = window.localStorage.getItem(DRAFT_KEY);
    if (!storedDraft) return;
    try {
      const parsedDraft = JSON.parse(storedDraft);
      setFormData((prev) => ({ ...prev, ...parsedDraft }));
    } catch (error) {
      console.warn('Não foi possível carregar o rascunho do departamento.', error);
    }
  }, [departamento]);

  useEffect(() => {
    if (departamento) return;
    if (typeof window === 'undefined') return;
    const timeout = setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, 400);

    return () => clearTimeout(timeout);
  }, [formData, departamento]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {departamento ? 'Editar Departamento' : 'Novo Departamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do Departamento *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Louvor, Jovens, Crianças..."
                required
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Descrição das atividades do departamento"
                rows={3}
              />
            </div>

            {isAdmin && (
              <div>
                <Label htmlFor="congregacao_id">Congregação</Label>
                <Select value={formData.congregacao_id || ''} onValueChange={(value) => handleChange('congregacao_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas (departamento global)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas (departamento global)</SelectItem>
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
              <Label htmlFor="lider_id">Líder do Departamento</Label>
              <Select value={formData.lider_id || ''} onValueChange={(value) => handleChange('lider_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um líder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum líder definido</SelectItem>
                  {membrosDisponiveis.map((membro) => (
                    <SelectItem key={membro.id} value={membro.id}>
                      {membro.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cor de Identificação</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {CORES_PADRAO.map((cor) => (
                  <button
                    key={cor.valor}
                    type="button"
                    onClick={() => handleChange('cor', cor.valor)}
                    className={clsx(
                      'h-10 rounded-lg transition-all',
                      formData.cor === cor.valor ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: cor.valor }}
                    title={cor.nome}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Membros do Departamento ({formData.membros_ids?.length || 0})</Label>
              <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto">
                {membrosDisponiveis.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500 text-center">Nenhum membro disponível</p>
                ) : (
                  <div className="p-2 space-y-1">
                    {membrosDisponiveis.map((membro) => (
                      <label
                        key={membro.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={formData.membros_ids?.includes(membro.id)}
                          onCheckedChange={() => handleMembroToggle(membro.id)}
                        />
                        <div>
                          <p className="font-medium text-sm">{membro.nome_completo}</p>
                          <p className="text-xs text-slate-500">{membro.tipo}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
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
