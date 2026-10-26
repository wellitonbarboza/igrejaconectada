import React, { useLayoutEffect, useRef } from 'react';
import MemberAvatar from '@/components/membros/MemberAvatar.jsx';
import logoCartaoPadrao from '@/assets/iead-logo-cartao.png';

/**
 * Cartão de Membro — modelo A (cores da logo: azul AD + chama laranja).
 * Formato CR80 (85,6 × 54 mm). Todas as medidas internas usam `cqw`
 * (largura do próprio cartão), então o cartão escala sem cortar texto
 * tanto na tela quanto na impressão.
 */

const CARGOS = {
  cooperador: 'Cooperador',
  diacono: 'Diácono',
  presbitero: 'Presbítero',
  evangelista: 'Evangelista',
  pastor: 'Pastor',
};

/** Obreiro com cargo → mostra só o cargo; senão "Membro". */
export const categoriaCartao = (membro) => {
  const cargo = (membro?.cargo_obreiro || '').trim().toLowerCase();
  if (membro?.obreiro && cargo) return CARGOS[cargo] || membro.cargo_obreiro;
  return 'Membro';
};

/** Recebe matrícula/cartão: tipo "membro" ou marcado como obreiro. */
export const elegivelCartao = (membro) =>
  (membro?.tipo || '').toLowerCase() === 'membro' || Boolean(membro?.obreiro);

export const formatMatricula = (n) =>
  n === null || n === undefined || n === '' ? '—' : String(n).padStart(5, '0');

const formatCpf = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return cpf || '—';
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const formatData = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
};

const montarEndereco = (config) => {
  if (!config) return '';
  const cep = String(config.cep || '').replace(/\D/g, '');
  const cepFmt = cep.length === 8 ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : config.cep ? `CEP ${config.cep}` : '';
  const cidadeUf = [config.cidade?.trim(), config.estado?.trim()].filter(Boolean).join('/');
  return [config.endereco_completo?.trim(), cidadeUf, cepFmt].filter(Boolean).join(' · ');
};

/**
 * Reduz a fonte de cada elemento `.cm-fit` até caber (1 linha com
 * `.cm-one`, ou N linhas via `data-lines`). Nunca corta nem usa reticências.
 */
function useFitText(rootRef, deps) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const fit = () => {
      root.querySelectorAll('.cm-fit').forEach((el) => {
        el.style.fontSize = '';
        const base = parseFloat(getComputedStyle(el).fontSize);
        if (!base) return;
        const lines = Number(el.dataset.lines || 1);
        const oneLine = el.classList.contains('cm-one');
        let size = base;
        let guard = 0;
        const overflows = () => {
          if (oneLine) return el.scrollWidth > el.clientWidth + 0.5;
          const lh = parseFloat(getComputedStyle(el).lineHeight) || size * 1.15;
          return el.scrollHeight > lh * lines + 1 || el.scrollWidth > el.clientWidth + 0.5;
        };
        while (overflows() && size > base * 0.45 && guard < 80) {
          size -= base * 0.025;
          el.style.fontSize = `${size}px`;
          guard += 1;
        }
      });
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    if (document.fonts?.ready) document.fonts.ready.then(fit).catch(() => {});
    window.addEventListener('beforeprint', fit);
    window.addEventListener('afterprint', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('beforeprint', fit);
      window.removeEventListener('afterprint', fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export const CARTAO_CSS = `
.cm-card{
  --cm-from:#0a2a66; --cm-mid:#0f3f8f; --cm-to:#1a5cbc;
  --cm-white:#ffffff; --cm-soft:rgba(255,255,255,.78); --cm-faint:rgba(255,255,255,.08); --cm-rule:rgba(255,255,255,.3);
  --cm-orange:#f7941d; --cm-flame:#e8401c; --cm-red:#c8102e;
  container-type:inline-size; position:relative; width:100%; max-width:100%; aspect-ratio:85.6/54;
  border-radius:3.3cqw; overflow:hidden; color:var(--cm-white); font-family:inherit;
  background:linear-gradient(135deg,var(--cm-from) 0%,var(--cm-mid) 50%,var(--cm-to) 100%);
  box-shadow:0 18px 40px -12px rgba(15,63,147,.45),0 2px 6px rgba(10,30,80,.18);
  -webkit-print-color-adjust:exact; print-color-adjust:exact; break-inside:avoid;
}
.cm-card::before,.cm-card::after{content:"";position:absolute;border-radius:50%;pointer-events:none}
.cm-card::before{width:46cqw;height:46cqw;top:-18cqw;right:-14cqw;background:radial-gradient(circle at 35% 65%,rgba(247,148,29,.30),rgba(232,64,28,.12) 55%,transparent 71%)}
.cm-card::after{width:28cqw;height:28cqw;bottom:-12cqw;left:-10cqw;background:var(--cm-faint)}
.cm-flame{position:absolute;left:0;right:0;bottom:0;height:1.2cqw;z-index:2;background:linear-gradient(90deg,var(--cm-orange),var(--cm-flame) 70%,var(--cm-red))}
.cm-in{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;padding:5.4cqw 6.8cqw 6cqw}
.cm-fit{overflow:hidden}
.cm-one{white-space:nowrap}
.cm-head{display:grid;grid-template-columns:auto 1fr;gap:3cqw;align-items:center}
.cm-logo{width:11cqw;height:auto;display:block}
.cm-head-txt{display:grid;gap:.5cqw;min-width:0}
.cm-church{font-size:4.4cqw;font-weight:800;line-height:1.15;letter-spacing:-.01em}
.cm-sub{font-size:2.5cqw;color:var(--cm-soft);line-height:1.3}
.cm-who{display:grid;grid-template-columns:18.5cqw 1fr;gap:4.6cqw;align-items:center;margin-top:4.2cqw}
.cm-photo{width:18.5cqw;height:18.5cqw;border-radius:50%;border:.55cqw solid var(--cm-white);overflow:hidden}
.cm-photo > *{width:100% !important;height:100% !important;border:0 !important}
.cm-photo span{font-size:7cqw !important}
.cm-who-txt{display:grid;gap:1.8cqw;min-width:0}
.cm-name{font-size:5.1cqw;font-weight:800;line-height:1.12;letter-spacing:-.01em}
.cm-pill{justify-self:start;background:linear-gradient(90deg,var(--cm-orange),var(--cm-flame));color:#fff;font-size:2.4cqw;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.9cqw 3cqw;border-radius:5cqw;line-height:1.25}
.cm-meta{margin-top:auto;display:flex;align-items:end}
.cm-mat{font-size:2.6cqw;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.cm-mat span{color:var(--cm-soft);font-weight:500}
.cm-back-head{display:flex;justify-content:space-between;align-items:baseline;gap:3cqw;padding-bottom:1.8cqw;border-bottom:.25cqw solid var(--cm-rule)}
.cm-back-head .t{font-size:3.2cqw;font-weight:700}
.cm-back-head .m{font-size:2.4cqw;color:var(--cm-soft);white-space:nowrap;font-variant-numeric:tabular-nums}
.cm-grid{display:grid;grid-template-columns:1fr 1fr;gap:2.2cqw 4.4cqw;margin-top:2.6cqw}
.cm-grid .full{grid-column:1/-1}
.cm-grid > div{min-width:0}
.cm-lbl{font-size:1.85cqw;letter-spacing:.1em;text-transform:uppercase;color:var(--cm-soft);font-weight:600;line-height:1.2}
.cm-val{font-size:2.9cqw;font-weight:600;line-height:1.22;font-variant-numeric:tabular-nums}
.cm-sign{margin-top:auto;display:grid;justify-items:center;gap:.4cqw}
.cm-sig-box{width:48cqw;height:8.6cqw;display:grid;place-items:end center}
.cm-sig-box img{max-height:8.6cqw;max-width:48cqw;object-fit:contain;filter:brightness(0) invert(1)}
.cm-sig-line{width:52cqw;border-top:.28cqw solid var(--cm-white)}
.cm-sig-name{font-size:2.55cqw;font-weight:700;text-align:center;width:60cqw}
.cm-sig-role{font-size:1.8cqw;letter-spacing:.14em;text-transform:uppercase;color:var(--cm-soft)}
`;

export function CartaoFrente({ membro, config, nomeIgreja }) {
  const ref = useRef(null);
  const endereco = montarEndereco(config);
  useFitText(ref, [membro?.id, membro?.nome_completo, nomeIgreja, endereco]);
  // Logo configurada da igreja (deve ser PNG sem fundo); senão, logo IEAD sem fundo para fundo azul.
  const logo = config?.logo_url || logoCartaoPadrao;

  return (
    <div className="cm-card" ref={ref}>
      <span className="cm-flame" />
      <div className="cm-in">
        <div className="cm-head">
          <img className="cm-logo" src={logo} alt={`Logo ${nomeIgreja}`} />
          <div className="cm-head-txt">
            <div className="cm-church cm-fit" data-lines="2">{nomeIgreja}</div>
            {endereco && <div className="cm-sub cm-fit cm-one">{endereco}</div>}
            <div className="cm-sub">Cartão de Membro</div>
          </div>
        </div>
        <div className="cm-who">
          <div className="cm-photo">
            <MemberAvatar membro={membro} sizeClass="w-full h-full" textClass="" />
          </div>
          <div className="cm-who-txt">
            <div className="cm-name cm-fit" data-lines="2">{membro.nome_completo}</div>
            <div className="cm-pill">{categoriaCartao(membro)}</div>
          </div>
        </div>
        <div className="cm-meta">
          <div className="cm-mat"><span>Matrícula </span>{formatMatricula(membro.matricula)}</div>
        </div>
      </div>
    </div>
  );
}

export function CartaoVerso({ membro, config }) {
  const ref = useRef(null);
  const filiacao = [membro.pai, membro.mae].map((v) => v?.trim()).filter(Boolean).join(' e ') || '—';
  const pastor = config?.pastor_presidente?.trim() || '';
  useFitText(ref, [membro?.id, filiacao, pastor, membro?.cpf]);

  return (
    <div className="cm-card" ref={ref}>
      <span className="cm-flame" />
      <div className="cm-in">
        <div className="cm-back-head">
          <span className="t">Dados do membro</span>
          <span className="m">Matrícula {formatMatricula(membro.matricula)}</span>
        </div>
        <div className="cm-grid">
          <div><div className="cm-lbl">CPF</div><div className="cm-val cm-fit cm-one">{formatCpf(membro.cpf)}</div></div>
          <div><div className="cm-lbl">Data de nascimento</div><div className="cm-val cm-fit cm-one">{formatData(membro.data_nascimento)}</div></div>
          <div className="full"><div className="cm-lbl">Batismo nas águas</div><div className="cm-val cm-fit cm-one">{formatData(membro.data_batismo)}</div></div>
          <div className="full"><div className="cm-lbl">Filiação</div><div className="cm-val cm-fit" data-lines="2">{filiacao}</div></div>
        </div>
        <div className="cm-sign">
          <div className="cm-sig-box">
            {config?.assinatura_url && <img src={config.assinatura_url} alt="Assinatura do pastor presidente" />}
          </div>
          <div className="cm-sig-line" />
          {pastor && <div className="cm-sig-name cm-fit cm-one">{pastor}</div>}
          <div className="cm-sig-role">Pastor Presidente</div>
        </div>
      </div>
    </div>
  );
}
