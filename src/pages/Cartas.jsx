import React, { useState, useRef } from 'react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Mail, Search, FileText, Download, UserCheck } from 'lucide-react';
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
codex/save-photos-and-documents-to-supabase-buckets
import churchLogo from '@/assets/church-logo.svg';
import { uploadElementSnapshot } from '@/utils/documentCapture';

import ieadLogo from '@/assets/iead-logo.svg';
main

export default function Cartas() {
  const { user } = useAuth();
  const [tipoCarta, setTipoCarta] = useState('recomendacao');
  const [membroSelecionado, setMembroSelecionado] = useState(null);
  const [incluirFamilia, setIncluirFamilia] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const config = configs[0];

  const filteredMembros = (isAdmin ? membros : membros.filter((m) => m.congregacao_id === user?.congregacao_id)).filter(
    (m) => m.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImprimir = async () => {
    try {
      if (cartaRef.current && membroSelecionado) {
        await uploadElementSnapshot({
          element: cartaRef.current,
          fileNamePrefix: `carta-${membroSelecionado.id}`,
          bucket: STORAGE_BUCKETS.documentos,
        });
      }
    } catch (error) {
      console.error('Erro ao salvar a carta no Supabase:', error);
    }
    window.print();
  };

  const CartaTemplate = () => {
    if (!membroSelecionado || !config) return null;

    const nomeCompleto = incluirFamilia
      ? `${membroSelecionado.nome_completo} e Família`
      : membroSelecionado.nome_completo;

    const dataAtual = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR });

    return (
      <div className="bg-white p-12 max-w-4xl mx-auto shadow-2xl print:shadow-none" style={{ minHeight: '297mm' }}>
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

        <div className="space-y-6 text-justify">
          <div className="text-right text-slate-600 mb-8">
            {config.cidade}, {dataAtual}
          </div>

          {tipoCarta === 'recomendacao' ? (
            <>
              <h2 className="text-xl font-bold text-center text-slate-900 mb-6">CARTA DE RECOMENDAÇÃO</h2>
              <p className="leading-relaxed text-slate-700">
                A direção da <strong>{config.nome_igreja}</strong>, por meio desta, apresenta à consideração de V.Sa. o(a) irmão(ã)
                <strong> {nomeCompleto}</strong>, membro(a) desta congregação, que ora se desloca para essa localidade.
              </p>
              <p className="leading-relaxed text-slate-700">
                Durante o período em que congregou conosco, demonstrou conduta cristã exemplar, participando ativamente das atividades da
                igreja e mantendo comunhão com os irmãos.
              </p>
              <p className="leading-relaxed text-slate-700">
                Recomendamos, portanto, o(a) referido(a) irmão(ã) à comunhão dessa igreja, certos de que continuará sendo uma bênção no reino
                de Deus.
              </p>
              <div className="mt-12 space-y-2">
                <p className="leading-relaxed text-slate-700">
                  <strong>Dados do Membro:</strong>
                </p>
                <p className="text-slate-700">Nome: {membroSelecionado.nome_completo}</p>
                {membroSelecionado.cpf && <p className="text-slate-700">CPF: {membroSelecionado.cpf}</p>}
                {membroSelecionado.rg && <p className="text-slate-700">RG: {membroSelecionado.rg}</p>}
                {membroSelecionado.data_nascimento && (
                  <p className="text-slate-700">
                    Data de Nascimento: {format(new Date(`${membroSelecionado.data_nascimento}T00:00:00`), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-center text-slate-900 mb-6">CARTA DE TRANSFERÊNCIA</h2>
              <p className="leading-relaxed text-slate-700">
                Pelo presente, a direção da <strong>{config.nome_igreja}</strong> informa que o(a) irmão(ã) <strong>{nomeCompleto}</strong> foi
                membro(a) desta congregação até a presente data.
              </p>
              <p className="leading-relaxed text-slate-700">
                Durante sua permanência conosco, manteve conduta cristã irrepreensível, participando dos cultos e atividades da igreja, sendo
                assíduo(a) e dedicado(a) à obra do Senhor.
              </p>
              <p className="leading-relaxed text-slate-700">
                A pedido do(a) interessado(a), emitimos a presente carta de transferência, para que possa se integrar à comunhão dessa igreja.
                Rogamos a Deus que continue abençoando sua vida e ministério.
              </p>
              <div className="mt-12 space-y-2">
                <p className="leading-relaxed text-slate-700">
                  <strong>Dados do Membro:</strong>
                </p>
                <p className="text-slate-700">Nome: {membroSelecionado.nome_completo}</p>
                {membroSelecionado.cpf && <p className="text-slate-700">CPF: {membroSelecionado.cpf}</p>}
                {membroSelecionado.rg && <p className="text-slate-700">RG: {membroSelecionado.rg}</p>}
                {membroSelecionado.data_nascimento && (
                  <p className="text-slate-700">
                    Data de Nascimento: {format(new Date(`${membroSelecionado.data_nascimento}T00:00:00`), 'dd/MM/yyyy')}
                  </p>
                )}
                {membroSelecionado.data_batismo && (
                  <p className="text-slate-700">
                    Data do Batismo: {format(new Date(`${membroSelecionado.data_batismo}T00:00:00`), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="mt-16 pt-8">
            <p className="leading-relaxed text-slate-700 mb-12">Atenciosamente,</p>
            <div className="text-center">
              <div className="border-t-2 border-slate-400 w-64 mx-auto mb-2"></div>
              <p className="font-bold text-slate-900">{config.pastor_presidente || 'Pastor Responsável'}</p>
              <p className="text-slate-600">Pastor Presidente</p>
              <p className="text-slate-600">{config.nome_igreja}</p>
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
            <p className="text-slate-500 mt-1">Emita cartas de recomendação e transferência para membros</p>
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
                      <SelectItem value="transferencia">Carta de Transferência</SelectItem>
                    </SelectContent>
                  </Select>
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

                <Button
                  onClick={() => setShowPreview(true)}
                  disabled={!membroSelecionado || !config}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Gerar Carta
                </Button>

                {!config && <p className="text-sm text-red-600 text-center">Configure as informações da igreja antes de gerar cartas</p>}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 text-sm text-slate-600">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Carta de Recomendação</h3>
                    <p>Utilizada para recomendar um membro que está se mudando temporariamente ou visitando outra congregação.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Carta de Transferência</h3>
                    <p>Utilizada quando um membro está se transferindo definitivamente para outra congregação.</p>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-xs text-slate-500">
                      As cartas são geradas automaticamente com os dados do membro e as informações configuradas da igreja.
                    </p>
                  </div>
                </div>
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
