import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Heart,
  FileText,
  Edit,
  Droplets,
  Sparkles,
  Briefcase,
  GitBranch,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DetalhesMembro() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const membroId = urlParams.get('id');

  const { data: membro, isLoading } = useQuery({
    queryKey: ['membro', membroId],
    queryFn: async () => {
      const membros = await base44.entities.Membro.list();
      return membros.find((m) => m.id === membroId);
    },
    enabled: Boolean(membroId),
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!membro) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p>Membro não encontrado</p>
      </div>
    );
  }

  const getTipoBadgeColor = (tipo) => {
    const colors = {
      membro: 'bg-blue-100 text-blue-700 border-blue-200',
      congregado: 'bg-green-100 text-green-700 border-green-200',
      visitante: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      crianca: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      ativo: 'bg-green-100 text-green-700 border-green-200',
      inativo: 'bg-red-100 text-red-700 border-red-200',
      transferido: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

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
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl('Membros'))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Detalhes do Membro</h1>
          </div>
          <Button onClick={() => navigate(createPageUrl('Membros'))} className="bg-gradient-to-r from-blue-500 to-purple-600">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-4xl">{membro.nome_completo?.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{membro.nome_completo}</CardTitle>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className={`${getTipoBadgeColor(membro.tipo)} border`}>
                    {membro.tipo}
                  </Badge>
                  <Badge variant="secondary" className={`${getStatusBadgeColor(membro.status)} border`}>
                    {membro.status}
                  </Badge>
                  {membro.origem && (
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                      {membro.origem === 'novo'
                        ? 'Novo Convertido'
                        : membro.origem === 'membro_antigo'
                        ? 'Membro (Antigo)'
                        : membro.origem === 'transferencia_envia'
                        ? 'Transferência (Envia)'
                        : 'Transferência (Recebe)'}
                    </Badge>
                  )}
                  {membro.obreiro && (
                    <Badge className="bg-blue-600 text-white">Obreiro - {membro.cargo_obreiro}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <InfoRow icon={Building2} label="Congregação" value={membro.congregacao_nome} />
              <InfoRow
                icon={Calendar}
                label="Data de Nascimento"
                value={
                  membro.data_nascimento
                    ? format(new Date(`${membro.data_nascimento}T00:00:00`), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : null
                }
              />
              <InfoRow icon={Phone} label="Telefone" value={membro.telefone} />
              <InfoRow icon={Mail} label="Email" value={membro.email} />
              <InfoRow icon={User} label="CPF" value={membro.cpf} />
              <InfoRow icon={User} label="RG" value={membro.rg} />
              <InfoRow icon={Heart} label="Estado Civil" value={membro.estado_civil} />
              <InfoRow icon={User} label="Sexo" value={membro.sexo === 'masculino' ? 'Masculino' : membro.sexo === 'feminino' ? 'Feminino' : null} />
              {membro.departamento_nome && (
                <InfoRow icon={GitBranch} label="Departamento" value={membro.departamento_nome} />
              )}
            </div>
          </CardContent>
        </Card>

        {(membro.endereco || membro.cidade) && (
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {membro.endereco && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-500">Endereço</p>
                    <p className="font-medium text-slate-900">{membro.endereco}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Cidade</p>
                  <p className="font-medium text-slate-900">{membro.cidade || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estado</p>
                  <p className="font-medium text-slate-900">{membro.estado || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">CEP</p>
                  <p className="font-medium text-slate-900">{membro.cep || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Bairro</p>
                  <p className="font-medium text-slate-900">{membro.bairro || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informações Eclesiásticas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <InfoRow
                  icon={Droplets}
                  label="Data do Batismo nas Águas"
                  value={
                    membro.data_batismo
                      ? format(new Date(`${membro.data_batismo}T00:00:00`), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : null
                  }
                />
                <InfoRow icon={MapPin} label="Local do Batismo" value={membro.local_batismo} />
              </div>

              {membro.batismo_espirito_santo && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-purple-900 mb-1">Batismo com Espírito Santo</p>
                      {membro.data_batismo_espirito_santo && (
                        <p className="text-sm text-purple-700">
                          Recebido em{' '}
                          {format(new Date(`${membro.data_batismo_espirito_santo}T00:00:00`), "d 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-purple-600 text-white">Confirmado</Badge>
                  </div>
                </div>
              )}

              {membro.obreiro && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-1">Cargo de Obreiro</p>
                      <p className="text-blue-700 capitalize">{membro.cargo_obreiro}</p>
                    </div>
                    <Badge className="bg-blue-600 text-white">Obreiro</Badge>
                  </div>
                </div>
              )}
            </div>

            {membro.observacoes && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border-t">
                <p className="text-sm text-slate-500 mb-2">Observações</p>
                <p className="text-slate-900 whitespace-pre-wrap">{membro.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
