import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  User,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ModalCongregacao from '@/components/congregacoes/ModalCongregacao.jsx';

export default function Congregacoes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [congregacaoSelecionada, setCongregacaoSelecionada] = useState(null);
  const editHandledRef = useRef(false);

  const { data: congregacoes = [], isLoading } = useQuery({
    queryKey: ['congregacoes'],
    queryFn: () => base44.entities.Congregacao.list('-created_date'),
    initialData: [],
  });

  const { data: membros = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Congregacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregacoes'] });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') !== 'editar' || editHandledRef.current) return;
    const congregacaoId = params.get('id');
    if (!congregacaoId || congregacoes.length === 0) return;
    const congregacao = congregacoes.find((item) => item.id === congregacaoId);
    if (!congregacao) return;
    setCongregacaoSelecionada(congregacao);
    setShowModal(true);
    editHandledRef.current = true;
  }, [congregacoes]);

  const handleEdit = (congregacao) => {
    setCongregacaoSelecionada(congregacao);
    setShowModal(true);
  };

  const handleView = (congregacao) => {
    navigate(`${createPageUrl('DetalhesCongregacao')}?id=${congregacao.id}`);
  };

  const handleDelete = async (id) => {
    const temMembros = membros.some((m) => m.congregacao_id === id);
    if (temMembros) {
      window.alert(
        'Não é possível excluir uma congregação com membros cadastrados. Remova os membros primeiro.'
      );
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir esta congregação?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCongregacaoSelecionada(null);
    const url = new URL(window.location);
    url.searchParams.delete('action');
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url);
  };

  const getMembrosPorCongregacao = (congregacaoId) =>
    membros.filter((m) => m.congregacao_id === congregacaoId).length;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              Congregações
            </h1>
            <p className="text-slate-500 mt-1">Gerencie todas as congregações da igreja</p>
          </div>
          <Button
            onClick={() => {
              setCongregacaoSelecionada(null);
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Congregação
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : congregacoes.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma congregação cadastrada</h3>
              <p className="text-slate-500 mb-6">Comece criando a primeira congregação</p>
              <Button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-blue-500 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Congregação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {congregacoes.map((congregacao) => (
              <Card
                key={congregacao.id}
                className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handleView(congregacao)}
              >
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{congregacao.nome}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {congregacao.cidade}, {congregacao.estado}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(event) => event.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(congregacao);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(congregacao.id);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {congregacao.endereco && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span className="text-slate-600">{congregacao.endereco}</span>
                    </div>
                  )}

                  {congregacao.telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{congregacao.telefone}</span>
                    </div>
                  )}

                  {congregacao.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{congregacao.email}</span>
                    </div>
                  )}

                  {congregacao.pastor_responsavel && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{congregacao.pastor_responsavel}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Badge className="bg-blue-100 text-blue-700">
                      {getMembrosPorCongregacao(congregacao.id)} membros
                    </Badge>
                    {congregacao.ativa ? (
                      <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">Inativa</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ModalCongregacao congregacao={congregacaoSelecionada} onClose={handleCloseModal} />
      )}
    </div>
  );
}
