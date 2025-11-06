import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ModalCongregacao({ congregacao, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(
    congregacao || {
      nome: '',
      cidade: '',
      estado: '',
      endereco: '',
      telefone: '',
      email: '',
      pastor_responsavel: '',
      ativa: true,
    }
  );

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (congregacao) {
        return base44.entities.Congregacao.update(congregacao.id, data);
      }
      return base44.entities.Congregacao.create(data);
    },
    onSuccess: () => {
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {congregacao ? 'Editar Congregação' : 'Nova Congregação'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
