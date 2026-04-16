import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Plus, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import usePermissions from '@/hooks/usePermissions';
import { useChurch } from '@/context/ChurchContext.jsx';

const defaultForm = {
  tipo: 'entrada',
  categoria: '',
  descricao: '',
  valor: '',
  data_lancamento: format(new Date(), 'yyyy-MM-dd'),
  classe_id: '',
  observacoes: '',
};

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function EbdCaixa() {
  const { igrejaAtiva } = useChurch();
  const queryClient = useQueryClient();
  const perms = usePermissions('EbdCaixa');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'));

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['ebd_financeiro', igrejaAtiva?.id],
    queryFn: () => base44.entities.EbdFinanceiro.list('-data_lancamento'),
    initialData: [],
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['ebd_classes', igrejaAtiva?.id],
    queryFn: () => base44.entities.EbdClasse.list('nome'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => base44.entities.EbdFinanceiro.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ebd_financeiro'] });
      setShowModal(false);
      setForm(defaultForm);
    },
    onError: (err) => alert('Erro ao salvar: ' + (err?.message || '')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EbdFinanceiro.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ebd_financeiro'] }),
  });

  const filtrados = useMemo(() => {
    return (lancamentos || []).filter((l) => {
      if (igrejaAtiva && l.igreja_id && l.igreja_id !== igrejaAtiva.id) return false;
      if (!l.data_lancamento) return false;
      return (l.data_lancamento || '').slice(0, 7) === mes;
    });
  }, [lancamentos, mes, igrejaAtiva]);

  const totalEntradas = filtrados.filter((l) => l.tipo === 'entrada').reduce((a, l) => a + Number(l.valor || 0), 0);
  const totalSaidas = filtrados.filter((l) => l.tipo === 'saida').reduce((a, l) => a + Number(l.valor || 0), 0);
  const saldo = totalEntradas - totalSaidas;

  const classeNome = (id) => classes.find((c) => c.id === id)?.nome || '-';

  const handleSubmit = (e) => {
    e.preventDefault();
    const valor = Number(String(form.valor).replace(',', '.'));
    if (!valor || valor <= 0) {
      alert('Informe um valor válido.');
      return;
    }
    saveMutation.mutate({
      ...form,
      valor,
      igreja_id: igrejaAtiva?.id || null,
      classe_id: form.classe_id || null,
    });
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-green-600" />
              Caixa da EBD
            </h1>
            <p className="text-slate-500 mt-1">
              Controle de entradas e saídas específico do setor EBD. Ofertas de aulas entram aqui automaticamente.
            </p>
          </div>
          {perms.canCreate && (
            <Button onClick={() => { setForm(defaultForm); setShowModal(true); }} className="bg-gradient-to-r from-green-500 to-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Novo lançamento
            </Button>
          )}
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle>Filtro</CardTitle></CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label>Mês</Label>
              <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Entradas</p>
                <p className="text-2xl font-bold text-slate-900">{money(totalEntradas)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-orange-50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <ArrowDownCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Saídas</p>
                <p className="text-2xl font-bold text-slate-900">{money(totalSaidas)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-md ${saldo >= 0 ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-gradient-to-br from-red-100 to-orange-100'}`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${saldo >= 0 ? 'bg-blue-100' : 'bg-red-200'}`}>
                <Wallet className={`w-5 h-5 ${saldo >= 0 ? 'text-blue-600' : 'text-red-700'}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Saldo do mês</p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-slate-900' : 'text-red-700'}`}>{money(saldo)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle>Lançamentos do mês</CardTitle></CardHeader>
          <CardContent className="p-0">
            {filtrados.length === 0 ? (
              <div className="py-8 text-center text-slate-500">Nenhum lançamento no período.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    {perms.canDelete && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.data_lancamento ? format(new Date(`${l.data_lancamento}T00:00:00`), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>
                        <Badge className={l.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>{classeNome(l.classe_id)}</TableCell>
                      <TableCell className="max-w-xs truncate">{l.descricao || l.categoria || '-'}</TableCell>
                      <TableCell className={`text-right font-semibold ${l.tipo === 'entrada' ? 'text-green-700' : 'text-red-700'}`}>
                        {money(l.valor)}
                      </TableCell>
                      {perms.canDelete && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (window.confirm('Excluir este lançamento?')) deleteMutation.mutate(l.id);
                          }}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo lançamento · Caixa EBD</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.data_lancamento}
                onChange={(e) => setForm({ ...form, data_lancamento: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Classe (opcional)</Label>
              <Select value={form.classe_id || ''} onValueChange={(v) => setForm({ ...form, classe_id: v })}>
                <SelectTrigger><SelectValue placeholder="Setor EBD geral" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Setor EBD (geral)</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: Compra de revistas"
              />
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
