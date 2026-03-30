import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { GitBranch, Plus, Users, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ModalDepartamento from '@/components/departamentos/ModalDepartamento.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import usePermissions from '@/hooks/usePermissions';

export default function Departamentos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [departamentoSelecionado, setDepartamentoSelecionado] = useState(null);
  const editHandledRef = useRef(false);

  const isAdmin = user?.role === 'admin';
  const perms = usePermissions('Departamentos');

  const { data: departamentos = [], isLoading } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => base44.entities.Departamento.list('-created_date'),
    initialData: [],
  });

  const { data: membros = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Departamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') !== 'editar' || editHandledRef.current) return;
    if (!perms.canEdit) return;
    const departamentoId = params.get('id');
    if (!departamentoId || departamentos.length === 0) return;
    const departamento = departamentos.find((item) => item.id === departamentoId);
    if (!departamento) return;
    setDepartamentoSelecionado(departamento);
    setShowModal(true);
    editHandledRef.current = true;
  }, [departamentos, perms.canEdit]);

  const filteredDepartamentos = departamentos;
  const membrosFiltrados = membros;

  const membrosPorDepartamento = useMemo(() => {
    return membrosFiltrados.reduce((acc, membro) => {
      const departamentosIds = Array.isArray(membro.departamentos_ids)
        ? membro.departamentos_ids
        : membro.departamento_id
        ? [membro.departamento_id]
        : [];
      departamentosIds.forEach((departamentoId) => {
        if (!departamentoId) return;
        acc[departamentoId] = (acc[departamentoId] || 0) + 1;
      });
      return acc;
    }, {});
  }, [membrosFiltrados]);

  const handleEdit = (departamento) => {
    setDepartamentoSelecionado(departamento);
    setShowModal(true);
  };

  const handleView = (departamento) => {
    navigate(`${createPageUrl('DetalhesDepartamento')}?id=${departamento.id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este departamento?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setDepartamentoSelecionado(null);
    const url = new URL(window.location);
    url.searchParams.delete('action');
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <GitBranch className="w-8 h-8 text-blue-600" />
              Departamentos
            </h1>
            <p className="text-slate-500 mt-1">Organize os departamentos e ministérios da igreja</p>
          </div>
          {perms.canCreate && (
            <Button
              onClick={() => {
                setDepartamentoSelecionado(null);
                setShowModal(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Departamento
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : filteredDepartamentos.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <GitBranch className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum departamento cadastrado</h3>
              <p className="text-slate-500 mb-6">Comece criando o primeiro departamento da sua igreja</p>
              {perms.canCreate && (
                <Button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-blue-500 to-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Departamento
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartamentos.map((departamento) => (
              <Card
                key={departamento.id}
                className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handleView(departamento)}
              >
                <CardHeader className="border-b" style={{ backgroundColor: `${departamento.cor || '#3b82f6'}15` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{departamento.nome}</CardTitle>
                      {departamento.congregacao_nome && (
                        <p className="text-sm text-slate-500 mt-1">{departamento.congregacao_nome}</p>
                      )}
                    </div>
                    {(perms.canEdit || perms.canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(event) => event.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {perms.canEdit && (
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEdit(departamento);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {perms.canDelete && (
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(departamento.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {departamento.descricao && (
                    <p className="text-sm text-slate-600 mb-4">{departamento.descricao}</p>
                  )}

                  <div className="space-y-3">
                    {departamento.lider_nome && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">Líder:</span>
                        <span className="font-medium text-slate-900">{departamento.lider_nome}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {membrosPorDepartamento[departamento.id] || 0} membros
                      </Badge>
                      {departamento.ativo ? (
                        <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">Inativo</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ModalDepartamento
          departamento={departamentoSelecionado}
          onClose={handleCloseModal}
          membros={membros}
          userCongregacaoId={user?.congregacao_id}
          isAdmin={isAdmin}
          readOnly={departamentoSelecionado ? !perms.canEdit : !perms.canCreate}
        />
      )}
    </div>
  );
}
