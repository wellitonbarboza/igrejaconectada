import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { SlidersHorizontal, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useChurch, MODULOS } from '@/context/ChurchContext.jsx';

export default function AdminModulos() {
  const { isSuperAdmin, refresh } = useChurch();
  const queryClient = useQueryClient();

  const { data: igrejas = [] } = useQuery({
    queryKey: ['igrejas'],
    queryFn: () => base44.entities.Igreja.list('nome'),
    initialData: [],
    enabled: isSuperAdmin,
  });

  const { data: modulos = [], isLoading } = useQuery({
    queryKey: ['igreja_modulos'],
    queryFn: () => base44.entities.IgrejaModulo.list(),
    initialData: [],
    enabled: isSuperAdmin,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ igreja_id, modulo, atual }) => {
      if (atual?.id) {
        return base44.entities.IgrejaModulo.update(atual.id, { ativo: !atual.ativo });
      }
      return base44.entities.IgrejaModulo.create({ igreja_id, modulo, ativo: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['igreja_modulos'] });
      refresh();
    },
    onError: (err) => alert('Erro ao atualizar módulo: ' + (err?.message || '')),
  });

  if (!isSuperAdmin) {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  const moduloStatus = (igrejaId, moduloKey) => {
    return modulos.find((m) => m.igreja_id === igrejaId && m.modulo === moduloKey);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <SlidersHorizontal className="w-8 h-8 text-blue-600" />
            Módulos por igreja
          </h1>
          <p className="text-slate-500 mt-1">
            Libere ou bloqueie cada módulo por igreja. Ative somente o que a equipe vai utilizar.
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Controle de módulos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-500">Carregando...</div>
            ) : igrejas.length === 0 ? (
              <div className="py-8 text-center text-slate-500">Cadastre uma igreja primeiro.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="p-3 font-semibold">Igreja</th>
                      {MODULOS.map((m) => (
                        <th key={m.key} className="p-3 font-semibold text-center">{m.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {igrejas.map((igreja) => (
                      <tr key={igreja.id} className="border-b">
                        <td className="p-3">
                          <div className="font-medium text-slate-900">{igreja.nome}</div>
                          {igreja.cidade && (
                            <div className="text-xs text-slate-500">{igreja.cidade}{igreja.estado ? ' / ' + igreja.estado : ''}</div>
                          )}
                        </td>
                        {MODULOS.map((m) => {
                          const atual = moduloStatus(igreja.id, m.key);
                          const ativo = atual?.ativo;
                          return (
                            <td key={m.key} className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleMutation.mutate({ igreja_id: igreja.id, modulo: m.key, atual })}
                                disabled={toggleMutation.isPending}
                                className={ativo
                                  ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                                }
                              >
                                {ativo ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                                {ativo ? 'Ativo' : 'Inativo'}
                              </Button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle>Legenda</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm text-slate-600">
            {MODULOS.map((m) => (
              <Badge key={m.key} variant="secondary" className="bg-blue-50 text-blue-700">{m.label}</Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
