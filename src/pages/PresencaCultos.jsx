import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Plus, Users, Save, Trash2, UserPlus, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext.jsx';
import { useChurch } from '@/context/ChurchContext.jsx';
import usePermissions from '@/hooks/usePermissions';
import { isArchivedMember } from '@/utils/memberStatus';

export const TIPOS_CULTO = [
  { value: 'culto_domingo', label: 'Culto de Domingo' },
  { value: 'escola_dominical', label: 'Escola Dominical' },
  { value: 'oracao', label: 'Culto de Oração' },
  { value: 'ensino', label: 'Culto de Ensino / Doutrina' },
  { value: 'jovens', label: 'Culto de Jovens' },
  { value: 'senhoras', label: 'Círculo de Oração / Senhoras' },
  { value: 'evangelistico', label: 'Culto Evangelístico' },
  { value: 'ceia', label: 'Santa Ceia' },
  { value: 'vigilia', label: 'Vigília' },
  { value: 'outro', label: 'Outro' },
];

export const tipoCultoLabel = (value) =>
  TIPOS_CULTO.find((t) => t.value === value)?.label || value || 'Culto';

export default function PresencaCultos() {
  const { user } = useAuth();
  const { igrejaAtiva } = useChurch();
  const queryClient = useQueryClient();
  const perms = usePermissions('PresencaCultos');

  const [congregacaoId, setCongregacaoId] = useState('');
  const [cultoId, setCultoId] = useState('');
  const [showNovoCulto, setShowNovoCulto] = useState(false);
  const [novoCulto, setNovoCulto] = useState({
    data_culto: format(new Date(), 'yyyy-MM-dd'),
    tipo_culto: 'culto_domingo',
    hora_inicio: '',
    tema: '',
  });
  const [observacoes, setObservacoes] = useState('');
  const [presentes, setPresentes] = useState({}); // { membroId: rowId | true }
  const [visitantes, setVisitantes] = useState([]); // [{ id?, nome, telefone }]
  const [novoVisitante, setNovoVisitante] = useState({ nome: '', telefone: '' });
  const [busca, setBusca] = useState('');

  const { data: congregacoesRaw = [] } = useQuery({
    queryKey: ['congregacoes'],
    queryFn: () => base44.entities.Congregacao.list('nome'),
    initialData: [],
  });

  const { data: membrosTodos = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  const { data: cultos = [] } = useQuery({
    queryKey: ['cultos', igrejaAtiva?.id],
    queryFn: () => base44.entities.Culto.list('-data_culto'),
    initialData: [],
  });

  const { data: presencasDb = [] } = useQuery({
    queryKey: ['culto_presencas', cultoId],
    queryFn: () => base44.entities.CultoPresenca.list(),
    enabled: !!cultoId,
    initialData: [],
  });

  const congregacoes = useMemo(
    () =>
      (Array.isArray(congregacoesRaw) ? congregacoesRaw : []).filter(
        (c) => !igrejaAtiva || !c.igreja_id || c.igreja_id === igrejaAtiva.id
      ),
    [congregacoesRaw, igrejaAtiva]
  );

  // Membros ativos (fora arquivados) da congregação selecionada
  const membrosDaCongregacao = useMemo(() => {
    if (!congregacaoId) return [];
    return (membrosTodos || [])
      .filter((m) => !isArchivedMember(m))
      .filter((m) => (!igrejaAtiva || !m.igreja_id || m.igreja_id === igrejaAtiva.id))
      .filter((m) => m.congregacao_id === congregacaoId)
      .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'));
  }, [membrosTodos, congregacaoId, igrejaAtiva]);

  const membrosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return membrosDaCongregacao;
    return membrosDaCongregacao.filter((m) => (m.nome_completo || '').toLowerCase().includes(termo));
  }, [membrosDaCongregacao, busca]);

  const cultoAtual = useMemo(() => cultos.find((c) => c.id === cultoId) || null, [cultos, cultoId]);

  const cultosDaCongregacao = useMemo(() => {
    if (!congregacaoId) return [];
    return (cultos || [])
      .filter((c) => c.congregacao_id === congregacaoId)
      .filter((c) => (!igrejaAtiva || !c.igreja_id || c.igreja_id === igrejaAtiva.id))
      .sort((a, b) => (b.data_culto || '').localeCompare(a.data_culto || ''));
  }, [cultos, congregacaoId, igrejaAtiva]);

  // Carrega presenças e visitantes do culto selecionado
  useEffect(() => {
    if (!cultoId) {
      setPresentes({});
      setVisitantes([]);
      setObservacoes('');
      return;
    }
    setObservacoes(cultoAtual?.observacoes || '');
    const mapa = {};
    const visit = [];
    (presencasDb || [])
      .filter((p) => p.culto_id === cultoId)
      .forEach((p) => {
        if (p.membro_id) {
          mapa[p.membro_id] = p.id;
        } else {
          visit.push({ id: p.id, nome: p.nome || '', telefone: p.telefone || '' });
        }
      });
    setPresentes(mapa);
    setVisitantes(visit.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')));
  }, [presencasDb, cultoId, cultoAtual]);

  const criarCultoMutation = useMutation({
    mutationFn: async () => {
      if (!congregacaoId) throw new Error('Selecione a congregação.');
      return base44.entities.Culto.create({
        igreja_id: igrejaAtiva?.id || null,
        congregacao_id: congregacaoId,
        data_culto: novoCulto.data_culto,
        tipo_culto: novoCulto.tipo_culto,
        hora_inicio: novoCulto.hora_inicio || null,
        tema: novoCulto.tema || '',
        responsavel_nome: user?.full_name || '',
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['cultos'] });
      const novoId = Array.isArray(created) ? created[0]?.id : created?.id;
      if (novoId) setCultoId(novoId);
      setShowNovoCulto(false);
      setNovoCulto({ data_culto: format(new Date(), 'yyyy-MM-dd'), tipo_culto: 'culto_domingo', hora_inicio: '', tema: '' });
    },
    onError: (err) => alert('Erro ao criar culto: ' + (err?.message || '')),
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (!cultoId) throw new Error('Selecione um culto.');
      await base44.entities.Culto.update(cultoId, { observacoes });

      const cong = congregacoes.find((c) => c.id === congregacaoId);
      const baseFields = {
        culto_id: cultoId,
        igreja_id: igrejaAtiva?.id || null,
        congregacao_id: congregacaoId || null,
      };

      // Membros: cria linha para quem está marcado presente e não tinha; remove quem foi desmarcado
      const rowsAtuais = (presencasDb || []).filter((p) => p.culto_id === cultoId && p.membro_id);
      const idsPresentes = new Set(Object.keys(presentes));
      for (const membro of membrosDaCongregacao) {
        const jaExiste = rowsAtuais.find((r) => r.membro_id === membro.id);
        const marcado = idsPresentes.has(membro.id);
        if (marcado && !jaExiste) {
          await base44.entities.CultoPresenca.create({
            ...baseFields,
            membro_id: membro.id,
            nome: membro.nome_completo,
            tipo: 'membro',
            presente: true,
          });
        } else if (!marcado && jaExiste) {
          await base44.entities.CultoPresenca.delete(jaExiste.id);
        }
      }

      // Visitantes: cria os novos (sem id) e remove os que foram retirados da lista
      const visitantesDb = (presencasDb || []).filter((p) => p.culto_id === cultoId && !p.membro_id);
      const idsMantidos = new Set(visitantes.filter((v) => v.id).map((v) => v.id));
      for (const antigo of visitantesDb) {
        if (!idsMantidos.has(antigo.id)) {
          await base44.entities.CultoPresenca.delete(antigo.id);
        }
      }
      for (const v of visitantes) {
        if (!v.id && (v.nome || '').trim()) {
          await base44.entities.CultoPresenca.create({
            ...baseFields,
            membro_id: null,
            nome: v.nome.trim(),
            telefone: v.telefone || '',
            tipo: 'visitante',
            presente: true,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['culto_presencas'] });
      queryClient.invalidateQueries({ queryKey: ['cultos'] });
      alert('Presença salva!');
    },
    onError: (err) => alert('Erro ao salvar: ' + (err?.message || '')),
  });

  const deletarCultoMutation = useMutation({
    mutationFn: (id) => base44.entities.Culto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cultos'] });
      setCultoId('');
    },
  });

  const toggleMembro = (membroId) => {
    setPresentes((prev) => {
      const next = { ...prev };
      if (next[membroId]) delete next[membroId];
      else next[membroId] = true;
      return next;
    });
  };

  const marcarTodos = (valor) => {
    if (!valor) {
      // Mantém apenas os que já estão salvos fora da lista filtrada
      setPresentes((prev) => {
        const next = { ...prev };
        membrosFiltrados.forEach((m) => { delete next[m.id]; });
        return next;
      });
      return;
    }
    setPresentes((prev) => {
      const next = { ...prev };
      membrosFiltrados.forEach((m) => { next[m.id] = next[m.id] || true; });
      return next;
    });
  };

  const addVisitante = () => {
    if (!novoVisitante.nome.trim()) return;
    setVisitantes((prev) => [...prev, { nome: novoVisitante.nome.trim(), telefone: novoVisitante.telefone.trim() }]);
    setNovoVisitante({ nome: '', telefone: '' });
  };

  const removeVisitante = (index) => {
    setVisitantes((prev) => prev.filter((_, i) => i !== index));
  };

  const totalMembrosPresentes = Object.keys(presentes).length;
  const congregacaoNome = congregacoes.find((c) => c.id === congregacaoId)?.nome || '';

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CalendarCheck className="w-8 h-8 text-indigo-600" />
            Presença de Cultos
          </h1>
          <p className="text-slate-500 mt-1">
            Lista de presença por culto: marque os membros do cadastro e inclua visitantes.
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle>Seleção</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Congregação *</Label>
              <Select value={congregacaoId} onValueChange={(v) => { setCongregacaoId(v); setCultoId(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a congregação" /></SelectTrigger>
                <SelectContent searchable searchPlaceholder="Buscar congregação...">
                  {congregacoes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Culto</Label>
              <Select value={cultoId} onValueChange={setCultoId} disabled={!congregacaoId}>
                <SelectTrigger><SelectValue placeholder={congregacaoId ? 'Selecione o culto' : 'Escolha a congregação primeiro'} /></SelectTrigger>
                <SelectContent>
                  {cultosDaCongregacao.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {format(new Date(`${c.data_culto}T00:00:00`), 'dd/MM/yyyy')} · {tipoCultoLabel(c.tipo_culto)}{c.tema ? ` — ${c.tema}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {perms.canCreate && (
                <Button
                  onClick={() => setShowNovoCulto(true)}
                  disabled={!congregacaoId}
                  className="bg-gradient-to-r from-indigo-500 to-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" /> Novo culto
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {!congregacaoId && (
          <Card className="border-0 shadow">
            <CardContent className="py-8 text-center text-slate-500">
              Selecione uma congregação para começar.
            </CardContent>
          </Card>
        )}

        {congregacaoId && !cultoId && (
          <Card className="border-0 shadow">
            <CardContent className="py-8 text-center text-slate-500">
              Selecione um culto existente ou crie um novo para lançar a presença.
            </CardContent>
          </Card>
        )}

        {cultoAtual && (
          <>
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Membros de {congregacaoNome}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Marque quem esteve presente. Somente membros desta congregação aparecem aqui.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Buscar membro..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
                  </div>
                  {perms.canEdit && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => marcarTodos(true)}>Marcar todos</Button>
                      <Button size="sm" variant="outline" onClick={() => marcarTodos(false)}>Limpar</Button>
                    </div>
                  )}
                </div>

                {membrosDaCongregacao.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Nenhum membro cadastrado nesta congregação.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {membrosFiltrados.map((m) => {
                      const presente = !!presentes[m.id];
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${presente ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                        >
                          <Checkbox checked={presente} onCheckedChange={() => perms.canEdit && toggleMembro(m.id)} disabled={!perms.canEdit} />
                          <span className="font-medium text-slate-900">{m.nome_completo}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-sm text-slate-600">
                  Membros presentes: <strong>{totalMembrosPresentes}</strong> de {membrosDaCongregacao.length}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Visitantes (fora do cadastro)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Inclua quem não está no cadastro de membros. O telefone ajuda no acompanhamento.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {perms.canEdit && (
                  <div className="grid sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-6">
                      <Label className="text-xs">Nome do visitante</Label>
                      <Input
                        value={novoVisitante.nome}
                        onChange={(e) => setNovoVisitante({ ...novoVisitante, nome: e.target.value })}
                        placeholder="Nome completo"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVisitante(); } }}
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Label className="text-xs">Telefone (opcional)</Label>
                      <Input
                        value={novoVisitante.telefone}
                        onChange={(e) => setNovoVisitante({ ...novoVisitante, telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVisitante(); } }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button onClick={addVisitante} className="w-full bg-gradient-to-r from-indigo-500 to-blue-600">
                        <Plus className="w-4 h-4 mr-1" /> Incluir
                      </Button>
                    </div>
                  </div>
                )}

                {visitantes.length === 0 ? (
                  <p className="text-slate-500 text-center py-3 text-sm">Nenhum visitante incluído.</p>
                ) : (
                  <div className="space-y-2">
                    {visitantes.map((v, idx) => (
                      <div key={v.id || `novo-${idx}`} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50">
                        <div>
                          <p className="font-medium text-slate-900">{v.nome}</p>
                          {v.telefone && <p className="text-xs text-slate-500">{v.telefone}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700">Visitante</Badge>
                          {perms.canEdit && (
                            <Button size="icon" variant="ghost" onClick={() => removeVisitante(idx)}>
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-slate-600">Total de visitantes: <strong>{visitantes.length}</strong></p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>
                  {format(new Date(`${cultoAtual.data_culto}T00:00:00`), 'dd/MM/yyyy')} · {tipoCultoLabel(cultoAtual.tipo_culto)}
                  {cultoAtual.tema ? ` — ${cultoAtual.tema}` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Observações do culto</Label>
                  <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={!perms.canEdit} />
                </div>
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  {perms.canDelete && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (window.confirm('Excluir este culto e toda a sua lista de presença?')) {
                          deletarCultoMutation.mutate(cultoId);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2 text-red-500" /> Excluir culto
                    </Button>
                  )}
                  {perms.canEdit && (
                    <Button
                      onClick={() => salvarMutation.mutate()}
                      disabled={salvarMutation.isPending}
                      className="bg-gradient-to-r from-green-500 to-blue-600 ml-auto"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {salvarMutation.isPending ? 'Salvando...' : 'Salvar presença'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={showNovoCulto} onOpenChange={setShowNovoCulto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo culto</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={novoCulto.data_culto} onChange={(e) => setNovoCulto({ ...novoCulto, data_culto: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de culto *</Label>
              <Select value={novoCulto.tipo_culto} onValueChange={(v) => setNovoCulto({ ...novoCulto, tipo_culto: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_CULTO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hora de início</Label>
              <Input type="time" value={novoCulto.hora_inicio} onChange={(e) => setNovoCulto({ ...novoCulto, hora_inicio: e.target.value })} />
            </div>
            <div>
              <Label>Tema / Pregador (opcional)</Label>
              <Input value={novoCulto.tema} onChange={(e) => setNovoCulto({ ...novoCulto, tema: e.target.value })} placeholder="Ex.: Culto da Família" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNovoCulto(false)}>Cancelar</Button>
              <Button onClick={() => criarCultoMutation.mutate()} disabled={criarCultoMutation.isPending} className="bg-gradient-to-r from-indigo-500 to-blue-600">
                {criarCultoMutation.isPending ? 'Criando...' : 'Criar culto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
