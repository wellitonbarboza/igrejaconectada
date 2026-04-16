import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useChurch } from '@/context/ChurchContext.jsx';

const ENTRADAS = ['dizimo', 'oferta', 'voto', 'entrada'];
const SAIDAS = ['saida', 'despesa'];

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function TesourariaFluxoCaixa() {
  const { igrejaAtiva } = useChurch();
  const hoje = new Date();
  const [inicio, setInicio] = useState(format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd'));
  const [fim, setFim] = useState(format(hoje, 'yyyy-MM-dd'));

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos', igrejaAtiva?.id],
    queryFn: () => base44.entities.LancamentoFinanceiro.list('-data_lancamento'),
    initialData: [],
  });

  const filtrados = useMemo(() => {
    return (Array.isArray(lancamentos) ? lancamentos : []).filter((l) => {
      if (igrejaAtiva && l.igreja_id && l.igreja_id !== igrejaAtiva.id) return false;
      if (!l.data_lancamento) return false;
      return l.data_lancamento >= inicio && l.data_lancamento <= fim;
    });
  }, [lancamentos, inicio, fim, igrejaAtiva]);

  const totalEntradas = filtrados
    .filter((l) => ENTRADAS.includes(l.tipo))
    .reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const totalSaidas = filtrados
    .filter((l) => SAIDAS.includes(l.tipo))
    .reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const saldo = totalEntradas - totalSaidas;

  // Fluxo diário agregado
  const diario = useMemo(() => {
    const map = {};
    filtrados.forEach((l) => {
      if (!l.data_lancamento) return;
      if (!map[l.data_lancamento]) map[l.data_lancamento] = { data: l.data_lancamento, entradas: 0, saidas: 0 };
      if (ENTRADAS.includes(l.tipo)) map[l.data_lancamento].entradas += Number(l.valor || 0);
      if (SAIDAS.includes(l.tipo)) map[l.data_lancamento].saidas += Number(l.valor || 0);
    });
    return Object.values(map).sort((a, b) => a.data.localeCompare(b.data));
  }, [filtrados]);

  let saldoAcumulado = 0;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-green-600" />
            Fluxo de Caixa
          </h1>
          <p className="text-slate-500 mt-1">Acompanhamento simples de entradas e saídas por período.</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle>Período</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Entradas</p>
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Saídas</p>
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Saldo do período</p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-slate-900' : 'text-red-700'}`}>{money(saldo)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle>Movimento diário</CardTitle></CardHeader>
          <CardContent>
            {diario.length === 0 ? (
              <p className="text-slate-500 text-center py-6">Sem movimentação no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="p-3">Data</th>
                      <th className="p-3 text-right">Entradas</th>
                      <th className="p-3 text-right">Saídas</th>
                      <th className="p-3 text-right">Saldo do dia</th>
                      <th className="p-3 text-right">Saldo acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diario.map((d) => {
                      const saldoDia = d.entradas - d.saidas;
                      saldoAcumulado += saldoDia;
                      return (
                        <tr key={d.data} className="border-b">
                          <td className="p-3">{format(new Date(`${d.data}T00:00:00`), 'dd/MM/yyyy')}</td>
                          <td className="p-3 text-right text-green-700 font-medium">{money(d.entradas)}</td>
                          <td className="p-3 text-right text-red-600 font-medium">{money(d.saidas)}</td>
                          <td className={`p-3 text-right font-semibold ${saldoDia >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{money(saldoDia)}</td>
                          <td className={`p-3 text-right font-semibold ${saldoAcumulado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{money(saldoAcumulado)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
