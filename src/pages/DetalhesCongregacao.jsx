import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Building2, Mail, MapPin, Phone, User, Users, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import usePermissions from '@/hooks/usePermissions';

export default function DetalhesCongregacao() {
  const navigate = useNavigate();
  const perms = usePermissions('Congregacoes');
  const urlParams = new URLSearchParams(window.location.search);
  const congregacaoId = urlParams.get('id');

  const { data: congregacao, isLoading } = useQuery({
    queryKey: ['congregacao', congregacaoId],
    queryFn: async () => {
      const congregacoes = await base44.entities.Congregacao.list();
      return congregacoes.find((item) => item.id === congregacaoId);
    },
    enabled: Boolean(congregacaoId),
  });

  const { data: membros = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!congregacao) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p>Congregação não encontrada</p>
      </div>
    );
  }

  const membrosDaCongregacao = membros.filter((membro) => membro.congregacao_id === congregacao.id);
  const cidadeEstado = [congregacao.cidade, congregacao.estado].filter(Boolean).join(', ');

  const InfoRow = ({ icon: Icon, label, value }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
        <Icon className="w-5 h-5 text-slate-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="font-medium text-slate-900">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl('Congregacoes'))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Detalhes da Congregação</h1>
          </div>
          {perms.canEdit && (
            <Button
              onClick={() => navigate(`${createPageUrl('Congregacoes')}?action=editar&id=${congregacao.id}`)}
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{congregacao.nome}</CardTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className="bg-blue-100 text-blue-700">
                    {membrosDaCongregacao.length} membros
                  </Badge>
                  {congregacao.ativa ? (
                    <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">Inativa</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <InfoRow icon={MapPin} label="Cidade/Estado" value={cidadeEstado} />
              <InfoRow icon={MapPin} label="Endereço" value={congregacao.endereco} />
              <InfoRow icon={Phone} label="Telefone" value={congregacao.telefone} />
              <InfoRow icon={Mail} label="Email" value={congregacao.email} />
              <InfoRow icon={User} label="Pastor Responsável" value={congregacao.pastor_responsavel} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Membros desta Congregação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {membrosDaCongregacao.length === 0 ? (
              <p className="text-center text-slate-500">Nenhum membro cadastrado nesta congregação.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {membrosDaCongregacao.map((membro) => (
                  <div key={membro.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{membro.nome_completo?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{membro.nome_completo}</p>
                      <p className="text-sm text-slate-500">{membro.tipo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
