import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, FileText, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChurch } from '@/context/ChurchContext.jsx';
import { isArchivedMember } from '@/utils/memberStatus';
import AtaModal from '@/components/relatorios/AtaModal.jsx';
import BotoesExportar from '@/components/relatorios/BotoesExportar.jsx';

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const dataBR = (iso) => (iso ? format(new Date(`${iso}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR }) : '—');

/**
 * Histórico de atas de reunião (setores/departamentos).
 * Usado em Secretaria › Relatórios (tipo "Atas de Reunião") e em
 * Secretaria › Reuniões › Relatórios.
 *
 * mostrarResumo: exibe cards com totais do período.
 */
export default function HistoricoAtas({ mostrarResumo = false, mesInicial }) {
  const { igrejaAtiva, config } = useChurch();
  const hoje = new Date();
  const [ano, setAno] = useState(String(hoje.getFullYear()));
  const [mes, setMes] = useState(mesInicial !== undefined ? String(mesInicial) : 'todos');
  const [setor, setSetor] = useState('todos');
  const [busca, setBusca] = useState('');
  const [reuniaoAta, setReuniaoAta] = useState(null);
  const listaRef = useRef(null);

  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => base44.entities.Departamento.list('nome'),
    initialData: [],
  });
  const { data: reunioes = [] } = useQuery({
    queryKey: ['setor_reunioes'],
    queryFn: () => base44.entities.SetorReuniao.list('-data_reuniao'),
    initialData: [],
  });
  const { data: presencas = [] } = useQuery({
    queryKey: ['setor_presencas'],
    queryFn: () => base44.entities.SetorPresenca.list(),
    initialData: [],
  });
  const { data: membrosTodos = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });
  const membros = useMemo(() => (membrosTodos || []).filter((m) => !isArchivedMember(m)), [membrosTodos]);

  const departamentosIgreja = useMemo(
    () => (departamentos || []).filter((d) => !igrejaAtiva || !d.igreja_id || d.igreja_id === igrejaAtiva.id),
    [departamentos, igrejaAtiva]
  );

  const anos = useMemo(() => {
    const set = new Set([String(hoje.getFullYear())]);
    (reunioes || []).forEach((r) => r.data_reuniao && set.add(r.data_reuniao.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [reunioes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Conta presentes/ausentes por reunião
  const contagem = useMemo(() => {
    const map = {};
    (presencas || []).forEach((p) => {
      if (!p.reuniao_id) return;
      map[p.reuniao_id] = map[p.reuniao_id] || { presentes: 0, ausentes: 0 };
      if (p.presente === false) map[p.reuniao_id].ausentes += 1;
      else map[p.reuniao_id].presentes += 1;
    });
    return map;
  }, [presencas]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (reunioes || [])
      .filter((r) => {
        if (!r.data_reuniao) return false;
        if (igrejaAtiva && r.igreja_id && r.igreja_id !== igrejaAtiva.id) return false;
        if (ano !== 'todos' && r.data_reuniao.slice(0, 4) !== ano) return false;
        if (mes !== 'todos' && Number(r.data_reuniao.slice(5, 7)) - 1 !== Number(mes)) return false;
        if (setor !== 'todos' && r.departamento_id !== setor) return false;
        if (termo) {
          const alvo = `${r.tema || ''} ${r.departamento_nome || ''} ${r.observacoes || ''} ${r.responsavel_nome || ''}`.toLowerCase();
          if (!alvo.includes(termo)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.data_reuniao || '').localeCompare(a.data_reuniao || ''));
  }, [reunioes, igrejaAtiva, ano, mes, setor, busca]);

  const resumo = useMemo(() => {
    const total = filtradas.length;
    const presentes = filtradas.reduce((s, r) => s + (contagem[r.id]?.presentes || 0), 0);
    const ausentes = filtradas.reduce((s, r) => s + (contagem[r.id]?.ausentes || 0), 0);
    const setores = new Set(filtradas.map((r) => r.departamento_id)).size;
    const taxa = presentes + ausentes > 0 ? Math.round((presentes / (presentes + ausentes)) * 100) : 0;
    return { total, presentes, ausentes, setores, taxa, media: total ? (presentes / total).toFixed(1) : '0' };
  }, [filtradas, contagem]);

  const nomeSetor = (r) => departamentos.find((d) => d.id === r.departamento_id)?.nome || r.departamento_nome || '—';
  const periodoLabel = `${mes === 'todos' ? 'Todos os meses' : MESES[Number(mes)]} ${ano === 'todos' ? '(todos os anos)' : `de ${ano}`}`;
  const setorLabel = setor === 'todos' ? 'Todos os setores' : departamentos.find((d) => d.id === setor)?.nome || '';

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0">
        <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" /> Histórico de Atas de Reunião
            </span>
            <BotoesExportar alvoRef={listaRef} titulo={`Historico de atas ${periodoLabel}`} />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mês</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {MESES.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor / Departamento</Label>
              <Select value={setor} onValueChange={setSetor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os setores</SelectItem>
                  {departamentosIgreja.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Tema, assunto, responsável" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Área exportável */}
      <div ref={listaRef} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-lg font-bold text-slate-900">
            {igrejaAtiva?.nome || config?.nome_igreja || 'Igreja'} — Histórico de Atas
          </h2>
          <p className="text-sm text-slate-500">{periodoLabel} • {setorLabel}</p>
        </div>

        {mostrarResumo && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ['Reuniões', resumo.total],
              ['Setores', resumo.setores],
              ['Presenças', resumo.presentes],
              ['Média por reunião', resumo.media],
              ['Frequência', `${resumo.taxa}%`],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-lg border bg-slate-50 p-3 pdf-bloco">
                <p className="text-xs text-slate-500">{rotulo}</p>
                <p className="text-xl font-bold text-slate-900">{valor}</p>
              </div>
            ))}
          </div>
        )}

        {filtradas.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Nenhuma ata encontrada para os filtros selecionados.</p>
        ) : (
          <div className="space-y-3">
            {filtradas.map((r) => {
              const c = contagem[r.id] || { presentes: 0, ausentes: 0 };
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 p-4 border rounded-lg pdf-bloco">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{r.tema || 'Reunião'}</p>
                    <p className="text-sm text-slate-500">
                      {nomeSetor(r)} • {dataBR(r.data_reuniao)}{r.hora_inicio ? ` às ${String(r.hora_inicio).slice(0, 5)}` : ''}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {c.presentes} presente(s) • {c.ausentes} ausente(s) • Resp: {r.responsavel_nome || '—'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setReuniaoAta(r)}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 shrink-0 no-export"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Ver ATA
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reuniaoAta && (
        <AtaModal
          open={!!reuniaoAta}
          onClose={() => setReuniaoAta(null)}
          reuniao={reuniaoAta}
          presencas={presencas}
          membros={membros}
          departamento={departamentos.find((d) => d.id === reuniaoAta.departamento_id)}
        />
      )}
    </div>
  );
}
