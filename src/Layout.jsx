import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  describeRole,
  hasPageAccess,
  getResolvedPermissions,
  isAdminUser,
  ACTION_LABELS,
} from '@/utils/accessControl';
import { useAuth } from '@/context/AuthContext.jsx';
import {
  LayoutDashboard,
  Users,
  Building2,
  GitBranch,
  FileText,
  CreditCard,
  Menu,
  Mail,
  Settings,
  LogOut,
  Archive,
  Shield,
  Eye,
  PenLine,
  Plus,
  Trash,
} from 'lucide-react';
import ieadLogo from '@/assets/iead-logo.svg';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const ACTION_ICONS = {
  view: Eye,
  create: Plus,
  edit: PenLine,
  delete: Trash,
};

export default function Layout({ children }) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navigationItems = [
    {
      title: 'Dashboard',
      url: createPageUrl('Dashboard'),
      icon: LayoutDashboard,
      page: 'Dashboard',
    },
    {
      title: 'Membros',
      url: createPageUrl('Membros'),
      icon: Users,
      page: 'Membros',
    },
    {
      title: 'Arquivo Morto',
      url: createPageUrl('ArquivoMorto'),
      icon: Archive,
      page: 'ArquivoMorto',
    },
    {
      title: 'Departamentos',
      url: createPageUrl('Departamentos'),
      icon: GitBranch,
      page: 'Departamentos',
    },
    {
      title: 'Congregações',
      url: createPageUrl('Congregacoes'),
      icon: Building2,
      page: 'Congregacoes',
    },
    {
      title: 'Usuários',
      url: createPageUrl('Usuarios'),
      icon: Users,
      page: 'Usuarios',
    },
    {
      title: 'Relatórios',
      url: createPageUrl('Relatorios'),
      icon: FileText,
      page: 'Relatorios',
    },
    {
      title: 'Cartas',
      url: createPageUrl('Cartas'),
      icon: Mail,
      page: 'Cartas',
    },
    {
      title: 'Cartões',
      url: createPageUrl('Cartoes'),
      icon: CreditCard,
      page: 'Cartoes',
    },
    {
      title: 'Configurações',
      url: createPageUrl('Configuracoes'),
      icon: Settings,
      page: 'Configuracoes',
    },
  ];

  const visibleItems = navigationItems.filter((item) => hasPageAccess(user, item.page));

  // Resolve as permissões do usuário para exibir badges de ações por página
  const resolvedPermissions = getResolvedPermissions(user);
  const admin = isAdminUser(user);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <style>{`
          :root {
            --primary: 239 84% 67%;
            --primary-foreground: 0 0% 100%;
          }
        `}</style>

        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-white border border-blue-100">
                <img src={ieadLogo} alt="Ícone da Igreja Digital" className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Igreja Digital</h2>
                <p className="text-xs text-slate-500">Sistema de Gestão</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Menu Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const pageActions = resolvedPermissions[item.page] || [];
                    const isActive = location.pathname === item.url;

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:text-white'
                              : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium flex-1">{item.title}</span>
                            {/* Badges de ações CRUD permitidas (somente para usuario, não admin) */}
                            {!admin && pageActions.length > 1 && (
                              <span className="flex gap-0.5">
                                {pageActions.map((action) => {
                                  const Icon = ACTION_ICONS[action];
                                  if (!Icon) return null;
                                  return (
                                    <span
                                      key={action}
                                      title={ACTION_LABELS[action]}
                                      className={`inline-flex items-center justify-center w-4 h-4 rounded-sm ${
                                        isActive
                                          ? 'text-white/70'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      <Icon className="w-3 h-3" />
                                    </span>
                                  );
                                })}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {user?.congregacao_nome && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                  Sua Congregação
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-700">{user.congregacao_nome}</span>
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">
                  {user?.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {describeRole(user?.role)}
                  {user?.cargo ? ` · ${user.cargo}` : ''}
                </p>
              </div>
            </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">Suas Permissões</span>
                </div>
                {admin ? (
                  <p className="text-xs text-blue-600">Acesso total (Administrador)</p>
                ) : (
                  <div className="text-xs text-blue-600 space-y-0.5">
                    <p>{visibleItems.length} página{visibleItems.length !== 1 ? 's' : ''} liberada{visibleItems.length !== 1 ? 's' : ''}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(ACTION_LABELS).map(([action, label]) => {
                        const count = Object.values(resolvedPermissions).filter(
                          (acts) => Array.isArray(acts) && acts.includes(action)
                        ).length;
                        if (count === 0) return null;
                        const Icon = ACTION_ICONS[action];
                        return (
                          <span
                            key={action}
                            className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
                          >
                            {Icon && <Icon className="w-2.5 h-2.5" />}
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-4 lg:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <div className="flex items-center gap-2">
                <img src={ieadLogo} alt="Ícone da Igreja Digital" className="w-6 h-6" />
                <h1 className="text-lg font-bold text-slate-900">Igreja Digital</h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
