import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Printer, Users, CalendarCheck, UserPlus, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useChurch } from '@/context/ChurchContext.jsx';
import { isArchivedMember } from '@/utils/memberStatus';
import { TIPOS_CULTO, tipoCultoLabel } from '@/pages/PresencaCultos.jsx';

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

export default function CultosRelatorios() {
  const { igrejaAtiva, config } = useChurch();
  const hoje = new Date();
  const [inicio, setInicio] = useState(format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd'));
  const [fim, setFim] = useState(format(hoje, 'yyyy-MM-dd'));
  const [congregacaoFiltro, setCongregacaoFiltro] = useState('todas');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [relatorio, setRelatorio] = useState('frequencia'); // frequencia | por_culto | visitantes
  const [copiado, setCopiado] = useState(false);

  const { data: cultos = [] } = useQuery({
    queryKey: ['cultos', igrejaAtiva?.id],
    queryFn: () => base44.entities.Culto.list('-data_culto'),
    initialData: [],
  });

  const { data: presencas = [] } = useQuery({
    queryKey: ['culto_presencas_all'],
    queryFn: () => base44.entities.CultoPresenca.list(),
    initialData: [],
  });

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

  const congregacoes = useMemo(
    () =>
      (Array.isArray(congregacoesRaw) ? congregacoesRaw : []).filter(
        (c) => !igrejaAtiva || !c.igreja_id || c.igreja_id === igrejaAtiva.id
      ),
    [congregacoesRaw, igrejaAtiva]
  );

  const congregacaoNome = useMemo(() => {
    const map = {};
    congregacoes.forEach((c) => { map[c.id] = c.nome; });
    return map;
  }, [congregacoes]);

  const cultosFiltrados = useMemo(() => {
    return (Array.isArray(cultos) ? cultos : [])
      .filter((c) => {
        if (igrejaAtiva && c.igreja_id && c.igreja_id !== igrejaAtiva.id) return false;
        if (congregacaoFiltro !== 'todas' && c.congregacao_id !== congregacaoFiltro) return false;
        if (tipoFiltro !== 'todos' && c.tipo_culto !== tipoFiltro) return false;
        if (!c.data_culto) return false;
        return c.data_culto >= inicio && c.data_culto <= fim;
      })
      .sort((a, b) => (b.data_culto || '').localeCompare(a.data_culto || ''));
  }, [cultos, igrejaAtiva, congregacaoFiltro, tipoFiltro, inicio, fim]);

  const cultoIds = useMemo(() => new Set(cultosFiltrados.map((c) => c.id)), [cultosFiltrados]);

  const presencasFiltradas = useMemo(
    () => (Array.isArray(presencas) ? presencas : []).filter((p) => cultoIds.has(p.culto_id)),
    [presencas, cultoIds]
  );

  const totalCultos = cultosFiltrados.length;

  // ---- Frequência por membro ----
  const frequenciaMembros = useMemo(() => {
    const presencasPorMembro = {};
    presencasFiltradas
      .filter((p) => p.membro_id)
      .forEach((p) => {
        presencasPorMembro[p.membro_id] = (presencasPorMembro[p.membro_id] || 0) + 1;
      });

    const membrosEscopo = (membrosTodos || [])
      .filter((m) => !isArchivedMember(m))
      .filter((m) => (!igrejaAtiva || !m.igreja_id || m.igreja_id === igrejaAtiva.id))
      .filter((m) => congregacaoFiltro === 'todas' || m.congregacao_id === congregacaoFiltro);

    return membrosEscopo
      .map((m) => ({
        id: m.id,
        nome: m.nome_completo,
        congregacao: congregacaoNome[m.congregacao_id] || '',
        presencas: presencasPorMembro[m.id] || 0,
        percentual: pct(presencasPorMembro[m.id] || 0, totalCultos),
      }))
      .sort((a, b) => (b.presencas - a.presencas) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [presencasFiltradas, membrosTodos, igrejaAtiva, congregacaoFiltro, congregacaoNome, totalCultos]);

  // ---- Lista por culto ----
  const listaPorCulto = useMemo(() => {
    return cultosFiltrados.map((c) => {
      const rows = presencasFiltradas.filter((p) => p.culto_id === c.id);
      const membros = rows.filter((p) => p.membro_id);
      const visitantes = rows.filter((p) => !p.membro_id);
      return {
        ...c,
        membros: membros.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')),
        visitantes: visitantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')),
        total: rows.length,
      };
    });
  }, [cultosFiltrados, presencasFiltradas]);

  // ---- Resumo de visitantes ----
  const cultoById = useMemo(() => {
    const map = {};
    cultosFiltrados.forEach((c) => { map[c.id] = c; });
    return map;
  }, [cultosFiltrados]);

  const visitantesResumo = useMemo(() => {
    return presencasFiltradas
      .filter((p) => !p.membro_id)
      .map((p) => ({
        nome: p.nome || 'Visitante',
        telefone: p.telefone || '',
        culto: cultoById[p.culto_id],
      }))
      .sort((a, b) => (b.culto?.data_culto || '').localeCompare(a.culto?.data_culto || ''));
  }, [presencasFiltradas, cultoById]);

  const totalPresencasMembros = presencasFiltradas.filter((p) => p.membro_id).length;
  const totalVisitantes = presencasFiltradas.filter((p) => !p.membro_id).length;

  const periodoLabel = `${format(new Date(`${inicio}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(`${fim}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })}`;
  const congregacaoLabel = congregacaoFiltro === 'todas' ? 'Todas as congregações' : (congregacaoNome[congregacaoFiltro] || 'Congregação');
  const tipoLabel = tipoFiltro === 'todos' ? 'Todos os cultos' : tipoCultoLabel(tipoFiltro);

  const print = () => window.print();

  const buildWhatsAppText = () => {
    const linhas = [];
    linhas.push(`*Relatório de Frequência dos Cultos*`);
    if (config?.nome_igreja || igrejaAtiva?.nome) linhas.push(`${config?.nome_igreja || igrejaAtiva?.nome}`);
    linhas.push(`Congregação: ${congregacaoLabel}`);
    linhas.push(`Período: ${periodoLabel}`);
    linhas.push(`Tipo: ${tipoLabel}`);
    linhas.push(`Total de cultos: ${totalCultos}`);
    linhas.push(`Presenças de membros: ${totalPresencasMembros} | Visitantes: ${totalVisitantes}`);
    linhas.push('');

    if (relatorio === 'frequencia') {
      linhas.push(`*Frequência por membro (presenças / ${totalCultos} cultos)*`);
      frequenciaMembros.forEach((m) => {
        linhas.push(`• ${m.nome}: ${m.presencas}/${totalCultos} (${m.percentual}%)`);
      });
    } else if (relatorio === 'por_culto') {
      linhas.push(`*Presença por culto*`);
      listaPorCulto.forEach((c) => {
        const data = format(new Date(`${c.data_culto}T00:00:00`), 'dd/MM/yyyy');
        linhas.push(`• ${data} — ${tipoCultoLabel(c.tipo_culto)}: ${c.membros.length} membros + ${c.visitantes.length} visitantes = ${c.total}`);
      });
    } else if (relatorio === 'visitantes') {
      linhas.push(`*Visitantes do período*`);
      visitantesResumo.forEach((v) => {
        const data = v.culto ? format(new Date(`${v.culto.data_culto}T00:00:00`), 'dd/MM/yyyy') : '';
        linhas.push(`• ${v.nome}${v.telefone ? ` (${v.telefone})` : ''}${data ? ` — ${data}` : ''}`);
      });
    }
    return linhas.join('\n');
  };

  const copiarWhatsApp = async () => {
    const texto = buildWhatsAppText();
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback: abre prompt para cópia manual
      window.prompt('Copie o texto abaixo para enviar no WhatsApp:', texto);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
              Relatórios de Frequência
            </h1>
            <p className="text-slate-500 mt-1">Frequência dos cultos para acompanhamento e envio aos membros.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={copiarWhatsApp}>
              <MessageCircle className="w-4 h-4 mr-2" /> {copiado ? 'Copiado!' : 'Texto p/ WhatsApp'}
            </Button>
            <Button variant="outline" onClick={print}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0 print:hidden">
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>Tipo de relatório</Label>
                <Select value={relatorio} onValueChange={setRelatorio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequencia">Frequência por membro</SelectItem>
                    <SelectItem value="por_culto">Lista por culto</SelectItem>
                    <SelectItem value="visitantes">Resumo de visitantes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Congregação</Label>
                <Select value={congregacaoFiltro} onValueChange={setCongregacaoFiltro}>
                  <SelectTrigger><SelectValue placeholder="Congregação" /></SelectTrigger>
                  <SelectContent searchable searchPlaceholder="Buscar congregação...">
                    <SelectItem value="todas">Todas as congregações</SelectItem>
                    {congregacoes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de culto</Label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os cultos</SelectItem>
                    {TIPOS_CULTO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>De</Label>
                <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </div>
              <div>
                <Label>Até</Label>
                <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cabeçalho do relatório (aparece na impressão) */}
        <Card className="shadow-lg border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>{config?.nome_igreja || igrejaAtiva?.nome || 'Relatório de Frequência'}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">{congregacaoLabel} · {tipoLabel} · {periodoLabel}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                <p className="text-xs text-slate-500 uppercase">Cultos</p>
                <p className="text-2xl font-bold text-indigo-700">{totalCultos}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs text-slate-500 uppercase">Presenças (membros)</p>
                <p className="text-2xl font-bold text-green-700">{totalPresencasMembros}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-slate-500 uppercase">Visitantes</p>
                <p className="text-2xl font-bold text-amber-700">{totalVisitantes}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-slate-500 uppercase">Média por culto</p>
                <p className="text-2xl font-bold text-blue-700">{totalCultos ? Math.round((totalPresencasMembros + totalVisitantes) / totalCultos) : 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {totalCultos === 0 ? (
          <Card className="border-0 shadow"><CardContent className="py-8 text-center text-slate-500">Nenhum culto encontrado neste período/filtro.</CardContent></Card>
        ) : (
          <>
            {relatorio === 'frequencia' && (
              <Card className="shadow-lg border-0 print:shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Frequência por membro</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">Presenças de cada membro em relação aos {totalCultos} culto(s) do período.</p>
                </CardHeader>
                <CardContent>
                  {frequenciaMembros.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">Nenhum membro no escopo selecionado.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left">
                          <th className="p-2">Membro</th>
                          {congregacaoFiltro === 'todas' && <th className="p-2">Congregação</th>}
                          <th className="p-2 text-center">Presenças</th>
                          <th className="p-2 text-center">Frequência</th>
                        </tr>
                      </thead>
                      <tbody>
                        {frequenciaMembros.map((m) => (
                          <tr key={m.id} className="border-b">
                            <td className="p-2 font-medium text-slate-900">{m.nome}</td>
                            {congregacaoFiltro === 'todas' && <td className="p-2 text-slate-500">{m.congregacao}</td>}
                            <td className="p-2 text-center">{m.presencas} / {totalCultos}</td>
                            <td className="p-2 text-center">
                              <Badge className={m.percentual >= 75 ? 'bg-green-100 text-green-700' : m.percentual >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                                {m.percentual}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}

            {relatorio === 'por_culto' && (
              <div className="space-y-4">
                {listaPorCulto.map((c) => (
                  <Card key={c.id} className="shadow-lg border-0 print:shadow-none">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CalendarCheck className="w-5 h-5" />
                        {format(new Date(`${c.data_culto}T00:00:00`), 'dd/MM/yyyy')} · {tipoCultoLabel(c.tipo_culto)}
                        {c.tema ? ` — ${c.tema}` : ''}
                      </CardTitle>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge className="bg-green-100 text-green-700">{c.membros.length} membros</Badge>
                        <Badge className="bg-amber-100 text-amber-700">{c.visitantes.length} visitantes</Badge>
                        <Badge className="bg-indigo-100 text-indigo-700">Total {c.total}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-2">Membros presentes</p>
                          {c.membros.length === 0 ? (
                            <p className="text-slate-400 text-sm">—</p>
                          ) : (
                            <ol className="list-decimal list-inside text-sm text-slate-700 space-y-0.5">
                              {c.membros.map((p) => <li key={p.id}>{p.nome}</li>)}
                            </ol>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-2">Visitantes</p>
                          {c.visitantes.length === 0 ? (
                            <p className="text-slate-400 text-sm">—</p>
                          ) : (
                            <ol className="list-decimal list-inside text-sm text-slate-700 space-y-0.5">
                              {c.visitantes.map((p) => <li key={p.id}>{p.nome}{p.telefone ? ` · ${p.telefone}` : ''}</li>)}
                            </ol>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {relatorio === 'visitantes' && (
              <Card className="shadow-lg border-0 print:shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Resumo de visitantes</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">Visitantes registrados no período, para acompanhamento.</p>
                </CardHeader>
                <CardContent>
                  {visitantesResumo.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">Nenhum visitante registrado no período.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left">
                          <th className="p-2">Visitante</th>
                          <th className="p-2">Telefone</th>
                          <th className="p-2">Culto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitantesResumo.map((v, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2 font-medium text-slate-900">{v.nome}</td>
                            <td className="p-2 text-slate-600">{v.telefone || '—'}</td>
                            <td className="p-2 text-slate-600">
                              {v.culto ? `${format(new Date(`${v.culto.data_culto}T00:00:00`), 'dd/MM/yyyy')} · ${tipoCultoLabel(v.culto.tipo_culto)}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p className="text-xs text-slate-500 mt-3">Total de visitantes: <strong>{visitantesResumo.length}</strong></p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
