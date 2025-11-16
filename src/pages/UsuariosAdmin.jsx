import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Shield, Mail, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function UsuariosAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.Perfil.list('full_name'),
    initialData: [],
    enabled: user?.role === 'admin',
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.Perfil.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Perfil.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const handleChangeRole = (usuario, role) => {
    updateRoleMutation.mutate({ id: usuario.id, role });
  };

  const handleDelete = (usuario) => {
    if (usuario.id === user?.id) {
      alert('Você não pode remover o próprio usuário enquanto estiver conectado.');
      return;
    }
    if (window.confirm('Deseja realmente remover este usuário?')) {
      deleteMutation.mutate(usuario.id);
    }
  };

  const handleCreateUser = () => {
    if (typeof window !== 'undefined') {
      window.open('/entrar', '_blank', 'noopener');
    }
  };

  if (user?.role !== 'admin') {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  const estatisticas = [
    {
      label: 'Total de usuários',
      value: usuarios.length,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Administradores',
      value: usuarios.filter((u) => u.role === 'admin').length,
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Usuários padrão',
      value: usuarios.filter((u) => u.role !== 'admin').length,
      icon: UserPlus,
      color: 'from-green-500 to-green-600',
    },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Administração de Usuários
            </h1>
            <p className="text-slate-500 mt-2">
              Gerencie quem pode acessar o painel e defina os níveis de permissão da sua equipe.
            </p>
          </div>
          <Button onClick={handleCreateUser} className="bg-gradient-to-r from-blue-500 to-purple-600">
            <UserPlus className="w-4 h-4 mr-2" />
            Novo cadastro
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {estatisticas.map((item) => (
            <Card key={item.label} className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{item.label}</CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} text-white`}>
                  <item.icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>Usuários cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Carregando usuários...</div>
            ) : usuarios.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Nenhum usuário encontrado</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{usuario.full_name || 'Usuário sem nome'}</div>
                        {usuario.id === user?.id && <Badge className="mt-1">Você</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          {usuario.email || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={usuario.role || 'usuario'} onValueChange={(value) => handleChangeRole(usuario, value)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usuario">Usuário</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(usuario)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
