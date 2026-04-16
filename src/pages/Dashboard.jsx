import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, Building2, GitBranch, TrendingUp, UserPlus, Cake, Download, Smartphone, Monitor, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext.jsx';
import usePermissions from '@/hooks/usePermissions';
import appLogo from '@/assets/church-logo.svg';

export default function Dashboard() {
  const { user } = useAuth();
  const membrosPerms = usePermissions('Membros');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const updateInstalledState = () => {
      setIsInstalled(mediaQuery.matches || window.navigator.standalone === true);
    };

    updateInstalledState();

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener('change', updateInstalledState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', updateInstalledState);
    };
  }, []);

  const { data: membros = [], isLoading: loadingMembros } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('-created_date'),
    initialData: [],
  });

  const { data: congregacoes = [] } = useQuery({
    queryKey: ['congregacoes'],
    queryFn: () => base44.entities.Congregacao.list('-created_date'),
    initialData: [],
    enabled: true,
  });

  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => base44.entities.Departamento.list('-created_date'),
    initialData: [],
  });

  const filteredMembros = membros;
  const filteredDepartamentos = departamentos;

  const hoje = new Date();
  const primeiroDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

  const novosEsteMes = useMemo(
    () =>
      filteredMembros.filter((m) => {
        if (!m.created_date) return false;
        return new Date(m.created_date) >= primeiroDiaMesAtual;
      }).length,
    [filteredMembros, primeiroDiaMesAtual]
  );

  const novosMesAnterior = useMemo(
    () =>
      filteredMembros.filter((m) => {
        if (!m.created_date) return false;
        const d = new Date(m.created_date);
        return d >= primeiroDiaMesAnterior && d < primeiroDiaMesAtual;
      }).length,
    [filteredMembros, primeiroDiaMesAtual, primeiroDiaMesAnterior]
  );

  const crescimentoDiff = novosEsteMes - novosMesAnterior;

  const membrosAtivos = filteredMembros.filter((m) => m.ativo || m.status === 'ativo');
  const totalMembros = filteredMembros.length;
  const congregacoesAtivas = congregacoes.filter((c) => c.ativa);
  const departamentosAtivos = filteredDepartamentos.filter((d) => d.ativo);
  const membrosPorTipo = {
    membro: filteredMembros.filter((m) => m.tipo === 'membro').length,
    congregado: filteredMembros.filter((m) => m.tipo === 'congregado').length,
    visitante: filteredMembros.filter((m) => m.tipo === 'visitante').length,
    crianca: filteredMembros.filter((m) => m.tipo === 'crianca').length,
  };

  const aniversariantesDoMes = filteredMembros
    .filter((m) => {
      if (!m.data_nascimento) return false;
      const dataNasc = new Date(`${m.data_nascimento}T00:00:00`);
      return dataNasc.getMonth() === hoje.getMonth();
    })
    .slice(0, 5);

  const membrosRecentes = [...filteredMembros]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  const downloadBaseUrl = createPageUrl('Download');
  const canInstall = Boolean(installPrompt) && !isInstalled;

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const stats = [
    {
      title: 'Total de Membros',
      value: totalMembros,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      trend: `${membrosAtivos.length} ativos`,
    },
    {
      title: 'Congregações',
      value: congregacoes.length,
      icon: Building2,
      color: 'from-purple-500 to-purple-600',
      trend: `${congregacoesAtivas.length} ativas`,
    },
    {
      title: 'Departamentos',
      value: filteredDepartamentos.length,
      icon: GitBranch,
      color: 'from-green-500 to-green-600',
      trend: `${departamentosAtivos.length} ativos`,
    },
    {
      title: 'Aniversariantes',
      value: aniversariantesDoMes.length,
      icon: Cake,
      color: 'from-pink-500 to-pink-600',
      trend: `${aniversariantesDoMes.length} neste mês`,
    },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Bem-vindo de volta! 👋
            </h1>
            <p className="text-slate-500 mt-2">
              Aqui está um resumo das atividades da sua igreja
            </p>
          </div>
          {membrosPerms.canCreate && (
            <Link to={`${createPageUrl('Membros')}?action=novo`}>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg">
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Membro
              </Button>
            </Link>
          )}
        </div>

        {/* Crescimento mensal */}
        {!loadingMembros && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Novos este mês</p>
                  <p className="text-2xl font-bold text-slate-900">{novosEsteMes}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-slate-200 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Mês anterior</p>
                  <p className="text-2xl font-bold text-slate-900">{novosMesAnterior}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-green-50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${crescimentoDiff >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {crescimentoDiff >= 0
                    ? <ArrowUp className="w-5 h-5 text-emerald-600" />
                    : <ArrowDown className="w-5 h-5 text-red-600" />
                  }
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Variação</p>
                  <p className={`text-2xl font-bold ${crescimentoDiff >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {crescimentoDiff >= 0 ? '+' : ''}{crescimentoDiff}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingMembros
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-8 w-12" />
                      </div>
                      <Skeleton className="w-12 h-12 rounded-xl" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))
            : stats.map((stat, index) => (
                <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full transform translate-x-10 -translate-y-10`}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                        <CardTitle className="text-3xl font-bold mt-2">{stat.value}</CardTitle>
                      </div>
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm">
                      <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                      <span className="text-slate-600">{stat.trend}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-500" />
              Baixe o app
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-slate-600">
              Tenha acesso rápido no celular ou no desktop com o aplicativo instalado.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={`${downloadBaseUrl}/mobile`}>
                <Button className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-md">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Baixar para celular
                </Button>
              </Link>
              <Link to={`${downloadBaseUrl}/desktop`}>
                <Button
                  variant="outline"
                  className="border-indigo-200 text-indigo-600 hover:text-indigo-700 hover:border-indigo-300"
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  Baixar para desktop
                </Button>
              </Link>
              {canInstall && (
                <Button
                  variant="outline"
                  className="border-indigo-200 text-indigo-600 hover:text-indigo-700 hover:border-indigo-300"
                  onClick={handleInstallClick}
                  type="button"
                >
                  <img src={appLogo} alt="Logo Igreja Conectada" className="w-4 h-4 mr-2" />
                  Instalar como app
                </Button>
              )}
            </div>
            {isInstalled && (
              <p className="text-sm text-slate-500">Este app já está instalado neste dispositivo.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-pink-500" />
                  Aniversariantes do Mês
                </CardTitle>
                <Link to={`${createPageUrl('Relatorios')}?tipo=aniversariantes`}>
                  <Button variant="ghost" size="sm">
                    Ver todos
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loadingMembros ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : aniversariantesDoMes.length > 0 ? (
                <div className="space-y-4">
                  {aniversariantesDoMes.map((membro) => (
                    <div
                      key={membro.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {membro.nome_completo?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{membro.nome_completo}</p>
                          {membro.data_nascimento && (
                            <p className="text-sm text-slate-500">
                              {format(new Date(`${membro.data_nascimento}T00:00:00`), "d 'de' MMMM", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                        {membro.tipo}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Cake className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum aniversariante este mês</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-green-500" />
                  Membros Recentes
                </CardTitle>
                <Link to={createPageUrl('Membros')}>
                  <Button variant="ghost" size="sm">
                    Ver todos
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loadingMembros ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : membrosRecentes.length > 0 ? (
                <div className="space-y-4">
                  {membrosRecentes.map((membro) => (
                    <div
                      key={membro.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {membro.nome_completo?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{membro.nome_completo}</p>
                          {membro.created_date && (
                            <p className="text-sm text-slate-500">
                              Cadastrado em {format(new Date(membro.created_date), 'd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          membro.tipo === 'membro'
                            ? 'bg-blue-100 text-blue-700'
                            : membro.tipo === 'congregado'
                            ? 'bg-green-100 text-green-700'
                            : membro.tipo === 'visitante'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-purple-100 text-purple-700'
                        }
                      >
                        {membro.tipo}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum membro cadastrado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle>Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loadingMembros ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="text-center p-4 bg-slate-50 rounded-lg space-y-2">
                    <Skeleton className="h-9 w-12 mx-auto" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(membrosPorTipo).map(([tipo, count]) => (
                  <div key={tipo} className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-3xl font-bold text-slate-900">{count}</p>
                    <p className="text-sm text-slate-500 capitalize mt-1">{`${tipo}s`}</p>
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
