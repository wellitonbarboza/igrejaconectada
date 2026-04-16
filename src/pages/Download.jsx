import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download as DownloadIcon, ExternalLink, Monitor, Smartphone } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import appLogo from '@/assets/church-logo.svg';

const netlifyBaseUrl =
  import.meta.env.VITE_NETLIFY_BASE_URL ||
  import.meta.env.VITE_NETLIFY_URL ||
  (typeof window !== 'undefined' ? window.location.origin : undefined);

const downloadLinks = {
  mobile: import.meta.env.VITE_DOWNLOAD_MOBILE_URL || netlifyBaseUrl,
  desktop: import.meta.env.VITE_DOWNLOAD_DESKTOP_URL || netlifyBaseUrl,
};

const platformDetails = {
  mobile: {
    label: 'celular',
    description: 'Instale o app no seu smartphone para acesso rápido à igreja.',
    helper: 'Compatível com Android e iOS via navegador. O download acontece pelo Netlify.',
    icon: Smartphone,
  },
  desktop: {
    label: 'desktop',
    description: 'Tenha o app disponível direto no computador.',
    helper: 'Compatível com Windows, macOS e Linux. O download acontece pelo Netlify.',
    icon: Monitor,
  },
};

export default function Download() {
  const { platform = 'mobile' } = useParams();
  const normalizedPlatform = platform === 'desktop' ? 'desktop' : 'mobile';
  const details = platformDetails[normalizedPlatform];
  const downloadUrl = downloadLinks[normalizedPlatform];
  const Icon = details.icon;

  const handleDownload = () => {
    if (!downloadUrl || typeof window === 'undefined') return;
    window.location.assign(downloadUrl);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to={createPageUrl('Dashboard')}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao dashboard
        </Link>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50">
            <CardTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shadow-sm">
                <img src={appLogo} alt="Logo Igreja Conectada" className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Baixar app para</p>
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-indigo-600" />
                  <span className="text-lg font-semibold text-slate-900 capitalize">{details.label}</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1 text-slate-600">
              <p>{details.description}</p>
              <p className="text-sm text-slate-500">{details.helper}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-md"
                onClick={handleDownload}
                type="button"
                disabled={!downloadUrl}
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                {downloadUrl ? 'Iniciar download' : 'Link indisponível'}
              </Button>
              {downloadUrl && (
                <Button
                  variant="outline"
                  className="border-indigo-200 text-indigo-600"
                  onClick={() => window.open(downloadUrl, '_blank', 'noreferrer')}
                  type="button"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em nova guia
                </Button>
              )}
            </div>

            {!downloadUrl && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                O link de download ainda não foi configurado. Solicite o link oficial com o administrador do sistema.
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-3">Precisa do app para outra plataforma?</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to={`${createPageUrl('Download')}/mobile`}>
                  <Button variant={normalizedPlatform === 'mobile' ? 'default' : 'outline'} className="w-full sm:w-auto">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Versão para celular
                  </Button>
                </Link>
                <Link to={`${createPageUrl('Download')}/desktop`}>
                  <Button variant={normalizedPlatform === 'desktop' ? 'default' : 'outline'} className="w-full sm:w-auto">
                    <Monitor className="w-4 h-4 mr-2" />
                    Versão para desktop
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
