import React, { useMemo, useState, useRef } from 'react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Search, Download, Calendar, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext.jsx';
import { uploadElementSnapshot } from '@/utils/documentCapture';
import MemberAvatar from '@/components/membros/MemberAvatar.jsx';
import ChurchLogo from '@/components/ChurchLogo.jsx';
import { useChurch } from '@/context/ChurchContext.jsx';
import { isArchivedMember } from '@/utils/memberStatus';


export default function Cartoes() {
  const { user } = useAuth();
  const { config, igrejaAtiva } = useChurch();
  const nomeIgreja = config?.nome_igreja || igrejaAtiva?.nome || 'Igreja Digital';
  const [searchTerm, setSearchTerm] = useState('');
  const [membrosSelecionados, setMembrosSelecionados] = useState([]);
  const cartoesPreviewRef = useRef(null);
  const cartoesPrintRef = useRef(null);

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

  const filteredMembros = useMemo(() => (
    membros.filter(
      (m) => m.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ), [membros, searchTerm]);

  const toggleMembro = (membroId) => {
    setMembrosSelecionados((prev) =>
      prev.includes(membroId)
        ? prev.filter((id) => id !== membroId)
        : [...prev, membroId]
    );
  };

  const membrosParaImprimir = membros.filter((m) => membrosSelecionados.includes(m.id));

  const handleImprimir = async () => {
    try {
      const target = cartoesPreviewRef.current || cartoesPrintRef.current;
      if (target) {
        await uploadElementSnapshot({
          element: target,
          fileNamePrefix: `cartoes-${membrosSelecionados.length}`,
          bucket: STORAGE_BUCKETS.documentos,
        });
      }
    } catch (error) {
      console.error('Erro ao salvar os cartões no Supabase:', error);
    }
    window.print();
  };

  const CartaoMembro = ({ membro }) => (
    <div className="w-[350px] h-[220px] bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden print:break-inside-avoid print:mb-4">
      <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16" />

      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <ChurchLogo className="w-6 h-6 rounded bg-white p-0.5" alt={`Logo ${nomeIgreja}`} />
          <div>
            <p className="font-bold text-lg truncate max-w-[260px]">{nomeIgreja}</p>
            <p className="text-xs opacity-80">Cartão de Membro</p>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-4">
          <MemberAvatar membro={membro} sizeClass="w-16 h-16" textClass="text-2xl" className="border-2 border-white" />
          <div className="flex-1">
            <p className="font-bold text-xl mb-1">{membro.nome_completo}</p>
            <Badge className="bg-white text-blue-600 text-xs">{membro.tipo}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mt-auto">
          <div className="col-span-2 opacity-90 truncate">Congregação: {membro.congregacao_nome || '-'}</div>
          <div className="flex items-center gap-2">
            <Hash className="w-3 h-3" />
            <span className="opacity-80">ID: {String(membro.id).slice(-6)}</span>
          </div>
          {membro.data_membresia && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span className="opacity-80">
                Desde {format(new Date(`${membro.data_membresia}T00:00:00`), 'MM/yyyy')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-blue-600" />
              Cartões de Membros
            </h1>
            <p className="text-slate-500 mt-1">Selecione os membros para gerar cartões de identificação</p>
          </div>
          <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleImprimir}
            disabled={membrosSelecionados.length === 0}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Cartões ({membrosSelecionados.length})
          </Button>
          <Button
            variant="outline"
            disabled={membrosSelecionados.length !== 1}
            onClick={handleImprimir}
          >
            Gerar cartão individual
          </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0 print:hidden">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle>Selecionar Membros</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar membro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredMembros.map((membro) => (
                  <label
                    key={membro.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={membrosSelecionados.includes(membro.id)}
                      onChange={() => toggleMembro(membro.id)}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                    <MemberAvatar membro={membro} />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{membro.nome_completo}</p>
                      <p className="text-sm text-slate-500">{membro.congregacao_nome}</p>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {membro.tipo}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {membrosSelecionados.length > 0 && (
          <div className="print:block hidden">
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
              <div className="print-area grid grid-cols-2 gap-6" ref={cartoesPrintRef}>
                {membrosParaImprimir.map((membro) => (
                  <CartaoMembro key={membro.id} membro={membro} />
                ))}
              </div>
          </div>
        )}

        {membrosSelecionados.length > 0 && (
          <Card className="shadow-lg border-0 print:hidden">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle>Pré-visualização</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6" ref={cartoesPreviewRef}>
                {membrosParaImprimir.map((membro) => (
                  <CartaoMembro key={membro.id} membro={membro} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
