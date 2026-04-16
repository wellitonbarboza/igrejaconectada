import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Save, Users, Book, DollarSign, UserPlus, Trash2, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import usePermissions from '@/hooks/usePermissions';
import { useChurch } from '@/context/ChurchContext.jsx';

export default function EbdAulas() {
  const { igrejaAtiva } = useChurch();
  const queryClient = useQueryClient();
  const perms = usePermissions('EbdAulas');

  const [classeId, setClasseId] = useState('');
  const [aulaId, setAulaId] = useState('');
  const [showNovaAula, setShowNovaAula] = useState(false);
  const [novaAula, setNovaAula] = useState({
    data_aula: format(new Date(), 'yyyy-MM-dd'),
    tema: '',
  });

  // Dados da aula atual
  const [revistas, setRevistas] = useState(0);
  const [biblias, setBiblias] = useState(0);
  const [oferta, setOferta] = useState(0);
  const [visitantes, setVisitantes] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Presenças em memória: { [membroId]: boolean }
  const [presencas, setPresencas] = useState({});
  const [visitanteNome, setVisitanteNome] = useState('');

  const { data: classes = [] } = useQuery({
    queryKey: ['ebd_classes', igrejaAtiva?.id],
    queryFn: () => base44.entities.EbdClasse.list('nome'),
    initialData: [],
  });

  const { data: matriculas = [] } = useQuery({
    queryKey: ['ebd_matriculas'],
    queryFn: () => base44.entities.EbdMatricula.list(),
    initialData: [],
  });

  const { data: membros = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  const { data: aulas = [] } = useQuery({
    queryKey: ['ebd_aulas', igrejaAtiva?.id],
    queryFn: () => base44.entities.EbdAula.list('-data_aula'),
    initialData: [],
  });

  const { data: presencasDb = [] } = useQuery({
    queryKey: ['ebd_presencas', aulaId],
    queryFn: () => base44.entities.EbdPresenca.list(),
    enabled: !!aulaId,
    initialData: [],
  });

  const classesFiltradas = useMemo(
    () => (classes || []).filter((c) => !igrejaAtiva || !c.igreja_id || c.igreja_id === igrejaAtiva.id),
    [classes, igrejaAtiva]
  );

  const aulasDaClasse = useMemo(() => {
    if (!classeId) return [];
    return (aulas || [])
      .filter((a) => a.classe_id === classeId)
      .sort((a, b) => (b.data_aula || '').localeCompare(a.data_aula || ''));
  }, [aulas, classeId]);

  const matriculasDaClasse = useMemo(() => {
    if (!classeId) return [];
    const ativos = matriculas.filter((m) => m.classe_id === classeId && m.ativo !== false);
    const list = ativos
      .map((m) => {
        const membro = membros.find((x) => x.id === m.membro_id);
        return membro ? { ...membro, matricula_id: m.id } : null;
      })
      .filter(Boolean);
    return list.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'));
  }, [classeId, matriculas, membros]);

  const aulaAtual = useMemo(() => aulas.find((a) => a.id === aulaId) || null, [aulas, aulaId]);

  // Ao selecionar uma aula já existente, hidrata os contadores e presenças
  useEffect(() => {
    if (!aulaAtual) {
      setRevistas(0);
      setBiblias(0);
      setOferta(0);
      setVisitantes(0);
      setObservacoes('');
      setPresencas({});
      return;
    }
    setRevistas(aulaAtual.revistas || 0);
    setBiblias(aulaAtual.biblias || 0);
    setOferta(aulaAtual.oferta || 0);
    setVisitantes(aulaAtual.visitantes || 0);
    setObservacoes(aulaAtual.observacoes || '');
  }, [aulaAtual]);

  useEffect(() => {
    if (!aulaId) return;
    const map = {};
    (presencasDb || [])
      .filter((p) => p.aula_id === aulaId && p.membro_id)
      .forEach((p) => { map[p.membro_id] = p.presente !== false; });
    setPresencas(map);
  }, [presencasDb, aulaId]);

  const visitantesRegistrados = useMemo(
    () => (presencasDb || []).filter((p) => p.aula_id === aulaId && p.visitante),
    [presencasDb, aulaId]
  );

  // Mutations
  const criarAulaMutation = useMutation({
    mutationFn: async () => {
      if (!classeId) throw new Error('Selecione uma classe primeiro.');
      const classe = classes.find((c) => c.id === classeId);
      return base44.entities.EbdAula.create({
        igreja_id: igrejaAtiva?.id || classe?.igreja_id || null,
        classe_id: classeId,
        data_aula: novaAula.data_aula,
        tema: novaAula.tema || '',
        revistas: 0,
        biblias: 0,
        oferta: 0,
        visitantes: 0,
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['ebd_aulas'] });
      setShowNovaAula(false);
      setNovaAula({ data_aula: format(new Date(), 'yyyy-MM-dd'), tema: '' });
      const novoId = Array.isArray(created) ? created[0]?.id : created?.id;
      if (novoId) setAulaId(novoId);
    },
    onError: (err) => alert('Erro ao criar aula: ' + (err?.message || '')),
  });

  const salvarAulaMutation = useMutation({
    mutationFn: async () => {
      if (!aulaId) throw new Error('Selecione uma aula.');
      // Atualiza contadores da aula
      await base44.entities.EbdAula.update(aulaId, {
        revistas: Number(revistas || 0),
        biblias: Number(biblias || 0),
        oferta: Number(oferta || 0),
        visitantes: Number(visitantes || 0),
        observacoes,
      });

      // Reconcilia presenças dos matriculados
      const existentes = (presencasDb || []).filter((p) => p.aula_id === aulaId && p.membro_id);
      const existentesMap = {};
      existentes.forEach((p) => { existentesMap[p.membro_id] = p; });

      for (const membro of matriculasDaClasse) {
        const presente = !!presencas[membro.id];
        const existente = existentesMap[membro.id];
        if (existente) {
          if ((existente.presente !== false) !== presente) {
            await base44.entities.EbdPresenca.update(existente.id, { presente });
          }
        } else {
          await base44.entities.EbdPresenca.create({
            aula_id: aulaId,
            membro_id: membro.id,
            membro_nome: membro.nome_completo,
            presente,
            visitante: false,
          });
        }
      }

      // Registra oferta da aula no caixa da EBD (se houver valor)
      if (Number(oferta || 0) > 0) {
        const classe = classes.find((c) => c.id === classeId);
        await base44.entities.EbdFinanceiro.create({
          igreja_id: igrejaAtiva?.id || classe?.igreja_id || null,
          classe_id: classeId,
          tipo: 'entrada',
          categoria: 'oferta_aula',
          descricao: `Oferta aula EBD · ${classe?.nome || ''}`,
          valor: Number(oferta || 0),
          data_lancamento: aulaAtual?.data_aula || format(new Date(), 'yyyy-MM-dd'),
          aula_id: aulaId,
        }).catch(() => null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ebd_aulas'] });
      queryClient.invalidateQueries({ queryKey: ['ebd_presencas'] });
      alert('Aula salva com sucesso!');
    },
    onError: (err) => alert('Erro ao salvar aula: ' + (err?.message || '')),
  });

  const adicionarVisitanteMutation = useMutation({
    mutationFn: async (nome) => {
      if (!aulaId) throw new Error('Selecione uma aula.');
      if (!nome.trim()) throw new Error('Informe o nome do visitante.');
      await base44.entities.EbdPresenca.create({
        aula_id: aulaId,
        membro_id: null,
        membro_nome: nome.trim(),
        presente: true,
        visitante: true,
      });
      // Atualiza contador da aula
      await base44.entities.EbdAula.update(aulaId, {
        visitantes: Number(visitantes || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ebd_presencas'] });
      queryClient.invalidateQueries({ queryKey: ['ebd_aulas'] });
      setVisitantes((v) => Number(v || 0) + 1);
      setVisitanteNome('');
    },
    onError: (err) => alert(err?.message || 'Erro ao adicionar visitante.'),
  });

  const removerVisitanteMutation = useMutation({
    mutationFn: async (presencaId) => {
      await base44.entities.EbdPresenca.delete(presencaId);
      const novoTotal = Math.max(0, Number(visitantes || 0) - 1);
      await base44.entities.EbdAula.update(aulaId, { visitantes: novoTotal });
      setVisitantes(novoTotal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ebd_presencas'] });
      queryClient.invalidateQueries({ queryKey: ['ebd_aulas'] });
    },
  });

  const matricularMutation = useMutation({
    mutationFn: async (membroId) => {
      if (!classeId) throw new Error('Selecione uma classe.');
      const membro = membros.find((m) => m.id === membroId);
      return base44.entities.EbdMatricula.create({
        classe_id: classeId,
        membro_id: membroId,
        membro_nome: membro?.nome_completo || '',
        ativo: true,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ebd_matriculas'] }),
    onError: (err) => alert('Erro ao matricular: ' + (err?.message || '')),
  });

  const desmatricularMutation = useMutation({
    mutationFn: (matriculaId) => base44.entities.EbdMatricula.delete(matriculaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ebd_matriculas'] }),
  });

  const togglePresenca = (membroId) => {
    setPresencas((prev) => ({ ...prev, [membroId]: !prev[membroId] }));
  };

  // Sugestões para matricular: membros com participa_ebd que ainda não estão na classe
  const candidatosMatricula = useMemo(() => {
    if (!classeId) return [];
    const jaMatriculados = new Set(
      matriculas.filter((m) => m.classe_id === classeId && m.ativo !== false).map((m) => m.membro_id)
    );
    return membros.filter((m) => m.participa_ebd && !jaMatriculados.has(m.id));
  }, [classeId, matriculas, membros]);

  const presentes = Object.values(presencas).filter(Boolean).length;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            Aulas e Presença da EBD
          </h1>
          <p className="text-slate-500 mt-1">
            Selecione a classe, registre a aula e faça a chamada. Visitantes, revistas, bíblias e ofertas são contados para o ranking.
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle>Selecione classe e aula</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Classe *</Label>
              <Select value={classeId} onValueChange={(v) => { setClasseId(v); setAulaId(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {classesFiltradas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aula</Label>
              <Select value={aulaId} onValueChange={setAulaId} disabled={!classeId}>
                <SelectTrigger><SelectValue placeholder={classeId ? 'Selecione a aula' : 'Escolha a classe primeiro'} /></SelectTrigger>
                <SelectContent>
                  {aulasDaClasse.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {format(new Date(`${a.data_aula}T00:00:00`), 'dd/MM/yyyy')}{a.tema ? ` · ${a.tema}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {perms.canCreate && (
                <Button onClick={() => setShowNovaAula(true)} disabled={!classeId} className="bg-gradient-to-r from-indigo-500 to-blue-600">
                  <Plus className="w-4 h-4 mr-2" /> Nova aula
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {classeId && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Matriculados
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Sugere automaticamente membros marcados como participantes da EBD.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidatosMatricula.length > 0 && perms.canCreate && (
                <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3">
                  <p className="text-sm font-medium text-indigo-900 mb-2">
                    Membros EBD sem matrícula nesta classe:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {candidatosMatricula.map((m) => (
                      <Button
                        key={m.id}
                        size="sm"
                        variant="outline"
                        onClick={() => matricularMutation.mutate(m.id)}
                        disabled={matricularMutation.isPending}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        {m.nome_completo}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {matriculasDaClasse.length === 0 ? (
                <p className="text-slate-500 text-sm">Nenhum matriculado nesta classe ainda.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {matriculasDaClasse.map((m) => {
                    const isPresente = !!presencas[m.id];
                    return (
                      <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${isPresente ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isPresente}
                            onChange={() => togglePresenca(m.id)}
                            disabled={!aulaId}
                            className="w-4 h-4"
                          />
                          <div>
                            <p className="font-medium text-slate-900">{m.nome_completo}</p>
                            {m.congregacao_nome && <p className="text-xs text-slate-500">{m.congregacao_nome}</p>}
                          </div>
                        </label>
                        {perms.canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm(`Remover matrícula de ${m.nome_completo}?`)) {
                                desmatricularMutation.mutate(m.matricula_id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {matriculasDaClasse.length > 0 && (
                <p className="text-sm text-slate-600">
                  Presentes: <strong>{presentes}</strong> de {matriculasDaClasse.length}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {aulaId && aulaAtual && (
          <>
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Registros da aula · {format(new Date(`${aulaAtual.data_aula}T00:00:00`), 'dd/MM/yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="flex items-center gap-1"><Book className="w-3 h-3" /> Revistas</Label>
                    <Input type="number" min="0" value={revistas} onChange={(e) => setRevistas(e.target.value)} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Book className="w-3 h-3" /> Bíblias</Label>
                    <Input type="number" min="0" value={biblias} onChange={(e) => setBiblias(e.target.value)} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Oferta (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={oferta} onChange={(e) => setOferta(e.target.value)} />
                  </div>
                  <div>
                    <Label>Visitantes</Label>
                    <Input type="number" min="0" value={visitantes} onChange={(e) => setVisitantes(e.target.value)} />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Observações</Label>
                  <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                </div>
                <div className="flex justify-end mt-4">
                  {perms.canEdit && (
                    <Button
                      onClick={() => salvarAulaMutation.mutate()}
                      disabled={salvarAulaMutation.isPending}
                      className="bg-gradient-to-r from-green-500 to-blue-600"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {salvarAulaMutation.isPending ? 'Salvando...' : 'Salvar aula + presenças'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Visitantes registrados ({visitantesRegistrados.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {perms.canCreate && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do visitante"
                      value={visitanteNome}
                      onChange={(e) => setVisitanteNome(e.target.value)}
                    />
                    <Button
                      onClick={() => adicionarVisitanteMutation.mutate(visitanteNome)}
                      disabled={adicionarVisitanteMutation.isPending}
                    >
                      <UserPlus className="w-4 h-4 mr-2" /> Adicionar
                    </Button>
                  </div>
                )}
                {visitantesRegistrados.length === 0 ? (
                  <p className="text-slate-500 text-sm">Nenhum visitante registrado.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-2">
                    {visitantesRegistrados.map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-2 rounded border bg-white">
                        <span className="text-slate-800">{v.membro_nome || 'Visitante'}</span>
                        {perms.canDelete && (
                          <Button size="sm" variant="ghost" onClick={() => removerVisitanteMutation.mutate(v.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!classeId && (
          <div className="text-center text-slate-500 py-12">
            Selecione uma classe para começar.
          </div>
        )}
      </div>

      <Dialog open={showNovaAula} onOpenChange={setShowNovaAula}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova aula</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={novaAula.data_aula}
                onChange={(e) => setNovaAula({ ...novaAula, data_aula: e.target.value })}
              />
            </div>
            <div>
              <Label>Tema / Lição</Label>
              <Input
                value={novaAula.tema}
                onChange={(e) => setNovaAula({ ...novaAula, tema: e.target.value })}
                placeholder="Ex.: Lição 3 - A graça de Deus"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNovaAula(false)}>Cancelar</Button>
              <Button
                onClick={() => criarAulaMutation.mutate()}
                disabled={criarAulaMutation.isPending}
                className="bg-gradient-to-r from-indigo-500 to-blue-600"
              >
                {criarAulaMutation.isPending ? 'Criando...' : 'Criar aula'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
