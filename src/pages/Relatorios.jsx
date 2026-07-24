import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Cake,
  Users,
  Download,
  TrendingUp,
  ImageDown,
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
import AtaModal from '@/components/relatorios/AtaModal.jsx';
import { FileText as FileTextIcon, Eye } from 'lucide-react';
import { isArchivedMember } from '@/utils/memberStatus';

export default function Relatorios() {
  const { user } = useAuth();
  const [tipoRelatorio, setTipoRelatorio] = useState('aniversariantes');
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());
  const [setorSelecionado, setSetorSelecionado] = useState('todos');
  const [reuniaoAta, setReuniaoAta] = useState(null);

  const isAdmin = user?.role === 'admin';

  const { data: membrosTodos = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  // membros filtra fora arquivados (inativo/transferido) — mostrar arquivados só em ArquivoMorto
  const membros = React.useMemo(
    () => (membrosTodos || []).filter((m) => !isArchivedMember(m)),
    [membrosTodos]
  );

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

  const reunioesFiltradas = reunioes.filter((r) => {
    if (!r.data_reuniao) return false;
    const d = new Date(`${r.data_reuniao}T00:00:00`);
    if (d.getMonth() !== mesSelecionado) return false;
    if (setorSelecionado !== 'todos' && r.departamento_id !== setorSelecionado) return false;
    return true;
  });

  const filteredMembros = membros;

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

  const getSemanasDoMes = () => {
    const anoAtual = new Date().getFullYear();
    const primeiroDiaMes = new Date(anoAtual, mesSelecionado, 1);
    const inicioCalendario = new Date(primeiroDiaMes);
    inicioCalendario.setDate(primeiroDiaMes.getDate() - primeiroDiaMes.getDay());

    const semanasMap = new Map();

    aniversariantes.forEach((membro) => {
      const dataNasc = new Date(`${membro.data_nascimento}T00:00:00`);
      const dataSemana = new Date(anoAtual, mesSelecionado, dataNasc.getDate());
      const diffDias = Math.floor((dataSemana - inicioCalendario) / (1000 * 60 * 60 * 24));
      const indiceSemana = Math.floor(diffDias / 7);

      if (!semanasMap.has(indiceSemana)) {
        const inicioSemana = new Date(inicioCalendario);
        inicioSemana.setDate(inicioCalendario.getDate() + indiceSemana * 7);
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);

        semanasMap.set(indiceSemana, {
          indice: indiceSemana + 1,
          inicio: inicioSemana,
          fim: fimSemana,
          membros: [],
        });
      }

      semanasMap.get(indiceSemana).membros.push({
        ...membro,
        dataSemana,
      });
    });

    return Array.from(semanasMap.values())
      .sort((a, b) => a.inicio - b.inicio)
      .map((semana) => ({
        ...semana,
        membros: semana.membros.sort((a, b) => a.dataSemana - b.dataSemana),
      }));
  };

  const handleDownloadImagem = () => {
    if (!aniversariantes.length) return;

    const largura = 1080;
    const padding = 80;
    const larguraTexto = largura - padding * 2;
    const semanas = getSemanasDoMes();

    const fontes = {
      titulo: "bold 52px 'Poppins', sans-serif",
      subtitulo: "500 28px 'Poppins', sans-serif",
      semana: "600 34px 'Poppins', sans-serif",
      nome: "600 30px 'Poppins', sans-serif",
      data: "400 26px 'Poppins', sans-serif",
      rodape: "400 24px 'Poppins', sans-serif",
    };

    const getWrappedLines = (contexto, fonte, texto) => {
      contexto.font = fonte;
      const palavras = texto.split(' ');
      const linhas = [];
      let linhaAtual = '';

      palavras.forEach((palavra) => {
        const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
        if (contexto.measureText(tentativa).width > larguraTexto && linhaAtual) {
          linhas.push(linhaAtual);
          linhaAtual = palavra;
        } else {
          linhaAtual = tentativa;
        }
      });

      if (linhaAtual) {
        linhas.push(linhaAtual);
      }

      return linhas;
    };

    semanas.forEach((semana, index) => {
      const canvas = document.createElement('canvas');
      const contexto = canvas.getContext('2d');

      if (!contexto) return;

      const cabecalhoSemana = `${format(semana.inicio, 'dd/MM')} - ${format(semana.fim, 'dd/MM')}`;

      let alturaConteudo = 0;
      const linhasSemana = getWrappedLines(contexto, fontes.semana, cabecalhoSemana);
      alturaConteudo += linhasSemana.length * 42 + 16;

      semana.membros.forEach((membro) => {
        const dataNasc = new Date(`${membro.data_nascimento}T00:00:00`);
        const nomeLinhas = getWrappedLines(contexto, fontes.nome, membro.nome_completo);
        const dataLinha = format(dataNasc, "d 'de' MMMM", { locale: ptBR });
        const dataLinhas = getWrappedLines(contexto, fontes.data, dataLinha);
        alturaConteudo += nomeLinhas.length * 36;
        alturaConteudo += dataLinhas.length * 30 + 10;
      });

      const linhasSubtitulo = getWrappedLines(contexto, fontes.subtitulo, `Mês de ${meses[mesSelecionado]}`);
      const linhasRodape = getWrappedLines(
        contexto,
        fontes.rodape,
        'Que Deus continue abençoando as suas vidas. Somos Gratos por mais um ano estar conosco.',
      );

      const alturaTotal =
        padding +
        70 +
        linhasSubtitulo.length * 32 +
        20 +
        alturaConteudo +
        linhasRodape.length * 28 +
        padding;

      canvas.width = largura;
      canvas.height = alturaTotal;

      const gradiente = contexto.createLinearGradient(0, 0, largura, alturaTotal);
      gradiente.addColorStop(0, '#FDE2E2');
      gradiente.addColorStop(0.5, '#F4C4F3');
      gradiente.addColorStop(1, '#C3CFE2');

      contexto.fillStyle = gradiente;
      contexto.fillRect(0, 0, largura, alturaTotal);

      contexto.fillStyle = 'rgba(255, 255, 255, 0.6)';
      contexto.beginPath();
      contexto.arc(largura - 140, 140, 120, 0, Math.PI * 2);
      contexto.fill();

      contexto.beginPath();
      contexto.arc(120, alturaTotal - 160, 140, 0, Math.PI * 2);
      contexto.fill();

      let posicaoY = padding;

      contexto.fillStyle = '#3B0764';
      contexto.font = fontes.titulo;
      contexto.fillText('Aniversariantes da Semana', padding, posicaoY);

      posicaoY += 70;
      contexto.font = fontes.subtitulo;
      linhasSubtitulo.forEach((linha) => {
        contexto.fillText(linha, padding, posicaoY);
        posicaoY += 32;
      });

      posicaoY += 20;

      contexto.font = fontes.semana;
      contexto.fillStyle = '#6B21A8';
      getWrappedLines(contexto, fontes.semana, cabecalhoSemana).forEach((linha) => {
        contexto.fillText(linha, padding, posicaoY);
        posicaoY += 42;
      });

      posicaoY += 8;

      semana.membros.forEach((membro) => {
        const dataNasc = new Date(`${membro.data_nascimento}T00:00:00`);
        contexto.font = fontes.nome;
        contexto.fillStyle = '#111827';
        getWrappedLines(contexto, fontes.nome, membro.nome_completo).forEach((linha) => {
          contexto.fillText(linha, padding, posicaoY);
          posicaoY += 36;
        });
        contexto.font = fontes.data;
        contexto.fillStyle = '#4B5563';
        const dataLinha = format(dataNasc, "d 'de' MMMM", { locale: ptBR });
        getWrappedLines(contexto, fontes.data, dataLinha).forEach((linha) => {
          contexto.fillText(linha, padding, posicaoY);
          posicaoY += 30;
        });
        posicaoY += 10;
      });

      contexto.font = fontes.rodape;
      contexto.fillStyle = '#4C1D95';
      let posicaoYRodape = alturaTotal - padding - linhasRodape.length * 28;
      if (posicaoYRodape <= posicaoY + 16) {
        posicaoYRodape = posicaoY + 16;
      }
      linhasRodape.forEach((linha) => {
        contexto.fillText(linha, padding, posicaoYRodape);
        posicaoYRodape += 28;
      });

      const link = document.createElement('a');
      link.download = `aniversariantes-${meses[mesSelecionado].toLowerCase()}-semana-${index + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
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
          <div className="flex flex-col sm:flex-row gap-2 print:hidden">
            {tipoRelatorio === 'aniversariantes' && (
              <Button
                onClick={handleDownloadImagem}
                disabled={!aniversariantes.length}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-lg"
              >
                <ImageDown className="w-4 h-4 mr-2" />
                Gerar imagem
              </Button>
            )}
            <Button
              onClick={handleDownloadPDF}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
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
                  <SelectItem value="atas">Atas de Reunião</SelectItem>
                </SelectContent>
              </Select>

              {(tipoRelatorio === 'aniversariantes' || tipoRelatorio === 'atas') && (
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

              {tipoRelatorio === 'atas' && (
                <Select value={setorSelecionado} onValueChange={setSetorSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Setor / Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os setores</SelectItem>
                    {departamentos.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
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

        {tipoRelatorio === 'atas' && (
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="w-5 h-5" />
                Reuniões em {meses[mesSelecionado]} ({reunioesFiltradas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {reunioesFiltradas.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhuma reunião encontrada para os filtros selecionados.</p>
              ) : (
                <div className="space-y-3">
                  {reunioesFiltradas.map((r) => {
                    const dep = departamentos.find((d) => d.id === r.departamento_id);
                    const qtdPres = presencas.filter((p) => p.reuniao_id === r.id && p.presente !== false).length;
                    return (
                      <div key={r.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900">{r.tema || 'Reunião'}</p>
                          <p className="text-sm text-slate-500">
                            {dep?.nome || r.departamento_nome || '—'} •{' '}
                            {format(new Date(`${r.data_reuniao}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                            {r.hora_inicio ? ` às ${r.hora_inicio}` : ''}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {qtdPres} presença(s) • Resp: {r.responsavel_nome || '—'}
                          </p>
                        </div>
                        <Button
                          onClick={() => setReuniaoAta(r)}
                          className="bg-gradient-to-r from-amber-500 to-orange-600"
                        >
                          <Eye className="w-4 h-4 mr-2" /> Visualizar ATA
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
