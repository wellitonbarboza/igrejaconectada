import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Printer, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useChurch } from '@/context/ChurchContext.jsx';

const ENTRADAS = ['dizimo', 'oferta', 'voto', 'entrada'];
const SAIDAS = ['saida', 'despesa'];

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function TesourariaRelatorios() {
  const { igrejaAtiva } = useChurch();
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'));
  const [relatorio, setRelatorio] = useState('entradas_saidas'); // entradas_saidas | dizimistas

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos', igrejaAtiva?.id],
    queryFn: () => base44.entities.LancamentoFinanceiro.list('-data_lancamento'),
    initialData: [],
  });

  const filtrados = useMemo(() => {
    return (Array.isArray(lancamentos) ? lancamentos : []).filter((l) => {
      if (igrejaAtiva && l.igreja_id && l.igreja_id !== igrejaAtiva.id) return false;
      if (!l.data_lancamento) return false;
      return (l.data_lancamento || '').slice(0, 7) === mes;
    });
  }, [lancamentos, mes, igrejaAtiva]);

  const entradas = filtrados.filter((l) => ENTRADAS.includes(l.tipo));
  const saidas = filtrados.filter((l) => SAIDAS.includes(l.tipo));
  const totalEntradas = entradas.reduce((a, l) => a + Number(l.valor || 0), 0);
  const totalSaidas = saidas.reduce((a, l) => a + Number(l.valor || 0), 0);

  // Relatório de dizimistas (SEM valores)
  const dizimistas = useMemo(() => {
    const map = {};
    filtrados
      .filter((l) => l.tipo === 'dizimo')
      .forEach((l) => {
        const key = l.membro_id || `__${l.membro_nome || 'Sem identificação'}`;
        if (!map[key]) {
          map[key] = {
            nome: l.membro_nome || 'Sem identificação',
            qtde: 0,
          };
        }
        map[key].qtde += 1;
      });
    return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [filtrados]);

  const mesLabel = mes ? format(new Date(`${mes}-01T00:00:00`), "MMMM 'de' yyyy", { locale: ptBR }) : '';

  const print = () => window.print();

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              Relatórios de Tesouraria
            </h1>
            <p className="text-slate-500 mt-1">Escolha o tipo de relatório e o mês.</p>
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
                <Select value={relatorio} onValueChange={setRelatorio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entradas_saidas">Entradas e Saídas</SelectItem>
                    <SelectItem value="dizimistas">Dizimistas do mês (sem valores)</SelectItem>
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

        {relatorio === 'entradas_saidas' && (
          <>
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Resumo · {mesLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs text-slate-500 uppercase">Entradas</p>
                    <p className="text-2xl font-bold text-green-700">{money(totalEntradas)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs text-slate-500 uppercase">Saídas</p>
                    <p className="text-2xl font-bold text-red-700">{money(totalSaidas)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-slate-500 uppercase">Saldo</p>
                    <p className={`text-2xl font-bold ${(totalEntradas - totalSaidas) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {money(totalEntradas - totalSaidas)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="shadow-lg border-0">
                <CardHeader><CardTitle>Entradas detalhadas</CardTitle></CardHeader>
                <CardContent>
                  {entradas.length === 0 ? (
                    <p className="text-slate-500 text-center py-6">Sem entradas.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left">
                          <th className="p-2">Data</th><th className="p-2">Tipo</th><th className="p-2">Descrição</th><th className="p-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entradas.map((l) => (
                          <tr key={l.id} className="border-b">
                            <td className="p-2">{format(new Date(`${l.data_lancamento}T00:00:00`), 'dd/MM')}</td>
                            <td className="p-2 capitalize">{l.tipo}</td>
                            <td className="p-2">{l.descricao || l.membro_nome || '-'}</td>
                            <td className="p-2 text-right font-medium">{money(l.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0">
                <CardHeader><CardTitle>Saídas detalhadas</CardTitle></CardHeader>
                <CardContent>
                  {saidas.length === 0 ? (
                    <p className="text-slate-500 text-center py-6">Sem saídas.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left">
                          <th className="p-2">Data</th><th className="p-2">Tipo</th><th className="p-2">Descrição</th><th className="p-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {saidas.map((l) => (
                          <tr key={l.id} className="border-b">
                            <td className="p-2">{format(new Date(`${l.data_lancamento}T00:00:00`), 'dd/MM')}</td>
                            <td className="p-2 capitalize">{l.tipo}</td>
                            <td className="p-2">{l.descricao || '-'}</td>
                            <td className="p-2 text-right font-medium">{money(l.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {relatorio === 'dizimistas' && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Dizimistas · {mesLabel}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Este relatório lista apenas quem dizimou no mês, sem expor valores individuais.
              </p>
            </CardHeader>
            <CardContent>
              {dizimistas.length === 0 ? (
                <p className="text-slate-500 text-center py-6">Nenhum dizimista no período.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {dizimistas.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <span className="font-medium text-slate-900">{d.nome}</span>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">{d.qtde} contribuição{d.qtde > 1 ? 'es' : ''}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-4">Total de dizimistas: <strong>{dizimistas.length}</strong></p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
