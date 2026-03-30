import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArchiveRestore, Eye, Edit, Archive } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/context/AuthContext.jsx';
import { ARQUIVO_MORTO_STATUSES, isArchivedMember } from '@/utils/memberStatus';
import MemberAvatar from '@/components/membros/MemberAvatar.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import usePermissions from '@/hooks/usePermissions';

export default function ArquivoMorto() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const perms = usePermissions('ArquivoMorto');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [congregacaoFiltro, setCongregacaoFiltro] = useState('todas');

  const { data: membros = [], isLoading } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('-updated_date'),
    initialData: [],
  });

  const { data: congregacoes = [] } = useQuery({
    queryKey: ['congregacoes'],
    queryFn: () => base44.entities.Congregacao.list('nome'),
    initialData: [],
  });

  const reativarMutation = useMutation({
    mutationFn: (id) => base44.entities.Membro.update(id, { status: 'ativo', ativo: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['membros'] }),
  });

  const arquivados = useMemo(() => {
    return membros
      .filter((membro) => isArchivedMember(membro))
      .filter((membro) => (isAdmin ? true : membro.congregacao_id === user?.congregacao_id))
      .filter((membro) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          membro.nome_completo?.toLowerCase().includes(search) ||
          membro.email?.toLowerCase().includes(search) ||
          membro.telefone?.includes(searchTerm);
        const matchesStatus = statusFiltro === 'todos' || membro.status === statusFiltro;
        const matchesCongregacao =
          congregacaoFiltro === 'todas' || membro.congregacao_id === congregacaoFiltro;
        return matchesSearch && matchesStatus && matchesCongregacao;
      });
  }, [membros, isAdmin, user?.congregacao_id, searchTerm, statusFiltro, congregacaoFiltro]);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Archive className="w-8 h-8 text-blue-600" />
              Arquivo Morto
            </h1>
            <p className="text-slate-500 mt-1">Membros inativos e transferidos</p>
          </div>
          <Button variant="outline" onClick={() => navigate(createPageUrl('Membros'))}>
            Voltar para membros ativos
          </Button>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Buscar por nome, telefone ou email"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {ARQUIVO_MORTO_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={congregacaoFiltro} onValueChange={setCongregacaoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Congregação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as congregações</SelectItem>
                  {congregacoes.map((congregacao) => (
                    <SelectItem key={congregacao.id} value={congregacao.id}>
                      {congregacao.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6 space-y-2">
            {isLoading ? (
              <p>Carregando...</p>
            ) : arquivados.length === 0 ? (
              <p className="text-slate-500">Nenhum membro encontrado no arquivo morto.</p>
            ) : (
              arquivados.map((membro) => (
                <div
                  key={membro.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-center gap-3">
                    <MemberAvatar membro={membro} />
                    <div>
                      <p className="font-semibold text-slate-900">{membro.nome_completo}</p>
                      <p className="text-sm text-slate-500">{membro.congregacao_nome || '-'}</p>
                    </div>
                    <Badge variant="secondary">{membro.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`${createPageUrl('DetalhesMembro')}?id=${membro.id}`)}>
                      <Eye className="w-4 h-4 mr-1" /> Ver
                    </Button>
                    {perms.canEdit && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`${createPageUrl('Membros')}?action=editar&id=${membro.id}`)}>
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                    )}
                    {perms.canEdit && (
                      <Button
                        size="sm"
                        onClick={() => reativarMutation.mutate(membro.id)}
                        disabled={reativarMutation.isPending}
                      >
                        <ArchiveRestore className="w-4 h-4 mr-1" /> Reativar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
