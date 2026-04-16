import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Plus, Search, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import usePermissions from '@/hooks/usePermissions';
import { useChurch } from '@/context/ChurchContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

const TIPOS = [
  { value: 'dizimo', label: 'Dízimo', color: 'bg-blue-100 text-blue-700' },
  { value: 'oferta', label: 'Oferta', color: 'bg-green-100 text-green-700' },
  { value: 'voto', label: 'Voto', color: 'bg-purple-100 text-purple-700' },
  { value: 'entrada', label: 'Entrada (outros)', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'saida', label: 'Saída', color: 'bg-orange-100 text-orange-700' },
  { value: 'despesa', label: 'Despesa', color: 'bg-red-100 text-red-700' },
];

const defaultForm = {
  tipo: 'dizimo',
  categoria: '',
  descricao: '',
  valor: '',
  data_lancamento: format(new Date(), 'yyyy-MM-dd'),
  membro_id: '',
  forma_pagamento: 'dinheiro',
  observacoes: '',
};

function formatCurrency(value) {
  const v = Number(value || 0);
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function TesourariaLancamentos() {
  const { user } = useAuth();
  const { igrejaAtiva } = useChurch();
  const queryClient = useQueryClient();
  const perms = usePermissions('TesourariaLancamentos');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'));

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['lancamentos', igrejaAtiva?.id],
    queryFn: () => base44.entities.LancamentoFinanceiro.list('-data_lancamento'),
    initialData: [],
  });

  const { data: membros = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editing?.id) return base44.entities.LancamentoFinanceiro.update(editing.id, payload);
      return base44.entities.LancamentoFinanceiro.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
      setShowModal(false);
      setForm(defaultForm);
      setEditing(null);
    },
    onError: (err) => alert('Erro ao salvar lançamento: ' + (err?.message || '')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LancamentoFinanceiro.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lancamentos'] }),
  });

  const filtrados = useMemo(() => {
    const list = Array.isArray(lancamentos) ? lancamentos : [];
    return list.filter((l) => {
      if (igrejaAtiva && l.igreja_id && l.igreja_id !== igrejaAtiva.id) return false;
      if (mes) {
        const m = (l.data_lancamento || '').slice(0, 7);
        if (m !== mes) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase();
        const inNome = (l.membro_nome || '').toLowerCase().includes(s);
        const inDesc = (l.descricao || '').toLowerCase().includes(s);
        if (!inNome && !inDesc) return false;
      }
      return true;
    });
  }, [lancamentos, mes, search, igrejaAtiva]);

  const totaisPorTipo = useMemo(() => {
    return filtrados.reduce((acc, l) => {
      acc[l.tipo] = (acc[l.tipo] || 0) + Number(l.valor || 0);
      return acc;
    }, {});
  }, [filtrados]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaultForm, data_lancamento: format(new Date(), 'yyyy-MM-dd') });
    setShowModal(true);
  };

  const openEdit = (l) => {
    setEditing(l);
    setForm({
      tipo: l.tipo || 'dizimo',
      categoria: l.categoria || '',
      descricao: l.descricao || '',
      valor: l.valor || '',
      data_lancamento: l.data_lancamento || format(new Date(), 'yyyy-MM-dd'),
      membro_id: l.membro_id || '',
      forma_pagamento: l.forma_pagamento || 'dinheiro',
      observacoes: l.observacoes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const valor = Number(String(form.valor).replace(',', '.'));
    if (!valor || valor <= 0) {
      alert('Informe um valor válido.');
      return;
    }
    const membro = membros.find((m) => m.id === form.membro_id);
    const payload = {
      ...form,
      valor,
      igreja_id: igrejaAtiva?.id || null,
      congregacao_id: membro?.congregacao_id || null,
      membro_id: form.membro_id || null,
      membro_nome: membro?.nome_completo || '',
      responsavel_id: user?.id || null,
      responsavel_nome: user?.full_name || '',
    };
    saveMutation.mutate(payload);
  };

  const tipoLabel = (tipo) => TIPOS.find((t) => t.value === tipo)?.label || tipo;
  const tipoColor = (tipo) => TIPOS.find((t) => t.value === tipo)?.color || '';

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              Lançamentos Financeiros
            </h1>
            <p className="text-slate-500 mt-1">Registre dízimos, ofertas, votos e demais entradas/saídas.</p>
          </div>
          {perms.canCreate && (
            <Button onClick={openCreate} className="bg-gradient-to-r from-green-500 to-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Novo lançamento
            </Button>
          )}
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por membro ou descrição"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <Label className="text-xs">Mês/Ano</Label>
                <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => { setSearch(''); setMes(format(new Date(), 'yyyy-MM')); }}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {TIPOS.map((t) => (
            <Card key={t.value} className="border-0 shadow">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">{t.label}</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totaisPorTipo[t.value] || 0)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-8 text-center text-slate-500">Carregando...</div>
            ) : filtrados.length === 0 ? (
              <div className="py-8 text-center text-slate-500">Nenhum lançamento encontrado neste período.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Membro</TableHead>
                    <TableHead>Valor</TableHead>
                    {(perms.canEdit || perms.canDelete) && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.data_lancamento ? format(new Date(`${l.data_lancamento}T00:00:00`), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell><Badge className={tipoColor(l.tipo)}>{tipoLabel(l.tipo)}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate">{l.descricao || '-'}</TableCell>
                      <TableCell>{l.membro_nome || '—'}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(l.valor)}</TableCell>
                      {(perms.canEdit || perms.canDelete) && (
                        <TableCell className="text-right space-x-1">
                          {perms.canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {perms.canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (window.confirm('Excluir este lançamento?')) deleteMutation.mutate(l.id);
                            }}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      )}
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
            <DialogTitle>{editing ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.data_lancamento} onChange={(e) => setForm({ ...form, data_lancamento: e.target.value })} required />
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.tipo === 'dizimo' || form.tipo === 'oferta' || form.tipo === 'voto') && (
              <div className="md:col-span-2">
                <Label>Membro (dizimista / ofertante)</Label>
                <Select value={form.membro_id || ''} onValueChange={(v) => setForm({ ...form, membro_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem vínculo</SelectItem>
                    {membros.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome_completo}{m.congregacao_nome ? ` · ${m.congregacao_nome}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Puxa dados direto do cadastro de membros.
                </p>
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Descrição / Categoria</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Oferta do culto domingo" />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-gradient-to-r from-green-500 to-blue-600">
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
