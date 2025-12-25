import { base44 } from '@/api/base44Client';

export async function uploadElementSnapshot({
  element,
  fileNamePrefix,
  bucket = 'documentos',
}) {
  if (!element) return null;

  const styles = Array.from(document.querySelectorAll('style'))
    .map((style) => style.innerHTML)
    .join('\n');
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${fileNamePrefix}</title>
    <style>${styles}</style>
  </head>
  <body>
    ${element.outerHTML}
  </body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const fileName = `${fileNamePrefix}-${Date.now()}.html`;
  const file = new File([blob], fileName, { type: 'text/html' });
  return base44.integrations.Core.UploadFile({ file, bucket });
}
