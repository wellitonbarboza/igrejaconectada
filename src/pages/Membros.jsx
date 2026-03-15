import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Eye,
  Edit,
  MoreVertical,
  Archive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ModalMembro from '@/components/membros/ModalMembro.jsx';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext.jsx';
import MemberAvatar from '@/components/membros/MemberAvatar.jsx';
import { isArchivedMember } from '@/utils/memberStatus';

export default function Membros() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [congregacaoFiltro, setCongregacaoFiltro] = useState('todas');
  const [ordenacaoFiltro, setOrdenacaoFiltro] = useState('az');
  const [showModal, setShowModal] = useState(false);
  const [membroSelecionado, setMembroSelecionado] = useState(null);
  const editHandledRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'novo') {
      setShowModal(true);
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: membros = [], isLoading } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('-created_date'),
    initialData: [],
  });

  const { data: congregacoes = [] } = useQuery({
    queryKey: ['congregacoes'],
    queryFn: () => base44.entities.Congregacao.list('nome'),
    initialData: [],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') !== 'editar' || editHandledRef.current) return;
    const membroId = params.get('id');
    if (!membroId || membros.length === 0) return;
    const membro = membros.find((item) => item.id === membroId);
    if (!membro) return;
    setMembroSelecionado(membro);
    setShowModal(true);
    editHandledRef.current = true;
  }, [membros]);

  const archiveMutation = useMutation({
    mutationFn: ({ id, status }) =>
      base44.entities.Membro.update(id, {
        status,
        ativo: status === 'ativo',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membros'] });
    },
  });

  const activeMembros = membros.filter((membro) => !isArchivedMember(membro));

  const filteredMembros = activeMembros.filter((membro) => {
    const matchesSearch =
      membro.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      membro.telefone?.includes(searchTerm) ||
      membro.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo = tipoFiltro === 'todos' || membro.tipo === tipoFiltro;
    const matchesStatus = statusFiltro === 'todos' || membro.status === statusFiltro;
    const matchesCongregacao =
      congregacaoFiltro === 'todas' || membro.congregacao_id === congregacaoFiltro;
    const matchesUserCongregacao = isAdmin || membro.congregacao_id === user?.congregacao_id;

    return (
      matchesSearch &&
      matchesTipo &&
      matchesStatus &&
      matchesCongregacao &&
      matchesUserCongregacao
    );
  });

  const sortedMembros = [...filteredMembros].sort((a, b) => {
    const nomeA = a.nome_completo || '';
    const nomeB = b.nome_completo || '';
    const direction = ordenacaoFiltro === 'az' ? 1 : -1;
    return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' }) * direction;
  });

  const handleEdit = (membro) => {
    setMembroSelecionado(membro);
    setShowModal(true);
  };

  const handleView = (membro) => {
    navigate(`${createPageUrl('DetalhesMembro')}?id=${membro.id}`);
  };

  const handleArchive = async (membro) => {
    const shouldArchive = window.confirm(
      'Deseja mover este membro para o arquivo morto? O registro não será excluído.'
    );
    if (!shouldArchive) return;

    await archiveMutation.mutateAsync({ id: membro.id, status: 'inativo' });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setMembroSelecionado(null);
    const url = new URL(window.location);
    url.searchParams.delete('action');
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url);
  };

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

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Membros
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie os membros ativos da sua {isAdmin ? 'igreja' : 'congregação'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('ArquivoMorto'))}
            >
              Arquivo Morto
            </Button>
            <Button
              onClick={() => {
                setMembroSelecionado(null);
                setShowModal(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Membro
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div
              className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="membro">Membro</SelectItem>
                  <SelectItem value="congregado">Congregado</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                  <SelectItem value="crianca">Criança</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="transferido">Transferido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ordenacaoFiltro} onValueChange={setOrdenacaoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="az">Nome A-Z</SelectItem>
                  <SelectItem value="za">Nome Z-A</SelectItem>
                </SelectContent>
              </Select>

              {isAdmin && (
                <Select value={congregacaoFiltro} onValueChange={setCongregacaoFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Congregação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as congregações</SelectItem>
                    {congregacoes.map((cong) => (
                      <SelectItem key={cong.id} value={cong.id}>
                        {cong.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Congregação</TableHead>}
                    <TableHead>Telefone</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredMembros.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-slate-500">
                        Nenhum membro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedMembros.map((membro) => (
                      <TableRow
                        key={membro.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleView(membro)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <MemberAvatar membro={membro} />
                            <div>
                              <p className="font-semibold text-slate-900">{membro.nome_completo}</p>
                              {membro.email && (
                                <p className="text-sm text-slate-500">{membro.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${getTipoBadgeColor(membro.tipo)} border`}>
                            {membro.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${getStatusBadgeColor(membro.status)} border`}>
                            {membro.status}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-slate-600">
                            {membro.congregacao_nome || '-'}
                          </TableCell>
                        )}
                        <TableCell className="text-slate-600">{membro.telefone || '-'}</TableCell>
                        <TableCell className="text-slate-600">
                          {membro.created_date ? format(new Date(membro.created_date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
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
                                  handleView(membro);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEdit(membro);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleArchive(membro);
                                }}
                                className="text-red-600"
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Arquivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {showModal && (
        <ModalMembro
          membro={membroSelecionado}
          onClose={handleCloseModal}
          congregacoes={congregacoes}
          userCongregacaoId={user?.congregacao_id}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
