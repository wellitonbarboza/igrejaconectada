import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Printer, Trophy, BookOpen, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useChurch } from '@/context/ChurchContext.jsx';

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function EbdRelatorios() {
  const { igrejaAtiva } = useChurch();
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'));
  const [tipoRelatorio, setTipoRelatorio] = useState('ranking'); // ranking | frequencia | matriculados

  const { data: classes = [] } = useQuery({
    queryKey: ['ebd_classes', igrejaAtiva?.id],
    queryFn: () => base44.entities.EbdClasse.list('nome'),
    initialData: [],
  });

  const { data: aulas = [] } = useQuery({
    queryKey: ['ebd_aulas', igrejaAtiva?.id],
    queryFn: () => base44.entities.EbdAula.list('-data_aula'),
    initialData: [],
  });

  const { data: presencas = [] } = useQuery({
    queryKey: ['ebd_presencas'],
    queryFn: () => base44.entities.EbdPresenca.list(),
    initialData: [],
  });

  const { data: matriculas = [] } = useQuery({
    queryKey: ['ebd_matriculas'],
    queryFn: () => base44.entities.EbdMatricula.list(),
    initialData: [],
  });

  const classesFiltradas = useMemo(
    () => (classes || []).filter((c) => !igrejaAtiva || !c.igreja_id || c.igreja_id === igrejaAtiva.id),
    [classes, igrejaAtiva]
  );

  const aulasMes = useMemo(() => {
    return (aulas || []).filter((a) => {
      if (igrejaAtiva && a.igreja_id && a.igreja_id !== igrejaAtiva.id) return false;
      return (a.data_aula || '').slice(0, 7) === mes;
    });
  }, [aulas, mes, igrejaAtiva]);

  // Ranking por classe no mês
  const ranking = useMemo(() => {
    return classesFiltradas.map((c) => {
      const aulasClasse = aulasMes.filter((a) => a.classe_id === c.id);
      const revistas = aulasClasse.reduce((s, a) => s + Number(a.revistas || 0), 0);
      const biblias = aulasClasse.reduce((s, a) => s + Number(a.biblias || 0), 0);
      const oferta = aulasClasse.reduce((s, a) => s + Number(a.oferta || 0), 0);
      const visitantes = aulasClasse.reduce((s, a) => s + Number(a.visitantes || 0), 0);

      const idsAulas = aulasClasse.map((a) => a.id);
      const presencasClasse = presencas.filter((p) => idsAulas.includes(p.aula_id) && p.presente !== false && !p.visitante);
      const frequencia = presencasClasse.length;

      const matriculados = matriculas.filter((m) => m.classe_id === c.id && m.ativo !== false).length;

      // Score composto: frequência (peso 2) + revistas + bíblias + visitantes
      const score = frequencia * 2 + revistas + biblias + visitantes;

      return {
        classe: c,
        aulas: aulasClasse.length,
        revistas,
        biblias,
        oferta,
        visitantes,
        frequencia,
        matriculados,
        score,
      };
    }).sort((a, b) => b.score - a.score);
  }, [classesFiltradas, aulasMes, presencas, matriculas]);

  // Totais do período
  const totais = useMemo(() => {
    return ranking.reduce(
      (acc, r) => ({
        revistas: acc.revistas + r.revistas,
        biblias: acc.biblias + r.biblias,
        oferta: acc.oferta + r.oferta,
        visitantes: acc.visitantes + r.visitantes,
        frequencia: acc.frequencia + r.frequencia,
        matriculados: acc.matriculados + r.matriculados,
        aulas: acc.aulas + r.aulas,
      }),
      { revistas: 0, biblias: 0, oferta: 0, visitantes: 0, frequencia: 0, matriculados: 0, aulas: 0 }
    );
  }, [ranking]);

  const mesLabel = mes ? format(new Date(`${mes}-01T00:00:00`), "MMMM 'de' yyyy", { locale: ptBR }) : '';

  const print = () => window.print();

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
              Relatórios da EBD
            </h1>
            <p className="text-slate-500 mt-1">Ranking, frequência, ofertas, revistas, bíblias e matriculados.</p>
          </div>
          <Button variant="outline" onClick={print}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>

        <Card className="shadow-lg border-0 print:shadow-none">
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Tipo de relatório</Label>
                <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ranking">Ranking das classes</SelectItem>
                    <SelectItem value="frequencia">Frequência detalhada</SelectItem>
                    <SelectItem value="matriculados">Matriculados por classe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mês</Label>
                <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow"><CardContent className="p-4">
            <p className="text-xs text-slate-500 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Aulas</p>
            <p className="text-2xl font-bold">{totais.aulas}</p>
          </CardContent></Card>
          <Card className="border-0 shadow"><CardContent className="p-4">
            <p className="text-xs text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> Presenças</p>
            <p className="text-2xl font-bold">{totais.frequencia}</p>
          </CardContent></Card>
          <Card className="border-0 shadow"><CardContent className="p-4">
            <p className="text-xs text-slate-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Ofertas</p>
            <p className="text-2xl font-bold">{money(totais.oferta)}</p>
          </CardContent></Card>
          <Card className="border-0 shadow"><CardContent className="p-4">
            <p className="text-xs text-slate-500">Visitantes</p>
            <p className="text-2xl font-bold">{totais.visitantes}</p>
          </CardContent></Card>
        </div>

        {tipoRelatorio === 'ranking' && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Ranking · {mesLabel}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Score = frequência (x2) + revistas + bíblias + visitantes.</p>
            </CardHeader>
            <CardContent>
              {ranking.length === 0 ? (
                <p className="text-slate-500 text-center py-6">Nenhum dado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left">
                        <th className="p-2">#</th>
                        <th className="p-2">Classe</th>
                        <th className="p-2 text-center">Aulas</th>
                        <th className="p-2 text-center">Frequência</th>
                        <th className="p-2 text-center">Revistas</th>
                        <th className="p-2 text-center">Bíblias</th>
                        <th className="p-2 text-center">Visitantes</th>
                        <th className="p-2 text-right">Ofertas</th>
                        <th className="p-2 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((r, idx) => (
                        <tr key={r.classe.id} className="border-b">
                          <td className="p-2 font-semibold">
                            {idx === 0 && <Trophy className="w-4 h-4 inline text-yellow-500 mr-1" />}
                            {idx + 1}
                          </td>
                          <td className="p-2 font-medium">{r.classe.nome}</td>
                          <td className="p-2 text-center">{r.aulas}</td>
                          <td className="p-2 text-center">{r.frequencia}</td>
                          <td className="p-2 text-center">{r.revistas}</td>
                          <td className="p-2 text-center">{r.biblias}</td>
                          <td className="p-2 text-center">{r.visitantes}</td>
                          <td className="p-2 text-right">{money(r.oferta)}</td>
                          <td className="p-2 text-right font-bold text-indigo-700">{r.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tipoRelatorio === 'frequencia' && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Frequência por aula · {mesLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              {aulasMes.length === 0 ? (
                <p className="text-slate-500 text-center py-6">Nenhuma aula no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left">
                        <th className="p-2">Data</th>
                        <th className="p-2">Classe</th>
                        <th className="p-2">Tema</th>
                        <th className="p-2 text-center">Presentes</th>
                        <th className="p-2 text-center">Visitantes</th>
                        <th className="p-2 text-center">Revistas</th>
                        <th className="p-2 text-center">Bíblias</th>
                        <th className="p-2 text-right">Oferta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aulasMes.map((a) => {
                        const classe = classes.find((c) => c.id === a.classe_id);
                        const presentesAula = presencas.filter(
                          (p) => p.aula_id === a.id && p.presente !== false && !p.visitante
                        ).length;
                        return (
                          <tr key={a.id} className="border-b">
                            <td className="p-2">{format(new Date(`${a.data_aula}T00:00:00`), 'dd/MM/yyyy')}</td>
                            <td className="p-2 font-medium">{classe?.nome || '-'}</td>
                            <td className="p-2">{a.tema || '-'}</td>
                            <td className="p-2 text-center">{presentesAula}</td>
                            <td className="p-2 text-center">{a.visitantes || 0}</td>
                            <td className="p-2 text-center">{a.revistas || 0}</td>
                            <td className="p-2 text-center">{a.biblias || 0}</td>
                            <td className="p-2 text-right">{money(a.oferta)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tipoRelatorio === 'matriculados' && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Matriculados por classe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {classesFiltradas.length === 0 ? (
                <p className="text-slate-500 text-center py-6">Nenhuma classe cadastrada.</p>
              ) : (
                classesFiltradas.map((c) => {
                  const lista = matriculas
                    .filter((m) => m.classe_id === c.id && m.ativo !== false)
                    .sort((a, b) => (a.membro_nome || '').localeCompare(b.membro_nome || '', 'pt-BR'));
                  return (
                    <div key={c.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">{c.nome}</p>
                          {c.professor_nome && <p className="text-xs text-slate-500">Professor: {c.professor_nome}</p>}
                        </div>
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                          {lista.length} matriculado(s)
                        </Badge>
                      </div>
                      {lista.length === 0 ? (
                        <p className="text-sm text-slate-500">Sem alunos matriculados.</p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-1 text-sm">
                          {lista.map((m, i) => (
                            <div key={m.id} className="px-2 py-1 rounded hover:bg-slate-50">
                              {i + 1}. {m.membro_nome}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
