import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus, Users, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext.jsx';
import { useChurch } from '@/context/ChurchContext.jsx';
import usePermissions from '@/hooks/usePermissions';

export default function PresencaSetores() {
  const { user } = useAuth();
  const { igrejaAtiva } = useChurch();
  const queryClient = useQueryClient();
  const perms = usePermissions('PresencaSetores');

  const [departamentoId, setDepartamentoId] = useState('');
  const [reuniaoId, setReuniaoId] = useState('');
  const [showNovaReuniao, setShowNovaReuniao] = useState(false);
  const [novaReuniao, setNovaReuniao] = useState({
    data_reuniao: format(new Date(), 'yyyy-MM-dd'),
    hora_inicio: '',
    tema: '',
  });
  const [observacoes, setObservacoes] = useState('');
  const [presencas, setPresencas] = useState({}); // { membroId: { presente, justificativa } }

  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => base44.entities.Departamento.list('nome'),
    initialData: [],
  });

  const { data: membros = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  const { data: reunioes = [] } = useQuery({
    queryKey: ['setor_reunioes', igrejaAtiva?.id],
    queryFn: () => base44.entities.SetorReuniao.list('-data_reuniao'),
    initialData: [],
  });

  const { data: presencasDb = [] } = useQuery({
    queryKey: ['setor_presencas', reuniaoId],
    queryFn: () => base44.entities.SetorPresenca.list(),
    enabled: !!reuniaoId,
    initialData: [],
  });

  const departamentosFiltrados = useMemo(
    () => (departamentos || []).filter((d) => !igrejaAtiva || !d.igreja_id || d.igreja_id === igrejaAtiva.id),
    [departamentos, igrejaAtiva]
  );

  const reuniaoAtual = useMemo(() => reunioes.find((r) => r.id === reuniaoId) || null, [reunioes, reuniaoId]);

  const reunioesDoDepartamento = useMemo(() => {
    if (!departamentoId) return [];
    return (reunioes || [])
      .filter((r) => r.departamento_id === departamentoId)
      .sort((a, b) => (b.data_reuniao || '').localeCompare(a.data_reuniao || ''));
  }, [reunioes, departamentoId]);

  const membrosDoDepartamento = useMemo(() => {
    if (!departamentoId) return [];
    return membros
      .filter((m) => {
        const ids = Array.isArray(m.departamentos_ids) ? m.departamentos_ids : (m.departamento_id ? [m.departamento_id] : []);
        return ids.includes(departamentoId);
      })
      .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'));
  }, [membros, departamentoId]);

  useEffect(() => {
    if (!reuniaoAtual) {
      setObservacoes('');
      setPresencas({});
      return;
    }
    setObservacoes(reuniaoAtual.observacoes || '');
  }, [reuniaoAtual]);

  useEffect(() => {
    if (!reuniaoId) return;
    const map = {};
    (presencasDb || [])
      .filter((p) => p.reuniao_id === reuniaoId && p.membro_id)
      .forEach((p) => {
        map[p.membro_id] = { presente: p.presente !== false, justificativa: p.justificativa || '', id: p.id };
      });
    setPresencas(map);
  }, [presencasDb, reuniaoId]);

  const criarReuniaoMutation = useMutation({
    mutationFn: async () => {
      if (!departamentoId) throw new Error('Selecione um departamento.');
      const dep = departamentos.find((d) => d.id === departamentoId);
      return base44.entities.SetorReuniao.create({
        igreja_id: igrejaAtiva?.id || dep?.igreja_id || null,
        departamento_id: departamentoId,
        departamento_nome: dep?.nome || '',
        data_reuniao: novaReuniao.data_reuniao,
        hora_inicio: novaReuniao.hora_inicio || null,
        tema: novaReuniao.tema || '',
        responsavel_nome: user?.full_name || '',
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['setor_reunioes'] });
      const novoId = Array.isArray(created) ? created[0]?.id : created?.id;
      if (novoId) setReuniaoId(novoId);
      setShowNovaReuniao(false);
      setNovaReuniao({ data_reuniao: format(new Date(), 'yyyy-MM-dd'), hora_inicio: '', tema: '' });
    },
    onError: (err) => alert('Erro ao criar reunião: ' + (err?.message || '')),
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (!reuniaoId) throw new Error('Selecione uma reunião.');
      await base44.entities.SetorReuniao.update(reuniaoId, { observacoes });
      for (const membro of membrosDoDepartamento) {
        const atual = presencas[membro.id];
        const presenca = atual || { presente: true, justificativa: '' };
        if (atual?.id) {
          await base44.entities.SetorPresenca.update(atual.id, {
            presente: presenca.presente,
            justificativa: presenca.justificativa || '',
          });
        } else {
          await base44.entities.SetorPresenca.create({
            reuniao_id: reuniaoId,
            membro_id: membro.id,
            membro_nome: membro.nome_completo,
            presente: presenca.presente,
            justificativa: presenca.justificativa || '',
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setor_presencas'] });
      queryClient.invalidateQueries({ queryKey: ['setor_reunioes'] });
      alert('Presença salva!');
    },
    onError: (err) => alert('Erro ao salvar: ' + (err?.message || '')),
  });

  const deletarReuniaoMutation = useMutation({
    mutationFn: (id) => base44.entities.SetorReuniao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setor_reunioes'] });
      setReuniaoId('');
    },
  });

  const togglePresente = (membroId) => {
    setPresencas((prev) => {
      const atual = prev[membroId] || { presente: true, justificativa: '' };
      return { ...prev, [membroId]: { ...atual, presente: !atual.presente } };
    });
  };

  const setJustificativa = (membroId, texto) => {
    setPresencas((prev) => {
      const atual = prev[membroId] || { presente: false, justificativa: '' };
      return { ...prev, [membroId]: { ...atual, justificativa: texto } };
    });
  };

  const presentesCount = membrosDoDepartamento.filter((m) => presencas[m.id]?.presente !== false && presencas[m.id]?.presente !== undefined).length;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-teal-600" />
            Presença de Setores
          </h1>
          <p className="text-slate-500 mt-1">
            Lista de presença para reuniões de departamentos/setores já cadastrados.
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle>Seleção</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Departamento / Setor *</Label>
              <Select value={departamentoId} onValueChange={(v) => { setDepartamentoId(v); setReuniaoId(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {departamentosFiltrados.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reunião</Label>
              <Select value={reuniaoId} onValueChange={setReuniaoId} disabled={!departamentoId}>
                <SelectTrigger><SelectValue placeholder={departamentoId ? 'Selecione' : 'Escolha o setor primeiro'} /></SelectTrigger>
                <SelectContent>
                  {reunioesDoDepartamento.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {format(new Date(`${r.data_reuniao}T00:00:00`), 'dd/MM/yyyy')}{r.tema ? ` · ${r.tema}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {perms.canCreate && (
                <Button
                  onClick={() => setShowNovaReuniao(true)}
                  disabled={!departamentoId}
                  className="bg-gradient-to-r from-teal-500 to-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" /> Nova reunião
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {departamentoId && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Membros do setor
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Só aparece aqui quem está vinculado ao departamento no cadastro de membros.
              </p>
            </CardHeader>
            <CardContent>
              {membrosDoDepartamento.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Nenhum membro vinculado ao setor.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {membrosDoDepartamento.map((m) => {
                      const estado = presencas[m.id];
                      const presente = estado?.presente === true;
                      const ausente = estado && estado.presente === false;
                      return (
                        <div key={m.id} className={`grid md:grid-cols-12 gap-2 items-center p-3 rounded-lg border ${presente ? 'bg-green-50 border-green-200' : ausente ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                          <div className="md:col-span-5">
                            <p className="font-medium text-slate-900">{m.nome_completo}</p>
                            {m.congregacao_nome && <p className="text-xs text-slate-500">{m.congregacao_nome}</p>}
                          </div>
                          <div className="md:col-span-3 flex gap-2">
                            <Button
                              size="sm"
                              variant={presente ? 'default' : 'outline'}
                              className={presente ? 'bg-green-600 hover:bg-green-700' : ''}
                              disabled={!reuniaoId}
                              onClick={() => setPresencas((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), presente: true } }))}
                            >
                              Presente
                            </Button>
                            <Button
                              size="sm"
                              variant={ausente ? 'default' : 'outline'}
                              className={ausente ? 'bg-red-600 hover:bg-red-700' : ''}
                              disabled={!reuniaoId}
                              onClick={() => setPresencas((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), presente: false } }))}
                            >
                              Ausente
                            </Button>
                          </div>
                          <div className="md:col-span-4">
                            <Input
                              placeholder="Justificativa (se ausente)"
                              value={estado?.justificativa || ''}
                              onChange={(e) => setJustificativa(m.id, e.target.value)}
                              disabled={!reuniaoId}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {reuniaoId && (
                    <p className="text-sm text-slate-600 mt-4">
                      Presentes marcados: <strong>{presentesCount}</strong> de {membrosDoDepartamento.length}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {reuniaoAtual && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>
                Reunião {format(new Date(`${reuniaoAtual.data_reuniao}T00:00:00`), 'dd/MM/yyyy')}
                {reuniaoAtual.tema ? ` · ${reuniaoAtual.tema}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Observações da reunião</Label>
                <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </div>
              <div className="flex justify-between items-center gap-2 flex-wrap">
                {perms.canDelete && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('Excluir esta reunião e toda a lista de presença?')) {
                        deletarReuniaoMutation.mutate(reuniaoId);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2 text-red-500" /> Excluir reunião
                  </Button>
                )}
                {perms.canEdit && (
                  <Button
                    onClick={() => salvarMutation.mutate()}
                    disabled={salvarMutation.isPending}
                    className="bg-gradient-to-r from-green-500 to-blue-600 ml-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {salvarMutation.isPending ? 'Salvando...' : 'Salvar presenças'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showNovaReuniao} onOpenChange={setShowNovaReuniao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova reunião</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={novaReuniao.data_reuniao}
                onChange={(e) => setNovaReuniao({ ...novaReuniao, data_reuniao: e.target.value })}
              />
            </div>
            <div>
              <Label>Hora de início</Label>
              <Input
                type="time"
                value={novaReuniao.hora_inicio}
                onChange={(e) => setNovaReuniao({ ...novaReuniao, hora_inicio: e.target.value })}
              />
            </div>
            <div>
              <Label>Tema / Assunto</Label>
              <Input
                value={novaReuniao.tema}
                onChange={(e) => setNovaReuniao({ ...novaReuniao, tema: e.target.value })}
                placeholder="Ex.: Planejamento do mês"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNovaReuniao(false)}>Cancelar</Button>
              <Button
                onClick={() => criarReuniaoMutation.mutate()}
                disabled={criarReuniaoMutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600"
              >
                {criarReuniaoMutation.isPending ? 'Criando...' : 'Criar reunião'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
