import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { describeRole, hasPageAccess } from '@/utils/accessControl';
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
                  {navigationItems.filter((item) => hasPageAccess(user, item.page)).map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:text-white'
                            : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
                </p>
              </div>
            </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Permissões aplicadas conforme nível de acesso.
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
