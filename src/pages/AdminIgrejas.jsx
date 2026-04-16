import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Church, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useChurch, MODULOS } from '@/context/ChurchContext.jsx';

const emptyForm = {
  nome: '',
  cidade: '',
  estado: '',
  cnpj: '',
  telefone: '',
  email: '',
  endereco: '',
  cep: '',
  pastor_responsavel: '',
  ativa: true,
};

export default function AdminIgrejas() {
  const { isSuperAdmin, refresh } = useChurch();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: igrejas = [], isLoading } = useQuery({
    queryKey: ['igrejas'],
    queryFn: () => base44.entities.Igreja.list('nome'),
    initialData: [],
    enabled: isSuperAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editing?.id) {
        return base44.entities.Igreja.update(editing.id, payload);
      }
      const created = await base44.entities.Igreja.create(payload);
      const createdRecord = Array.isArray(created) ? created[0] : created;
      // Ativa todos os módulos por padrão para a nova igreja
      if (createdRecord?.id) {
        await Promise.all(
          MODULOS.map((m) =>
            base44.entities.IgrejaModulo.create({
              igreja_id: createdRecord.id,
              modulo: m.key,
              ativo: true,
            }).catch(() => null)
          )
        );
      }
      return createdRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['igrejas'] });
      refresh();
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (err) => alert('Erro ao salvar igreja: ' + (err?.message || '')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativa }) => base44.entities.Igreja.update(id, { ativa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['igrejas'] });
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Igreja.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['igrejas'] });
      refresh();
    },
    onError: (err) => alert('Erro ao excluir: ' + (err?.message || '')),
  });

  if (!isSuperAdmin) {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (igreja) => {
    setEditing(igreja);
    setForm({ ...emptyForm, ...igreja });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome?.trim()) {
      alert('Informe o nome da igreja.');
      return;
    }
    saveMutation.mutate({
      ...form,
      nome: form.nome.trim(),
    });
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Church className="w-8 h-8 text-blue-600" />
              Igrejas cadastradas
            </h1>
            <p className="text-slate-500 mt-1">
              Controle central das igrejas que utilizam o sistema.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-blue-500 to-purple-600">
            <Plus className="w-4 h-4 mr-2" /> Nova Igreja
          </Button>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Igrejas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-500">Carregando...</div>
            ) : igrejas.length === 0 ? (
              <div className="py-8 text-center text-slate-500">Nenhuma igreja cadastrada.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Pastor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {igrejas.map((igreja) => (
                    <TableRow key={igreja.id}>
                      <TableCell className="font-semibold">{igreja.nome}</TableCell>
                      <TableCell>
                        {igreja.cidade ? `${igreja.cidade}${igreja.estado ? ' / ' + igreja.estado : ''}` : '—'}
                      </TableCell>
                      <TableCell>{igreja.pastor_responsavel || '—'}</TableCell>
                      <TableCell>
                        {igreja.ativa ? (
                          <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Inativa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={igreja.ativa ? 'Desativar' : 'Ativar'}
                          onClick={() => toggleMutation.mutate({ id: igreja.id, ativa: !igreja.ativa })}
                        >
                          {igreja.ativa ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(igreja)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          onClick={() => {
                            if (window.confirm('Excluir igreja? Essa ação remove dados vinculados em cascata.')) {
                              deleteMutation.mutate(igreja.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar igreja' : 'Nova igreja'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            </div>
            <div>
              <Label>Pastor responsável</Label>
              <Input value={form.pastor_responsavel} onChange={(e) => setForm({ ...form, pastor_responsavel: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-gradient-to-r from-blue-500 to-purple-600">
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
