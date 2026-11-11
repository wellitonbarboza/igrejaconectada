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
const MARGEM_PADRAO_MM = 10;

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
 *
 * O compartilhamento exige toque recente do usuário. Se a geração demorar e o
 * navegador bloquear (NotAllowedError), mostramos um aviso com botões para o
 * usuário tocar de novo — assim funciona em iPhone e Android.
 */
export async function salvarBlob(blob, nomeArquivo) {
  const file = typeof File !== 'undefined' ? new File([blob], nomeArquivo, { type: blob.type }) : null;
  const podeCompartilhar = !!(file && navigator.canShare?.({ files: [file] }));

  if (isMobile()) {
    if (podeCompartilhar) {
      try {
        await navigator.share({ files: [file], title: nomeArquivo });
        return 'compartilhado';
      } catch (err) {
        if (err?.name === 'AbortError') return 'cancelado';
        // NotAllowedError (gesto expirou) ou outro: oferece botão manual
      }
    }
    return mostrarAcaoManual(blob, file, nomeArquivo, podeCompartilhar);
  }

  baixarViaLink(blob, nomeArquivo);
  return 'baixado';
}

function baixarViaLink(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Painel "Arquivo pronto" com botões que o usuário toca (gesto novo). */
function mostrarAcaoManual(blob, file, nomeArquivo, podeCompartilhar) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const ehPdf = blob.type === 'application/pdf';
    const fundo = document.createElement('div');
    fundo.setAttribute('role', 'dialog');
    fundo.setAttribute('aria-label', 'Arquivo pronto');
    fundo.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    const btn = 'display:block;width:100%;padding:14px;border-radius:12px;font-size:16px;font-weight:600;text-align:center;text-decoration:none;border:0;margin-top:10px;cursor:pointer;box-sizing:border-box';
    fundo.innerHTML = `
      <div style="background:#fff;border-radius:18px;padding:20px;width:100%;max-width:420px;box-shadow:0 10px 40px rgba(0,0,0,.3)">
        <p style="margin:0;font-size:17px;font-weight:700;color:#0f172a">Arquivo pronto</p>
        <p style="margin:6px 0 4px;font-size:14px;color:#475569;word-break:break-all">${nomeArquivo.replace(/</g, '&lt;')}</p>
        ${podeCompartilhar ? `<button data-acao="share" style="${btn};background:linear-gradient(90deg,#3b82f6,#9333ea);color:#fff">Salvar / Compartilhar / Imprimir</button>` : ''}
        <a data-acao="abrir" href="${url}" target="_blank" rel="noopener" style="${btn};background:${podeCompartilhar ? '#f1f5f9;color:#0f172a' : 'linear-gradient(90deg,#3b82f6,#9333ea);color:#fff'}">Abrir ${ehPdf ? 'PDF' : 'arquivo'}</a>
        <a data-acao="baixar" href="${url}" download="${nomeArquivo.replace(/"/g, '')}" style="${btn};background:#f1f5f9;color:#0f172a">Baixar</a>
        <button data-acao="fechar" style="${btn};background:transparent;color:#64748b">Fechar</button>
      </div>`;

    const fechar = (resultado) => {
      fundo.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      resolve(resultado);
    };

    fundo.addEventListener('click', async (ev) => {
      const alvo = ev.target.closest('[data-acao]');
      if (!alvo) {
        if (ev.target === fundo) fechar('cancelado');
        return;
      }
      const acao = alvo.dataset.acao;
      if (acao === 'share') {
        try {
          await navigator.share({ files: [file], title: nomeArquivo });
          fechar('compartilhado');
        } catch (err) {
          if (err?.name !== 'AbortError') window.alert('Não foi possível compartilhar. Use "Abrir PDF" ou "Baixar".');
        }
      } else if (acao === 'abrir' || acao === 'baixar') {
        window.setTimeout(() => fechar(acao === 'abrir' ? 'aberto' : 'baixado'), 400);
      } else {
        fechar('cancelado');
      }
    });

    document.body.appendChild(fundo);
  });
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
  const { orientacao = 'retrato', escala = 2, titulo, margemMm = MARGEM_PADRAO_MM } = opcoes;
  const MARGEM_MM = margemMm;

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
 * No celular gera o PDF e abre o compartilhamento — de lá dá para imprimir.
 */
export async function imprimirElemento(elemento, { titulo = 'Relatório', orientacao = 'retrato', nomeArquivo, margemMm } = {}) {
  if (!elemento) throw new Error('Nada para imprimir.');

  // Celular: impressão do navegador falha no app instalado e, no Android, o
  // iframe imprime a página inteira. Geramos o PDF e o usuário imprime pelo
  // visualizador/compartilhamento do aparelho.
  if (isMobile()) {
    return baixarPdf(elemento, nomeArquivo || nomeArquivoSeguro(titulo), { orientacao, titulo, margemMm });
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
  @page { size: A4 ${orientacao === 'paisagem' ? 'landscape' : 'portrait'}; margin: ${margemMm ?? 12}mm; }
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
