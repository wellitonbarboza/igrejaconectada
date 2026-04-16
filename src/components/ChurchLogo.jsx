import React from 'react';
import { useChurch } from '@/context/ChurchContext.jsx';
import ieadLogo from '@/assets/iead-logo.svg';

/**
 * Renderiza a logo da igreja ativa (carregada a partir de Configurações).
 * Se a igreja ainda não configurou logo, usa o ícone padrão do app.
 *
 * Props:
 *  - fallback: imagem a ser usada se nenhuma logo estiver configurada
 *    (padrão: iead-logo.svg do app).
 *  - alt: texto alternativo da imagem.
 *  - className: classes utilitárias aplicadas ao <img>.
 *  - igrejaId: opcional, força a logo de uma igreja específica.
 */
export default function ChurchLogo({ fallback, alt, className, igrejaId }) {
  const { config, configsPorIgreja, igrejaAtiva } = useChurch();
  const fallbackSrc = fallback || ieadLogo;

  let logoUrl = '';
  if (igrejaId) {
    logoUrl = configsPorIgreja?.[igrejaId]?.logo_url || '';
  } else {
    logoUrl = config?.logo_url || '';
  }

  const altText =
    alt ||
    (igrejaAtiva?.nome ? `Logo ${igrejaAtiva.nome}` : 'Logo da Igreja');

  return (
    <img
      src={logoUrl || fallbackSrc}
      alt={altText}
      className={className}
      onError={(event) => {
        if (event.currentTarget.src !== fallbackSrc) {
          event.currentTarget.src = fallbackSrc;
        }
      }}
    />
  );
}
