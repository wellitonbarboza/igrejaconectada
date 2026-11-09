/**
 * Utilitários de impressão e download de PDF.
 *
 * Por que existe: `window.print()` direto na página imprimia a barra lateral,
 * cortava conteúdo de modais (ATA) e não funciona no app instalado (PWA) em
 * celulares. Aqui:
 *  - imprimirElemento: imprime só o elemento, via iframe isolado.
 *  - baixarPdf: gera PDF A4 (multipágina) com html2canvas + jsPDF.
 *  - salvarBlob: baixa o arquivo ou abre o compartilhamento nativo no celular
 *    (salvar em Arquivos, WhatsApp, imprimir etc.).
 */

const A4 = { retrato: { w: 210, h: 297 }, paisagem: { w: 297, h: 210 } };
const MARGEM_MM = 10;

/** Elementos ignorados na exportação. */
const deveIgnorar = (el) =>
  el?.classList?.contains('print:hidden') ||
  el?.classList?.contains('no-export') ||
  el?.dataset?.noExport !== undefined;

export const isMobile = () =>
  typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

export const isAppInstalado = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone === true);

export const nomeArquivoSeguro = (texto, ext = 'pdf') => {
  const base = String(texto || 'arquivo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);
  return `${base || 'arquivo'}.${ext}`;
};

/**
 * Salva um Blob: no celular usa o compartilhamento nativo (funciona no app
 * instalado); no computador faz download direto.
 */
export async function salvarBlob(blob, nomeArquivo) {
  const file = typeof File !== 'undefined' ? new File([blob], nomeArquivo, { type: blob.type }) : null;

  if (isMobile() && file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: nomeArquivo });
      return 'compartilhado';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelado';
      // segue para download
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // iOS antigo ignora "download": abre o arquivo em nova aba como último recurso.
  if (/iphone|ipad|ipod/i.test(navigator.userAgent || '') && !navigator.canShare) {
    window.open(url, '_blank');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'baixado';
}

/** Canvas -> Blob PNG e salva. */
export async function salvarCanvasPng(canvas, nomeArquivo) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Não foi possível gerar a imagem.');
  return salvarBlob(blob, nomeArquivo);
}

/**
 * Coleta posições (px, relativas ao elemento) onde é seguro quebrar página:
 * fim de linhas de tabela, itens de lista, cards e blocos marcados.
 */
function pontosDeQuebra(raiz) {
  const topoRaiz = raiz.getBoundingClientRect().top;
  const seletores = 'tr, li, section, [data-pdf-bloco], .pdf-bloco, p, h1, h2, h3, h4, .rounded-lg, .border-b';
  const pontos = new Set([0]);
  raiz.querySelectorAll(seletores).forEach((el) => {
    if (deveIgnorar(el)) return;
    const r = el.getBoundingClientRect();
    if (r.height > 0) pontos.add(Math.round(r.bottom - topoRaiz));
  });
  return [...pontos].sort((a, b) => a - b);
}

/**
 * Gera PDF A4 do elemento. Retorna Blob.
 * opcoes: { orientacao: 'retrato'|'paisagem', escala, titulo }
 */
export async function gerarPdf(elemento, opcoes = {}) {
  if (!elemento) throw new Error('Nada para exportar.');
  const { orientacao = 'retrato', escala = 2, titulo } = opcoes;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const larguraCss = elemento.scrollWidth;
  const quebrasCss = pontosDeQuebra(elemento);

  const canvas = await html2canvas(elemento, {
    scale: escala,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: Math.max(larguraCss, 900),
    ignoreElements: deveIgnorar,
    onclone: (doc) => {
      // Remove limites de altura/rolagem (ex.: conteúdo dentro de modal).
      doc.querySelectorAll('[role="dialog"], .overflow-y-auto, .overflow-auto').forEach((el) => {
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
      });
    },
  });

  const pagina = A4[orientacao] || A4.retrato;
  const larguraUtil = pagina.w - MARGEM_MM * 2;
  const alturaUtil = pagina.h - MARGEM_MM * 2;

  const pxPorMm = canvas.width / larguraUtil;
  const alturaPaginaPx = Math.floor(alturaUtil * pxPorMm);
  const fatorCss = canvas.width / larguraCss; // css px -> canvas px
  const quebras = quebrasCss.map((y) => Math.round(y * fatorCss)).filter((y) => y > 0 && y <= canvas.height);

  const pdf = new jsPDF({ orientation: orientacao === 'paisagem' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  if (titulo) pdf.setProperties({ title: titulo });

  let inicio = 0;
  let primeira = true;
  while (inicio < canvas.height - 2) {
    let fim = Math.min(inicio + alturaPaginaPx, canvas.height);
    if (fim < canvas.height) {
      // Quebra no último limite seguro dentro da página (desde que use ao menos 60% dela).
      const seguro = quebras.filter((y) => y > inicio + alturaPaginaPx * 0.6 && y <= fim).pop();
      if (seguro) fim = seguro;
    }
    const alturaFatia = fim - inicio;

    const fatia = document.createElement('canvas');
    fatia.width = canvas.width;
    fatia.height = alturaFatia;
    const ctx = fatia.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, fatia.width, fatia.height);
    ctx.drawImage(canvas, 0, inicio, canvas.width, alturaFatia, 0, 0, canvas.width, alturaFatia);

    if (!primeira) pdf.addPage();
    pdf.addImage(fatia.toDataURL('image/jpeg', 0.92), 'JPEG', MARGEM_MM, MARGEM_MM, larguraUtil, alturaFatia / pxPorMm);
    primeira = false;
    inicio = fim;
  }

  return pdf.output('blob');
}

/** Gera e salva/compartilha o PDF do elemento. */
export async function baixarPdf(elemento, nomeArquivo, opcoes = {}) {
  const blob = await gerarPdf(elemento, opcoes);
  return salvarBlob(blob, nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`);
}

/**
 * Imprime somente o elemento, num iframe com os estilos da página.
 * No app instalado em celular (onde a impressão do navegador falha),
 * gera o PDF e abre o compartilhamento — de lá dá para imprimir.
 */
export async function imprimirElemento(elemento, { titulo = 'Relatório', orientacao = 'retrato', nomeArquivo } = {}) {
  if (!elemento) throw new Error('Nada para imprimir.');

  if (isMobile() && isAppInstalado()) {
    return baixarPdf(elemento, nomeArquivo || nomeArquivoSeguro(titulo), { orientacao, titulo });
  }

  const clone = elemento.cloneNode(true);
  clone.querySelectorAll('*').forEach((el) => {
    if (deveIgnorar(el)) el.remove();
  });
  // Copia valores atuais de inputs (cloneNode não leva o value digitado).
  const origInputs = elemento.querySelectorAll('input, textarea, select');
  clone.querySelectorAll('input, textarea, select').forEach((el, i) => {
    if (origInputs[i]) el.setAttribute('value', origInputs[i].value);
    if (el.tagName === 'TEXTAREA' && origInputs[i]) el.textContent = origInputs[i].value;
  });

  const estilos = [...document.querySelectorAll('style, link[rel="stylesheet"]')]
    .map((n) => n.outerHTML)
    .join('\n');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden' });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><base href="${document.baseURI}">
<title>${String(titulo).replace(/</g, '&lt;')}</title>${estilos}
<style>
  @page { size: A4 ${orientacao === 'paisagem' ? 'landscape' : 'portrait'}; margin: 12mm; }
  html, body { background: #fff !important; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .shadow-lg, .shadow-xl, .shadow-2xl, .shadow-md { box-shadow: none !important; }
  tr, li, .pdf-bloco, [data-pdf-bloco] { break-inside: avoid; page-break-inside: avoid; }
  * { overflow: visible !important; max-height: none !important; }
</style></head><body></body></html>`);
  doc.close();
  doc.body.appendChild(doc.importNode(clone, true));

  await new Promise((resolve) => {
    const imgs = [...doc.images].filter((img) => !img.complete);
    let pendentes = imgs.length + 1;
    const ok = () => { pendentes -= 1; if (pendentes <= 0) resolve(); };
    imgs.forEach((img) => { img.onload = ok; img.onerror = ok; });
    window.setTimeout(ok, 350); // tempo para aplicar CSS
    window.setTimeout(resolve, 4000); // limite de segurança
  });

  const win = iframe.contentWindow;
  const limpar = () => window.setTimeout(() => iframe.remove(), 1000);
  win.onafterprint = limpar;
  win.focus();
  win.print();
  window.setTimeout(limpar, 60000);
  return 'impresso';
}
