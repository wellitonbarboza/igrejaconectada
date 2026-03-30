import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Shield, Mail, Trash2, KeyRound, Eye, PenLine, Plus, Trash, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ALL_MANAGEABLE_PAGES,
  ACTION_LABELS,
  getResolvedPermissions,
} from '@/utils/accessControl';

const SUPER_ADMIN_EMAIL = 'welliton.tec@hotmail.com';

const ACTION_ICONS = {
  view: Eye,
  create: Plus,
  edit: PenLine,
  delete: Trash,
};

const defaultNovoUsuario = {
  full_name: '',
  email: '',
  role: 'usuario',
  cargo: '',
  password: '',
};

export default function UsuariosAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState(defaultNovoUsuario);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState({});

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.Perfil.list('full_name'),
    initialData: [],
    enabled: user?.role === 'admin',
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload) => {
      return base44.auth.createUserWithProfile(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setShowModal(false);
      setNovoUsuario(defaultNovoUsuario);
      alert('Usuário salvo com sucesso.');
    },
    onError: (error) => {
      console.error('Erro ao salvar usuário:', error);
      const detalhe = error?.message ? ` Detalhes: ${error.message}` : '';
      alert(`Não foi possível salvar o usuário.${detalhe}`);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.Perfil.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const updateCargoMutation = useMutation({
    mutationFn: ({ id, cargo }) => base44.entities.Perfil.update(id, { cargo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }) => base44.entities.Perfil.update(id, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setPermissionsTarget(null);
      setEditingPermissions({});
      alert('Permissões atualizadas com sucesso.');
    },
    onError: (error) => {
      console.error('Erro ao atualizar permissões:', error);
      const msg = error?.message || '';
      if (msg.includes('permissions') || msg.includes('column')) {
        alert(
          'Erro ao salvar permissões. Verifique se a migration "add_permissions_to_profiles" foi aplicada no banco de dados Supabase.'
        );
      } else {
        alert(`Não foi possível atualizar as permissões.${msg ? ` Detalhes: ${msg}` : ''}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Perfil.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const handleChangeRole = (usuario, role) => {
    if ((usuario.email || '').toLowerCase() === SUPER_ADMIN_EMAIL && role !== 'admin') {
      alert('O administrador geral não pode perder o nível admin.');
      return;
    }
    updateRoleMutation.mutate({ id: usuario.id, role });
  };

  const handleChangeCargo = (usuario, cargo) => {
    updateCargoMutation.mutate({ id: usuario.id, cargo });
  };

  const handleDelete = (usuario) => {
    if ((usuario.email || '').toLowerCase() === SUPER_ADMIN_EMAIL) {
      alert('O administrador geral não pode ser removido.');
      return;
    }

    if (usuario.id === user?.id) {
      alert('Você não pode remover o próprio usuário enquanto estiver conectado.');
      return;
    }
    if (window.confirm('Deseja realmente remover este usuário?')) {
      deleteMutation.mutate(usuario.id);
    }
  };

  const handleCreateUser = (event) => {
    event.preventDefault();

    if (!novoUsuario.full_name.trim() || !novoUsuario.email.trim()) {
      alert('Preencha nome e e-mail para continuar.');
      return;
    }

    if (!novoUsuario.password.trim() || novoUsuario.password.trim().length < 8) {
      alert('Defina uma senha provisória com pelo menos 8 caracteres.');
      return;
    }

    createUserMutation.mutate({
      ...novoUsuario,
      full_name: novoUsuario.full_name.trim(),
      email: novoUsuario.email.trim().toLowerCase(),
      cargo: novoUsuario.cargo.trim(),
      password: novoUsuario.password.trim(),
    });
  };

  // --- Permissions Modal Logic ---

  const openPermissionsModal = (usuario) => {
    setPermissionsTarget(usuario);
    setEditingPermissions(getResolvedPermissions(usuario));
  };

  const isPageEnabled = (page) => {
    return Array.isArray(editingPermissions[page]) && editingPermissions[page].length > 0;
  };

  const isActionEnabled = (page, action) => {
    return Array.isArray(editingPermissions[page]) && editingPermissions[page].includes(action);
  };

  const togglePage = (page, availableActions) => {
    setEditingPermissions((prev) => {
      const next = { ...prev };
      if (isPageEnabled(page)) {
        delete next[page];
      } else {
        next[page] = [...availableActions];
      }
      return next;
    });
  };

  const toggleAction = (page, action) => {
    setEditingPermissions((prev) => {
      const current = prev[page] || [];
      let updated;
      if (current.includes(action)) {
        updated = current.filter((a) => a !== action);
      } else {
        updated = [...current, action];
      }
      const next = { ...prev };
      if (updated.length === 0) {
        delete next[page];
      } else {
        next[page] = updated;
      }
      return next;
    });
  };

  const handleGrantAll = () => {
    const allPerms = {};
    ALL_MANAGEABLE_PAGES.forEach(({ page, actions }) => {
      allPerms[page] = [...actions];
    });
    setEditingPermissions(allPerms);
  };

  const handleRevokeAll = () => {
    setEditingPermissions({});
  };

  const handleSavePermissions = () => {
    if (!permissionsTarget) return;
    // Se não há nenhuma página selecionada, salva null para usar permissões padrão
    const permissionsToSave = Object.keys(editingPermissions).length > 0
      ? editingPermissions
      : null;
    updatePermissionsMutation.mutate({
      id: permissionsTarget.id,
      permissions: permissionsToSave,
    });
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

  const describePermissions = (usuario) => {
    if (usuario.role === 'admin') return 'Acesso total';
    const perms = usuario.permissions;
    if (perms && typeof perms === 'object' && !Array.isArray(perms) && Object.keys(perms).length > 0) {
      const pages = Object.keys(perms).length;
      const totalActions = Object.values(perms).reduce((sum, acts) => sum + (Array.isArray(acts) ? acts.length : 0), 0);
      return `${pages} pág. / ${totalActions} ações`;
    }
    return 'Padrão';
  };

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
              Cadastre usuários, defina nível de acesso, cargo e permissões detalhadas de cada pessoa.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-blue-500 to-purple-600">
            <UserPlus className="w-4 h-4 mr-2" />
            Novo usuário
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
                    <TableHead>Cargo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Permissões</TableHead>
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
                        <Input
                          defaultValue={usuario.cargo || ''}
                          placeholder="Ex.: Pastor, Secretária"
                          onBlur={(event) => handleChangeCargo(usuario, event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={usuario.role || 'usuario'} onValueChange={(value) => handleChangeRole(usuario, value)} disabled={(usuario.email || '').toLowerCase() === SUPER_ADMIN_EMAIL}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usuario">Usuário</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={usuario.role === 'admin' ? 'default' : 'secondary'} className="text-xs whitespace-nowrap">
                            {describePermissions(usuario)}
                          </Badge>
                          {usuario.role !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar permissões"
                              onClick={() => openPermissionsModal(usuario)}
                            >
                              <KeyRound className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(usuario)}
                          disabled={deleteMutation.isPending || (usuario.email || '').toLowerCase() === SUPER_ADMIN_EMAIL}
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

      {/* Modal: Novo Usuário */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={novoUsuario.full_name}
                onChange={(event) => setNovoUsuario((prev) => ({ ...prev, full_name: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={novoUsuario.email}
                onChange={(event) => setNovoUsuario((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha provisória</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={novoUsuario.password}
                onChange={(event) => setNovoUsuario((prev) => ({ ...prev, password: event.target.value }))}
                required
                minLength={8}
              />
              <p className="mt-1 text-xs text-slate-500">
                Compartilhe esta senha com o usuário de forma segura.
              </p>
            </div>
            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                placeholder="Ex.: Pastor, Tesoureiro, Secretária"
                value={novoUsuario.cargo}
                onChange={(event) => setNovoUsuario((prev) => ({ ...prev, cargo: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="role">Nível de acesso</Label>
              <Select
                value={novoUsuario.role}
                onValueChange={(value) => setNovoUsuario((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? 'Salvando...' : 'Salvar usuário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Permissões CRUD */}
      <Dialog open={!!permissionsTarget} onOpenChange={(open) => { if (!open) { setPermissionsTarget(null); setEditingPermissions({}); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              Permissões de Acesso
            </DialogTitle>
          </DialogHeader>

          {permissionsTarget && (
            <div className="space-y-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{permissionsTarget.full_name || 'Usuário'}</p>
                <p className="text-sm text-slate-500">{permissionsTarget.email}</p>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Páginas e ações permitidas</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleGrantAll}>
                    Liberar tudo
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleRevokeAll}>
                    Revogar tudo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {ALL_MANAGEABLE_PAGES.map(({ page, label, actions }) => {
                  const enabled = isPageEnabled(page);
                  return (
                    <div
                      key={page}
                      className={`rounded-lg border transition-colors ${
                        enabled ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      {/* Page toggle row */}
                      <label className="flex items-center gap-3 p-3 cursor-pointer">
                        <Checkbox
                          checked={enabled}
                          onCheckedChange={() => togglePage(page, actions)}
                        />
                        <span className={`text-sm font-semibold ${enabled ? 'text-blue-800' : 'text-slate-600'}`}>
                          {label}
                        </span>
                        {enabled && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {editingPermissions[page]?.length || 0} de {actions.length}
                          </Badge>
                        )}
                      </label>

                      {/* CRUD action toggles */}
                      {enabled && actions.length > 1 && (
                        <div className="border-t border-blue-100 px-3 py-2 flex flex-wrap gap-2">
                          {actions.map((action) => {
                            const ActionIcon = ACTION_ICONS[action];
                            const active = isActionEnabled(page, action);
                            return (
                              <button
                                key={action}
                                type="button"
                                onClick={() => toggleAction(page, action)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                  active
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {ActionIcon && <ActionIcon className="w-3 h-3" />}
                                {ACTION_LABELS[action]}
                                {active && <Check className="w-3 h-3" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  <strong>Nota:</strong> Usuários com nível "Administrador" têm acesso total a tudo
                  independente destas configurações. As permissões acima se aplicam apenas a
                  usuários com nível "Usuário". Páginas desmarcadas ficam ocultas no menu.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setPermissionsTarget(null); setEditingPermissions({}); }}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={updatePermissionsMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  {updatePermissionsMutation.isPending ? 'Salvando...' : 'Salvar permissões'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
