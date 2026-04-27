import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ModalCongregacao({ congregacao, onClose, readOnly = false }) {
  const DRAFT_KEY = 'draft_congregacao';
  const queryClient = useQueryClient();
  const defaultFormData = {
    nome: '',
    cidade: '',
    estado: '',
    endereco: '',
    telefone: '',
    email: '',
    pastor_responsavel: '',
    ativa: true,
  };
  const [formData, setFormData] = useState(() =>
    congregacao ? { ...defaultFormData, ...congregacao } : defaultFormData
  );

  const normalizeCongregacaoPayload = (data) => {
    const optionalFields = ['endereco', 'telefone', 'email', 'pastor_responsavel'];
    const payload = { ...data };

    optionalFields.forEach((field) => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });

    return payload;
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const normalizedData = normalizeCongregacaoPayload(data);
      if (congregacao) {
        return base44.entities.Congregacao.update(congregacao.id, normalizedData);
      }
      return base44.entities.Congregacao.create(normalizedData);
    },
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_KEY);
      }
      queryClient.invalidateQueries({ queryKey: ['congregacoes'] });
      onClose();
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  };

  useEffect(() => {
    if (congregacao) return;
    if (typeof window === 'undefined') return;
    const storedDraft = window.localStorage.getItem(DRAFT_KEY);
    if (!storedDraft) return;
    try {
      const parsedDraft = JSON.parse(storedDraft);
      setFormData((prev) => ({ ...prev, ...parsedDraft }));
    } catch (error) {
      console.warn('Não foi possível carregar o rascunho da congregação.', error);
    }
  }, [congregacao]);

  useEffect(() => {
    if (congregacao) return;
    if (typeof window === 'undefined') return;
    const timeout = setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, 400);

    return () => clearTimeout(timeout);
  }, [formData, congregacao]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {congregacao ? 'Editar Congregação' : 'Nova Congregação'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit} className="space-y-6 px-6 pb-6">
          <fieldset disabled={readOnly}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="nome">Nome da Congregação *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Igreja Central"
                required
              />
            </div>

            <div>
              <Label htmlFor="cidade">Cidade *</Label>
              <Input id="cidade" value={formData.cidade} onChange={(e) => handleChange('cidade', e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="estado">Estado *</Label>
              <Input id="estado" value={formData.estado} onChange={(e) => handleChange('estado', e.target.value)} placeholder="UF" required />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="endereco">Endereço Completo</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => handleChange('endereco', e.target.value)}
                placeholder="Rua, número, bairro"
              />
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

            <div className="md:col-span-2">
              <Label htmlFor="pastor_responsavel">Pastor/Líder Responsável</Label>
              <Input
                id="pastor_responsavel"
                value={formData.pastor_responsavel}
                onChange={(e) => handleChange('pastor_responsavel', e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3 pt-2">
              <Checkbox
                id="ativa"
                checked={Boolean(formData.ativa)}
                onCheckedChange={(value) => handleChange('ativa', Boolean(value))}
              />
              <Label htmlFor="ativa" className="cursor-pointer">
                Congregação ativa
              </Label>
            </div>
          </div>
          </fieldset>

          {saveMutation.isError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveMutation.error?.message || 'Erro ao salvar a congregação.'}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {readOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <>
                <Button type="button" variant="outline" onClick={handleSaveDraft}>
                  Rascunho
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
