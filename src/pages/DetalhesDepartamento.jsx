import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Edit, GitBranch, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import usePermissions from '@/hooks/usePermissions';

export default function DetalhesDepartamento() {
  const navigate = useNavigate();
  const perms = usePermissions('Departamentos');
  const urlParams = new URLSearchParams(window.location.search);
  const departamentoId = urlParams.get('id');

  const { data: departamento, isLoading } = useQuery({
    queryKey: ['departamento', departamentoId],
    queryFn: async () => {
      const departamentos = await base44.entities.Departamento.list();
      return departamentos.find((item) => item.id === departamentoId);
    },
    enabled: Boolean(departamentoId),
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

  if (!departamento) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p>Departamento não encontrado</p>
      </div>
    );
  }

  const congregacoesMap = (congregacoes || []).reduce((acc, c) => { acc[c.id] = c.nome; return acc; }, {});
  const isObreirosDept = departamento.slug === 'obreiros';
  const membrosDoDepartamento = isObreirosDept
    ? membros.filter((m) => m.obreiro === true)
    : membros.filter((membro) => {
        const departamentosIds = Array.isArray(membro.departamentos_ids)
          ? membro.departamentos_ids
          : membro.departamento_id
          ? [membro.departamento_id]
          : [];
        return departamentosIds.includes(departamento.id);
      });

  // Tradução dos cargos para exibição
  const cargoLabel = (c) => ({
    cooperador: 'Cooperador',
    diacono: 'Diácono',
    presbitero: 'Presbítero',
    evangelista: 'Evangelista',
    pastor: 'Pastor',
  }[c] || c || '');

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl('Departamentos'))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Detalhes do Departamento</h1>
          </div>
          {perms.canEdit && (
            <Button
              onClick={() => navigate(`${createPageUrl('Departamentos')}?action=editar&id=${departamento.id}`)}
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b" style={{ backgroundColor: `${departamento.cor || '#3b82f6'}15` }}>
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: departamento.cor || '#3b82f6' }}
              >
                <GitBranch className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{departamento.nome}</CardTitle>
                {departamento.congregacao_nome && (
                  <p className="text-sm text-slate-500 mt-1">{departamento.congregacao_nome}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className="bg-blue-100 text-blue-700">
                    {membrosDoDepartamento.length} membros
                  </Badge>
                  {departamento.ativo ? (
                    <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">Inativo</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {isObreirosDept && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
                ⚙️ Departamento auto-gerenciado: a lista é sincronizada automaticamente com os membros marcados como <strong>Obreiro</strong> no cadastro.
              </div>
            )}
            {departamento.descricao && !isObreirosDept && (
              <div>
                <p className="text-sm text-slate-500">Descrição</p>
                <p className="text-slate-900">{departamento.descricao}</p>
              </div>
            )}
            {departamento.lider_nome && (
              <div>
                <p className="text-sm text-slate-500">Líder</p>
                <p className="text-slate-900 font-medium">{departamento.lider_nome}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Membros do Departamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {membrosDoDepartamento.length === 0 ? (
              <p className="text-center text-slate-500">Nenhum membro vinculado a este departamento.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {membrosDoDepartamento.map((membro) => (
                  <div key={membro.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center overflow-hidden">
                      {membro.foto_url ? (
                        <img src={membro.foto_url} alt={membro.nome_completo} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">{membro.nome_completo?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {membro.nome_completo}
                        {isObreirosDept && membro.cargo_obreiro && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                            {cargoLabel(membro.cargo_obreiro)}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">
                        {membro.tipo}
                        {membro.congregacao_id && congregacoesMap[membro.congregacao_id] && (
                          <span className="ml-2 text-slate-400">• {congregacoesMap[membro.congregacao_id]}</span>
                        )}
                        {!membro.congregacao_id && membro.congregacao_nome && (
                          <span className="ml-2 text-slate-400">• {membro.congregacao_nome}</span>
                        )}
                      </p>
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
