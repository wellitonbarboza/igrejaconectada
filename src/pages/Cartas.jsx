import React, { useMemo, useRef, useState } from 'react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Search, FileText, Download, UserCheck, Pencil, Trash2, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { uploadElementSnapshot } from '@/utils/documentCapture';
import ieadLogo from '@/assets/iead-logo.svg';

export default function Cartas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tipoCarta, setTipoCarta] = useState('recomendacao');
  const [membroSelecionado, setMembroSelecionado] = useState(null);
  const [incluirFamilia, setIncluirFamilia] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cidadeDestino, setCidadeDestino] = useState('');
  const [estadoDestino, setEstadoDestino] = useState('');
  const [funcaoMinisterial, setFuncaoMinisterial] = useState('');
  const [historicoEditando, setHistoricoEditando] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const cartaRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  const { data: membros = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configs'],
    queryFn: () => base44.entities.Config.list(),
    initialData: [],
  });

  const { data: cartasEmitidas = [] } = useQuery({
    queryKey: ['cartas-emitidas'],
    queryFn: async () => {
      try {
        return await base44.entities.CartaEmitida.list('-created_date');
      } catch (error) {
        console.error('Erro ao carregar histórico de cartas:', error);
        return [];
      }
    },
    initialData: [],
  });

  const saveHistoricoMutation = useMutation({
    mutationFn: async ({ historicoId, payload }) => {
      if (historicoId) {
        return base44.entities.CartaEmitida.update(historicoId, payload);
      }
      return base44.entities.CartaEmitida.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartas-emitidas'] });
    },
  });

  const deleteHistoricoMutation = useMutation({
    mutationFn: (id) => base44.entities.CartaEmitida.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartas-emitidas'] });
    },
  });

  const config = configs[0];

  const filteredMembros = (isAdmin ? membros : membros.filter((m) => m.congregacao_id === user?.congregacao_id)).filter(
    (m) => m.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const historicoFiltrado = useMemo(() => {
    if (isAdmin) return cartasEmitidas;
    return cartasEmitidas.filter((item) => item.congregacao_id === user?.congregacao_id);
  }, [cartasEmitidas, isAdmin, user?.congregacao_id]);

  const limparFormulario = () => {
    setHistoricoEditando(null);
    setTipoCarta('recomendacao');
    setCidadeDestino('');
    setEstadoDestino('');
    setFuncaoMinisterial('');
    setIncluirFamilia(false);
  };

  const carregarCartaParaEdicao = (cartaHistorico) => {
    const membro = membros.find((item) => item.id === cartaHistorico.membro_id);
    if (!membro) {
      window.alert('Não foi possível editar: o membro relacionado não foi encontrado.');
      return;
    }

    setMembroSelecionado(membro);
    setTipoCarta(cartaHistorico.tipo_carta || 'recomendacao');
    setCidadeDestino(cartaHistorico.cidade_destino || '');
    setEstadoDestino(cartaHistorico.estado_destino || '');
    setFuncaoMinisterial(cartaHistorico.funcao_ministerial || '');
    setIncluirFamilia(Boolean(cartaHistorico.incluir_familia));
    setHistoricoEditando(cartaHistorico.id);
    setShowPreview(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBaixarHistorico = (cartaHistorico) => {
    if (cartaHistorico.arquivo_url) {
      window.open(cartaHistorico.arquivo_url, '_blank', 'noopener,noreferrer');
      return;
    }

    carregarCartaParaEdicao(cartaHistorico);
    setShowPreview(true);
  };

  const handleExcluirHistorico = async (cartaHistorico) => {
    if (!window.confirm('Deseja realmente excluir este registro do histórico de cartas?')) {
      return;
    }

    try {
      await deleteHistoricoMutation.mutateAsync(cartaHistorico.id);
      if (historicoEditando === cartaHistorico.id) {
        limparFormulario();
      }
    } catch (error) {
      console.error('Erro ao excluir carta do histórico:', error);
      window.alert('Não foi possível excluir a carta do histórico. Tente novamente.');
    }
  };

  const handleImprimir = async () => {
    try {
      if (cartaRef.current && membroSelecionado) {
        const snapshot = await uploadElementSnapshot({
          element: cartaRef.current,
          fileNamePrefix: `carta-${membroSelecionado.id}`,
          bucket: STORAGE_BUCKETS.documentos,
        });

        const emitidoPor = user?.full_name || user?.email || 'Sistema';

        const historicoPayload = {
          tipo_carta: tipoCarta,
          membro_id: membroSelecionado.id,
          membro_nome: membroSelecionado.nome_completo,
          incluir_familia: incluirFamilia,
          cidade_destino: cidadeDestino,
          estado_destino: estadoDestino,
          funcao_ministerial: funcaoMinisterial,
          congregacao_id: membroSelecionado.congregacao_id || null,
          congregacao_nome: membroSelecionado.congregacao_nome || null,
          igreja_nome: config?.nome_igreja || null,
          pastor_presidente: config?.pastor_presidente || null,
          emitida_em: new Date().toISOString(),
          emitido_por: emitidoPor,
          arquivo_bucket: STORAGE_BUCKETS.documentos,
          arquivo_path: snapshot?.path || null,
          arquivo_url: snapshot?.file_url || null,
        };

        await saveHistoricoMutation.mutateAsync({
          historicoId: historicoEditando,
          payload: historicoPayload,
        });

        setHistoricoEditando(null);
      }
    } catch (error) {
      console.error('Erro ao salvar a carta no histórico:', error);
      window.alert('Não foi possível salvar a carta no histórico. Verifique se a tabela cartas_emitidas já foi criada no Supabase.');
    }

    window.print();
  };

  const CartaTemplate = () => {
    if (!membroSelecionado || !config) return null;

    const nomeCompleto = incluirFamilia
      ? `${membroSelecionado.nome_completo} e Família`
      : membroSelecionado.nome_completo;

    const dataAtual = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    const tipoCartaTitulo = {
      recomendacao: 'CARTA DE RECOMENDAÇÃO',
      mudanca: 'CARTA DE MUDANÇA',
      transferencia: 'CARTA DE TRANSFERÊNCIA',
    };

    return (
      <div className="bg-white p-8 max-w-4xl mx-auto shadow-2xl print:shadow-none" style={{ minHeight: '297mm' }}>
        <div className="text-center mb-12 pb-6 border-b-2 border-blue-600">
          <img
            src={config.logo_url || ieadLogo}
            alt="Logo"
            className="h-24 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{config.nome_igreja}</h1>
          <div className="text-sm text-slate-600 space-y-1">
            {config.endereco_completo && <p>{config.endereco_completo}</p>}
            {(config.cidade || config.estado) && (
              <p>
                {config.cidade}
                {config.cidade && config.estado && ', '}
                {config.estado} {config.cep && `- ${config.cep}`}
              </p>
            )}
            {config.telefone && <p>Tel: {config.telefone}</p>}
            {config.email && <p>Email: {config.email}</p>}
            {config.cnpj && <p>CNPJ: {config.cnpj}</p>}
          </div>
        </div>

        <div className="space-y-5 text-justify">
          <h2 className="text-xl font-bold text-center text-slate-900 mb-2">{tipoCartaTitulo[tipoCarta]}</h2>

          <div className="space-y-4 text-slate-800 leading-relaxed">
            <p>
              Apresentamos à Igreja Evangélica Assembleia de Deus em{' '}
              <strong>{cidadeDestino || '______________________________'}</strong>
              {', '}
              <strong>{estadoDestino || '__'}</strong>, o(a) irmão(ã): <strong>{nomeCompleto}</strong>, que congrega em Santa Tereza do Oeste - PR.
            </p>
            <p>
              O(A) irmão(ã) serve ao Senhor como:{' '}
              <strong>{funcaoMinisterial || '________________________________________________'}</strong>.
            </p>
            <p>Portanto, pedimos que o(a) recebais no Senhor como usam fazer os santos.</p>
            <p>
              Santa Tereza do Oeste/PR, <strong>{dataAtual}</strong>.
            </p>
            <p className="text-xs text-slate-500">Esta carta tem a validade de 30 dias após a sua emissão.</p>
          </div>

          <div className="mt-12 pt-4 grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-t-2 border-slate-400 w-64 mx-auto mb-2"></div>
              <p className="font-bold text-slate-900">{config.pastor_presidente || 'Pastor Presidente'}</p>
              <p className="text-slate-600">Pastor Presidente</p>
            </div>
            <div>
              <div className="border-t-2 border-slate-400 w-64 mx-auto mb-2"></div>
              <p className="font-bold text-slate-900">Secretário</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Mail className="w-8 h-8 text-blue-600" />
              Gerar Cartas
            </h1>
            <p className="text-slate-500 mt-1">Emita cartas de recomendação, mudança e transferência para membros</p>
          </div>
          {showPreview && (
            <Button onClick={handleImprimir} className="bg-gradient-to-r from-blue-500 to-purple-600">
              <Download className="w-4 h-4 mr-2" />
              Baixar Carta
            </Button>
          )}
        </div>

        {!showPreview ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Configurar Carta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label htmlFor="tipo_carta">Tipo de Carta</Label>
                  <Select value={tipoCarta} onValueChange={setTipoCarta}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recomendacao">Carta de Recomendação</SelectItem>
                      <SelectItem value="mudanca">Carta de Mudança</SelectItem>
                      <SelectItem value="transferencia">Carta de Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cidade_destino">Cidade Destino</Label>
                    <Input
                      id="cidade_destino"
                      value={cidadeDestino}
                      onChange={(e) => setCidadeDestino(e.target.value)}
                      placeholder="Ex.: Cascavel"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado_destino">Estado Destino (UF)</Label>
                    <Input
                      id="estado_destino"
                      value={estadoDestino}
                      onChange={(e) => setEstadoDestino(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="Ex.: PR"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="funcao_ministerial">Serve ao Senhor como</Label>
                  <Input
                    id="funcao_ministerial"
                    value={funcaoMinisterial}
                    onChange={(e) => setFuncaoMinisterial(e.target.value)}
                    placeholder="Ex.: Diácono"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Selecionar Membro</Label>
                  <div className="mt-2 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar membro..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto">
                    {filteredMembros.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500 text-center">Nenhum membro encontrado</p>
                    ) : (
                      <div className="p-2">
                        {filteredMembros.map((membro) => (
                          <button
                            key={membro.id}
                            type="button"
                            onClick={() => setMembroSelecionado(membro)}
                            className={`w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors ${
                              membroSelecionado?.id === membro.id ? 'bg-blue-50 border-2 border-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">{membro.nome_completo?.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{membro.nome_completo}</p>
                                <p className="text-sm text-slate-500">{membro.congregacao_nome}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {membroSelecionado && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Checkbox id="incluir_familia" checked={incluirFamilia} onCheckedChange={setIncluirFamilia} />
                    <div className="flex-1">
                      <Label htmlFor="incluir_familia" className="cursor-pointer font-semibold text-blue-900">
                        Incluir "e Família"
                      </Label>
                      <p className="text-sm text-blue-700 mt-1">
                        O nome será exibido como "{membroSelecionado.nome_completo} e Família"
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowPreview(true)}
                    disabled={!membroSelecionado || !config}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    {historicoEditando ? 'Atualizar Carta' : 'Gerar Carta'}
                  </Button>
                  {historicoEditando && (
                    <Button variant="outline" onClick={limparFormulario}>
                      Cancelar edição
                    </Button>
                  )}
                </div>

                {!config && <p className="text-sm text-red-600 text-center">Configure as informações da igreja antes de gerar cartas</p>}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Histórico de Cartas Emitidas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {historicoFiltrado.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center">Nenhuma carta emitida ainda.</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {historicoFiltrado.map((carta) => (
                      <div key={carta.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-slate-600">
                              <strong>Tipo:</strong> {(carta.tipo_carta || 'recomendacao').replace(/^\w/, (l) => l.toUpperCase())}
                            </p>
                            <p className="text-sm text-slate-600">
                              <strong>Nome:</strong> {carta.membro_nome || 'Membro não informado'}
                            </p>
                            <p className="text-sm text-slate-600">
                              <strong>Data emissão:</strong>{' '}
                              {carta.emitida_em
                                ? format(new Date(carta.emitida_em), "dd/MM/yyyy 'às' HH:mm")
                                : 'Data não informada'}
                            </p>
                            <p className="text-sm text-slate-600">
                              <strong>Emitida por:</strong> {carta.emitido_por || 'Não informado'}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="icon" variant="outline" onClick={() => carregarCartaParaEdicao(carta)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => handleBaixarHistorico(carta)}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleExcluirHistorico(carta)}
                              disabled={deleteHistoricoMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            <Button onClick={() => setShowPreview(false)} variant="outline" className="mb-6 print:hidden">
              Voltar
            </Button>
            <div className="print-area" ref={cartaRef}>
              <CartaTemplate />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
