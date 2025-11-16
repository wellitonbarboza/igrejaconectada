import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Cake,
  Users,
  Download,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext.jsx';

export default function Relatorios() {
  const { user } = useAuth();
  const [tipoRelatorio, setTipoRelatorio] = useState('aniversariantes');
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());

  const isAdmin = user?.role === 'admin';

  const { data: membros = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  const filteredMembros = isAdmin
    ? membros
    : membros.filter((m) => m.congregacao_id === user?.congregacao_id);

  const aniversariantes = filteredMembros
    .filter((m) => {
      if (!m.data_nascimento) return false;
      const dataNasc = new Date(`${m.data_nascimento}T00:00:00`);
      return dataNasc.getMonth() === mesSelecionado;
    })
    .sort((a, b) => {
      const dayA = new Date(`${a.data_nascimento}T00:00:00`).getDate();
      const dayB = new Date(`${b.data_nascimento}T00:00:00`).getDate();
      return dayA - dayB;
    });

  const membrosPorTipo = {
    membro: filteredMembros.filter((m) => m.tipo === 'membro'),
    congregado: filteredMembros.filter((m) => m.tipo === 'congregado'),
    visitante: filteredMembros.filter((m) => m.tipo === 'visitante'),
    crianca: filteredMembros.filter((m) => m.tipo === 'crianca'),
  };

  const membrosPorSexo = {
    masculino: filteredMembros.filter((m) => m.sexo === 'masculino').length,
    feminino: filteredMembros.filter((m) => m.sexo === 'feminino').length,
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Relatórios
            </h1>
            <p className="text-slate-500 mt-1">
              Gere relatórios e estatísticas da sua {isAdmin ? 'igreja' : 'congregação'}
            </p>
          </div>
          <Button
            onClick={handleDownloadPDF}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg print:hidden"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>

        <Card className="shadow-lg border-0 print:hidden">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle>Selecionar Relatório</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aniversariantes">Aniversariantes</SelectItem>
                  <SelectItem value="estatisticas">Estatísticas Gerais</SelectItem>
                  <SelectItem value="membros">Lista de Membros</SelectItem>
                </SelectContent>
              </Select>

              {tipoRelatorio === 'aniversariantes' && (
                <Select value={mesSelecionado.toString()} onValueChange={(value) => setMesSelecionado(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes, index) => (
                      <SelectItem key={mes} value={index.toString()}>
                        {mes}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {tipoRelatorio === 'aniversariantes' && (
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-pink-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Cake className="w-5 h-5 text-pink-500" />
                Aniversariantes de {meses[mesSelecionado]}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {aniversariantes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Cake className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum aniversariante em {meses[mesSelecionado]}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {aniversariantes.map((membro) => {
                    const dataNasc = new Date(`${membro.data_nascimento}T00:00:00`);
                    const idade = new Date().getFullYear() - dataNasc.getFullYear();

                    return (
                      <div
                        key={membro.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {membro.nome_completo?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{membro.nome_completo}</p>
                            <p className="text-sm text-slate-500">
                              {format(dataNasc, "d 'de' MMMM", { locale: ptBR })} • {idade} anos
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                            {membro.tipo}
                          </Badge>
                          {membro.telefone && <p className="text-sm text-slate-500 mt-1">{membro.telefone}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tipoRelatorio === 'estatisticas' && (
          <div className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Estatísticas Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Por Tipo de Vínculo</h3>
                    <div className="space-y-3">
                      {Object.entries(membrosPorTipo).map(([tipo, lista]) => (
                        <div key={tipo} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="capitalize text-slate-700">{`${tipo}s`}</span>
                          <Badge className="bg-blue-100 text-blue-700">
                            {lista.length} ({filteredMembros.length ? ((lista.length / filteredMembros.length) * 100).toFixed(1) : '0.0'}%)
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-4">Por Sexo</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-700">Masculino</span>
                        <Badge className="bg-blue-100 text-blue-700">
                          {membrosPorSexo.masculino} ({
                            filteredMembros.length
                              ? ((membrosPorSexo.masculino / filteredMembros.length) * 100).toFixed(1)
                              : '0.0'
                          }%)
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-700">Feminino</span>
                        <Badge className="bg-pink-100 text-pink-700">
                          {membrosPorSexo.feminino} ({
                            filteredMembros.length
                              ? ((membrosPorSexo.feminino / filteredMembros.length) * 100).toFixed(1)
                              : '0.0'
                          }%)
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tipoRelatorio === 'membros' && (
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Lista Completa de Membros
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {filteredMembros.map((membro, index) => (
                  <div key={membro.id} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400 font-mono text-sm w-8">
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{membro.nome_completo}</p>
                        <p className="text-sm text-slate-500">
                          {membro.telefone || 'Sem telefone'} • {membro.email || 'Sem email'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {membro.tipo}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
