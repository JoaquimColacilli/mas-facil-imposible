// Slide renderers — each returns an HTMLElement.
// Every slide fills 100% of its container (the phone viewport).
// Gradients and blob colors vary per slide.

// formatters + personalities are globals from wrapped.data.js

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.setAttribute('style', v);
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  const arr = Array.isArray(children) ? children : [children];
  for (const c of arr) {
    if (c == null || c === false) continue;
    if (typeof c === 'string') n.appendChild(document.createTextNode(c));
    else n.appendChild(c);
  }
  return n;
}

// Blob background generator — returns an element with positioned blobs.
function blobBg(colors, opacity = .75) {
  const wrap = el('div', { class: 'absolute inset-0 overflow-hidden', style: 'z-index:0' });
  const a = el('div', { class: 'blob blob-a', style: `left:-10%; top:-12%; width:70%; height:55%; background:${colors[0]}; opacity:${opacity}` });
  const b = el('div', { class: 'blob blob-b', style: `right:-15%; top:20%; width:80%; height:60%; background:${colors[1]}; opacity:${opacity * .85}` });
  const c = el('div', { class: 'blob blob-c', style: `left:15%; bottom:-18%; width:75%; height:55%; background:${colors[2] || colors[0]}; opacity:${opacity * .7}` });
  wrap.append(a, b, c);
  return wrap;
}

function gradientBg(from, to) {
  return el('div', { class: 'absolute inset-0', style: `background: linear-gradient(155deg, ${from} 0%, ${to} 100%); z-index:0` });
}

function slideWrap(children, opts = {}) {
  const { bg = 'light', grain = true } = opts;
  const txtCls = bg === 'dark' ? 'text-white' : 'text-ink dark:text-white';
  const s = el('div', { class: `relative w-full h-full overflow-hidden grain ${grain ? '' : 'grain-soft'} ${txtCls}` });
  const content = el('div', { class: 'relative h-full w-full flex flex-col', style: 'z-index:1' }, children);
  s.appendChild(content);
  return s;
}

// -----------------------------------------------------------------------------
// Slide 1 — Portada
// -----------------------------------------------------------------------------
function slide1(data) {
  const s = slideWrap([
    el('div', { class: 'flex-1 flex flex-col items-center justify-center px-6 stagger text-center' }, [
      // Avatar
      el('div', { class: 'relative mb-5' }, [
        el('div', { class: 'w-20 h-20 rounded-full grid place-items-center bg-white/20 backdrop-blur border border-white/30 font-sora font-bold text-2xl', style: 'color:white' }, data.user.initials),
        el('div', { class: 'absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white grid place-items-center text-xl shadow-pop' }, data.user.mood),
      ]),
      el('div', { class: 'text-[11px] uppercase tracking-[0.22em] text-white/75 font-medium mb-2' }, `MFI · ${data.year}`),
      el('h1', { class: 'font-sora font-bold text-[44px] leading-[0.95] text-white balance' }, `Tu ${data.month} en MFI`),
      el('p', { class: 'mt-3 text-white/85 text-base max-w-[280px] pretty' }, 'Un recorrido por tu mes.'),
    ]),
    el('div', { class: 'shrink-0 pb-12 flex flex-col items-center gap-3' }, [
      el('div', { class: 'w-14 h-14 rounded-full bg-white/20 backdrop-blur border border-white/30 grid place-items-center pulse-ring' }, [
        el('div', { class: 'w-0 h-0', style: 'border-left:10px solid white; border-top:7px solid transparent; border-bottom:7px solid transparent; margin-left:3px' }),
      ]),
      el('div', { class: 'text-white/80 text-sm font-medium' }, 'Tocá para empezar'),
    ]),
  ]);
  s.prepend(gradientBg('oklch(0.45 0.12 155)', 'oklch(0.50 0.10 65)'));
  s.prepend(blobBg(['oklch(0.65 0.14 155)', 'oklch(0.70 0.14 65)', 'oklch(0.55 0.14 295)'], .55));
  return s;
}

// -----------------------------------------------------------------------------
// Slide 2 — Los números del mes
// -----------------------------------------------------------------------------
function slide2(data) {
  const s = slideWrap([
    el('div', { class: 'pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium' }, 'El ritmo del mes'),
    el('div', { class: 'px-6 mt-2 stagger' }, [
      el('div', { class: 'flex items-baseline gap-2' }, [
        el('div', { 'data-count': data.totals.movements, class: 'font-sora font-bold text-white leading-none', style: 'font-size: clamp(120px, 34vw, 180px);' }, '0'),
      ]),
      el('div', { class: 'text-white font-sora font-semibold text-[22px] -mt-1' }, 'movimientos'),
      el('div', { class: 'text-white/80 mt-1 pretty max-w-[300px]' }, 'Entre ingresos, gastos, ahorros e inversiones.'),
    ]),
    el('div', { class: 'mt-auto px-6 pb-20 grid grid-cols-2 gap-3 stagger' }, [
      el('div', { class: 'rounded-xl p-4 backdrop-blur-sm', style: 'background: rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22)' }, [
        el('div', { class: 'text-[10px] uppercase tracking-wider text-white/75 font-medium' }, 'Pesos'),
        el('div', { class: 'mt-1 font-mono font-medium text-white text-[20px]' }, fmtARS(data.totals.flowARS)),
        el('div', { class: 'text-white/70 text-[11px] mt-0.5' }, 'en tus manos'),
      ]),
      el('div', { class: 'rounded-xl p-4 backdrop-blur-sm', style: 'background: rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22)' }, [
        el('div', { class: 'text-[10px] uppercase tracking-wider text-white/75 font-medium' }, 'Dólares'),
        el('div', { class: 'mt-1 font-mono font-medium text-white text-[20px]' }, fmtUSD(data.totals.flowUSD)),
        el('div', { class: 'text-white/70 text-[11px] mt-0.5' }, 'en tus manos'),
      ]),
    ]),
  ]);
  s.prepend(gradientBg('oklch(0.45 0.11 230)', 'oklch(0.42 0.12 155)'));
  s.prepend(blobBg(['oklch(0.65 0.14 230)', 'oklch(0.60 0.13 155)', 'oklch(0.55 0.12 295)'], .55));
  return s;
}

// -----------------------------------------------------------------------------
// Slide 3 — Balance
// -----------------------------------------------------------------------------
function slide3(data) {
  const pos = data.balance.ars >= 0;
  const deltaPos = data.balance.deltaVsPrev >= 0;
  const deltaCopy = pos
    ? (deltaPos ? 'Mejor que marzo. Seguí así.' : 'Un poquito menos que marzo.')
    : (deltaPos ? 'Igual mejoraste respecto a marzo.' : 'Pasa — con plan lo damos vuelta.');

  const s = slideWrap([
    el('div', { class: 'pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium' }, 'Tu balance'),
    el('div', { class: 'px-6 mt-2 stagger' }, [
      el('div', { class: 'font-sora font-bold text-white leading-[0.92] balance', style: 'font-size: clamp(48px, 13vw, 72px);', 'data-count-currency': data.balance.ars }, fmtARS(data.balance.ars, true)),
      el('div', { class: 'mt-3 text-white/90 text-[15px] pretty max-w-[320px]' }, pos
        ? `Ingresaste ${fmtARS(data.balance.income)} y gastaste ${fmtARS(data.balance.expense)}.`
        : `Ingresaste ${fmtARS(data.balance.income)} pero gastaste ${fmtARS(data.balance.expense)}.`
      ),
      el('div', { class: 'mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full', style: `background:${deltaPos?'rgba(16,185,129,.22)':'rgba(239,68,68,.22)'}; border:1px solid ${deltaPos?'rgba(16,185,129,.4)':'rgba(239,68,68,.4)'}` }, [
        el('span', { class: 'font-sora font-semibold text-white', html: (deltaPos ? '↑' : '↓') + ' ' + Math.abs(data.balance.deltaVsPrev) + '%' }),
        el('span', { class: 'text-white/85 text-sm' }, 'vs marzo'),
      ]),
      el('div', { class: 'mt-2 text-white/85 text-sm' }, deltaCopy),
    ]),
    el('div', { class: 'mt-auto px-6 pb-20 stagger' }, [
      el('div', { class: 'rounded-xl p-3.5 flex items-center gap-3', style: 'background: rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.22)' }, [
        el('div', { class: 'w-9 h-9 rounded-lg grid place-items-center', style: 'background:rgba(255,255,255,.18); color:white' }, [
          el('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: '<path d="M12 2v20M5 9h14M5 15h14"/>' }),
        ]),
        el('div', { class: 'flex-1' }, [
          el('div', { class: 'text-[10px] uppercase tracking-wider text-white/70 font-medium' }, 'En dólares'),
          el('div', { class: 'font-mono text-white font-medium' }, (pos ? '+ ' : '− ') + fmtUSD(Math.abs(data.balance.usd))),
        ]),
      ]),
    ]),
  ]);
  const g1 = pos ? 'oklch(0.45 0.12 155)' : 'oklch(0.48 0.15 15)';
  const g2 = pos ? 'oklch(0.50 0.11 230)' : 'oklch(0.50 0.12 65)';
  s.prepend(gradientBg(g1, g2));
  s.prepend(blobBg(pos
    ? ['oklch(0.65 0.14 155)', 'oklch(0.65 0.13 230)', 'oklch(0.60 0.11 65)']
    : ['oklch(0.65 0.16 15)', 'oklch(0.65 0.13 65)', 'oklch(0.55 0.12 295)']
  , .55));
  return s;
}

// -----------------------------------------------------------------------------
// Slide 4 — Top categoría
// -----------------------------------------------------------------------------
function slide4(data) {
  const c = data.topCategory;
  const maxAmt = Math.max(...c.breakdown.map(b => b.amount));
  const s = slideWrap([
    el('div', { class: 'pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium' }, `En ${data.month.toLowerCase()} gastaste más en…`),
    el('div', { class: 'px-6 mt-3 stagger' }, [
      el('div', { class: 'flex items-center gap-4' }, [
        el('div', { class: 'w-16 h-16 rounded-2xl grid place-items-center', style: `background: ${c.color}33; border:1px solid ${c.color}66; color: white` }, [
          el('svg', { width: 30, height: 30, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>' }),
        ]),
        el('div', { class: 'flex-1 min-w-0' }, [
          el('div', { class: 'text-white/85 text-[12px] uppercase tracking-wider font-medium' }, 'Categoría top'),
          el('div', { class: 'font-sora font-bold text-white text-[28px] leading-tight truncate' }, c.name),
        ]),
      ]),
      el('div', { class: 'mt-4 font-sora font-bold text-white leading-none', style: 'font-size: clamp(58px, 16vw, 84px);', 'data-count-currency': c.amount }, fmtARS(c.amount)),
      el('div', { class: 'mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25' }, [
        el('span', { class: 'font-sora font-semibold text-white' }, c.pctOfExpenses + '%'),
        el('span', { class: 'text-white/85 text-sm' }, 'de tus gastos'),
      ]),
    ]),
    el('div', { class: 'mt-auto px-6 pb-20' }, [
      el('div', { class: 'text-[10px] uppercase tracking-wider text-white/70 font-medium mb-2' }, 'Top 3 del mes'),
      el('div', { class: 'space-y-2' }, c.breakdown.map((b, i) => (
        el('div', { class: 'flex items-center gap-3 slide-enter', style: `animation-delay:${.2 + i*.12}s` }, [
          el('div', { class: 'w-6 text-[11px] font-mono text-white/75' }, '0' + (i + 1)),
          el('div', { class: 'flex-1 min-w-0' }, [
            el('div', { class: 'flex items-baseline justify-between gap-2' }, [
              el('div', { class: 'text-white font-medium text-sm truncate' }, b.name),
              el('div', { class: 'font-mono text-white text-[12px] shrink-0' }, fmtARS(b.amount)),
            ]),
            el('div', { class: 'mt-1 h-1.5 rounded-full bg-white/15 overflow-hidden' }, [
              el('div', { class: 'h-full rounded-full', style: `width:${(b.amount/maxAmt)*100}%; background:${b.color}` }),
            ]),
          ]),
        ])
      ))),
    ]),
  ]);
  s.prepend(gradientBg('oklch(0.45 0.14 15)', 'oklch(0.50 0.11 65)'));
  s.prepend(blobBg(['oklch(0.65 0.16 15)', 'oklch(0.68 0.13 65)', 'oklch(0.55 0.10 30)'], .55));
  return s;
}

// -----------------------------------------------------------------------------
// Slide 5 — Qué pudiste haber comprado (KEY SLIDE)
// -----------------------------------------------------------------------------
function slide5(data) {
  const amt = data.topCategory.amount;
  const s = slideWrap([
    el('div', { class: 'pt-14 px-6 stagger' }, [
      el('div', { class: 'text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium' }, 'Si no gastabas esos'),
      el('div', { class: 'mt-1 font-sora font-bold text-white leading-[0.9] balance', style: 'font-size: clamp(44px, 12vw, 64px);' }, fmtARS(amt)),
      el('div', { class: 'mt-2 text-white/85 text-base pretty max-w-[280px]' }, 'te alcanzaba para…'),
    ]),
    el('div', { class: 'flex-1 px-6 mt-4 flex flex-col justify-center gap-3 stagger' },
      data.equivalents.map((e, i) => (
        el('div', { class: 'relative rounded-2xl p-5 flex items-center gap-4 overflow-hidden', style: `background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.28); backdrop-filter: blur(6px);` }, [
          el('div', { class: 'shrink-0 w-16 h-16 rounded-xl grid place-items-center text-4xl', style: 'background:rgba(255,255,255,.22)' }, e.emoji),
          el('div', { class: 'flex-1 min-w-0' }, [
            el('div', { class: 'flex items-baseline gap-2' }, [
              el('div', { class: 'font-sora font-bold text-white leading-none', style: 'font-size: clamp(40px, 11vw, 54px);' }, fmtNum(e.n)),
              el('div', { class: 'font-sora font-medium text-white/90 text-[18px]' }, e.label),
            ]),
            el('div', { class: 'mt-1 font-mono text-[11px] text-white/70' }, `ref. ${fmtARS(e.ref)} c/u`),
          ]),
        ])
      ))
    ),
    el('div', { class: 'shrink-0 px-6 pb-20' }, [
      el('div', { class: 'rounded-xl p-3 flex items-start gap-2 bg-white/10 border border-white/20' }, [
        el('span', { class: 'text-lg leading-none mt-0.5' }, '😉'),
        el('div', { class: 'text-white/90 text-[13px] pretty' }, 'No estamos diciendo que no lo gastes, solo que lo sepas.'),
      ]),
    ]),
  ]);
  s.prepend(gradientBg('oklch(0.42 0.14 15)', 'oklch(0.55 0.13 65)'));
  s.prepend(blobBg(['oklch(0.68 0.16 15)', 'oklch(0.72 0.14 65)', 'oklch(0.60 0.13 30)'], .7));
  return s;
}

// -----------------------------------------------------------------------------
// Slide 6 — Día más caro (sparkline)
// -----------------------------------------------------------------------------
function sparkline(daily, peakIdx, w = 320, h = 60) {
  const max = Math.max(...daily);
  const step = w / (daily.length - 1);
  const pts = daily.map((v, i) => [i * step, h - (v / max) * h]);
  const d = pts.map((p, i) => (i === 0 ? `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(' ');
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  const peak = pts[peakIdx];
  return el('svg', { width: '100%', height: h, viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none' }, [
    el('path', { d: area, fill: 'rgba(255,255,255,0.18)' }),
    el('path', { d, fill: 'none', stroke: 'rgba(255,255,255,0.85)', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
    el('line', { x1: peak[0], y1: 0, x2: peak[0], y2: h, stroke: 'rgba(255,255,255,0.35)', 'stroke-dasharray': '2 3' }),
    el('circle', { cx: peak[0], cy: peak[1], r: 5, fill: 'white' }),
    el('circle', { cx: peak[0], cy: peak[1], r: 9, fill: 'none', stroke: 'white', 'stroke-opacity': '0.5' }),
  ]);
}

function slide6(data) {
  const d = data.peakDay;
  const peakIdx = d.daily.indexOf(Math.max(...d.daily));
  const s = slideWrap([
    el('div', { class: 'pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium' }, 'Tu día más intenso'),
    el('div', { class: 'px-6 mt-2 stagger' }, [
      el('div', { class: 'font-sora font-bold text-white text-[26px] leading-tight' }, d.date),
      el('div', { class: 'mt-2 font-sora font-bold text-white leading-none', style: 'font-size: clamp(56px, 15vw, 80px);', 'data-count-currency': d.amount }, fmtARS(d.amount)),
      el('div', { class: 'mt-1 text-white/80 text-sm' }, 'gastados en un solo día'),
    ]),
    el('div', { class: 'px-6 mt-5 stagger' }, [
      el('div', { class: 'text-[10px] uppercase tracking-wider text-white/70 font-medium mb-2' }, 'Lo que pasó ese lunes'),
      el('div', { class: 'space-y-1.5' }, d.items.map(it => (
        el('div', { class: 'flex items-center justify-between rounded-lg px-3 py-2', style: 'background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.18)' }, [
          el('span', { class: 'text-white text-sm font-medium' }, it.cat),
          el('span', { class: 'font-mono text-white text-[13px]' }, fmtARS(it.amount)),
        ])
      ))),
    ]),
    el('div', { class: 'mt-auto px-6 pb-20' }, [
      el('div', { class: 'text-[10px] uppercase tracking-wider text-white/70 font-medium mb-2' }, 'Gasto por día · abril'),
      el('div', { class: 'rounded-xl p-3', style: 'background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18)' }, [
        sparkline(d.daily, peakIdx, 320, 64),
        el('div', { class: 'mt-1 flex items-center justify-between text-[10px] font-mono text-white/70' }, [
          el('span', {}, '01'), el('span', {}, '14 · pico'), el('span', {}, '30'),
        ]),
      ]),
    ]),
  ]);
  s.prepend(gradientBg('oklch(0.40 0.08 260)', 'oklch(0.48 0.14 15)'));
  s.prepend(blobBg(['oklch(0.55 0.14 295)', 'oklch(0.65 0.15 15)', 'oklch(0.60 0.10 260)'], .55));
  return s;
}

// -----------------------------------------------------------------------------
// Slide 7 — Ahorro + Inversión
// -----------------------------------------------------------------------------
function slide7(data) {
  const sv = data.savings;
  const total = sv.savings + sv.investment;
  const posDelta = sv.deltaVsPrev >= 0;
  const s = slideWrap([
    el('div', { class: 'pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium' }, 'Apartaste para vos'),
    el('div', { class: 'px-6 mt-2 stagger' }, [
      el('div', { class: 'font-sora font-bold text-white leading-none', style: 'font-size: clamp(60px, 16vw, 84px);', 'data-count-currency': total }, fmtARS(total)),
      el('div', { class: 'mt-1 text-white/85 text-base' }, 'entre ahorros e inversiones'),
    ]),
    el('div', { class: 'px-6 mt-5 grid grid-cols-2 gap-2.5 stagger' }, [
      el('div', { class: 'rounded-xl p-3.5', style: 'background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.25)' }, [
        el('div', { class: 'flex items-center gap-2 text-white/80 text-[11px] uppercase tracking-wider font-medium' }, [
          el('span', { class: 'text-base' }, '🏦'),
          el('span', {}, 'Ahorros'),
        ]),
        el('div', { class: 'mt-1 font-mono font-medium text-white text-[19px]' }, fmtARS(sv.savings)),
      ]),
      el('div', { class: 'rounded-xl p-3.5', style: 'background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.25)' }, [
        el('div', { class: 'flex items-center gap-2 text-white/80 text-[11px] uppercase tracking-wider font-medium' }, [
          el('span', { class: 'text-base' }, '📈'),
          el('span', {}, 'Inversiones'),
        ]),
        el('div', { class: 'mt-1 font-mono font-medium text-white text-[19px]' }, fmtARS(sv.investment)),
      ]),
    ]),
    el('div', { class: 'mt-auto px-6 pb-20 space-y-2.5 stagger' }, [
      el('div', { class: 'rounded-xl px-4 py-3 flex items-center gap-3', style: `background:${posDelta?'rgba(16,185,129,.18)':'rgba(239,68,68,.18)'}; border:1px solid ${posDelta?'rgba(16,185,129,.38)':'rgba(239,68,68,.38)'}` }, [
        el('div', { class: 'font-sora font-bold text-white text-xl' }, (posDelta?'+':'−') + Math.abs(sv.deltaVsPrev) + '%'),
        el('div', { class: 'text-white/90 text-sm pretty flex-1' }, posDelta ? 'que el mes anterior — dale, seguí así.' : 'que el mes anterior — la levantás.'),
      ]),
      sv.yield !== 0 && el('div', { class: 'rounded-xl px-4 py-3 flex items-center gap-3 bg-white/10 border border-white/20' }, [
        el('div', { class: 'w-9 h-9 rounded-lg grid place-items-center bg-white/15 text-white' }, [
          el('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' }),
        ]),
        el('div', { class: 'flex-1 text-white/90 text-sm' }, [
          'Tus inversiones rindieron ',
          el('span', { class: 'font-mono font-medium', style: `color:${sv.yield>=0?'#a7f3d0':'#fecaca'}` }, (sv.yield >= 0 ? '+' : '') + sv.yield.toString().replace('.', ',') + '%'),
        ]),
      ]),
    ]),
  ]);
  s.prepend(gradientBg('oklch(0.45 0.12 155)', 'oklch(0.48 0.14 295)'));
  s.prepend(blobBg(['oklch(0.65 0.14 155)', 'oklch(0.62 0.16 295)', 'oklch(0.58 0.12 230)'], .55));
  return s;
}

// -----------------------------------------------------------------------------
// Slide 8 — Metas
// -----------------------------------------------------------------------------
function slide8(data) {
  const g = data.goal;
  const s = slideWrap([
    el('div', { class: 'pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium' }, 'Tus metas este mes'),
    el('div', { class: 'px-6 mt-3 stagger' }, [
      el('div', { class: 'rounded-2xl p-5', style: `background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.28); backdrop-filter: blur(8px);` }, [
        el('div', { class: 'flex items-center gap-3' }, [
          el('div', { class: 'w-12 h-12 rounded-xl grid place-items-center', style: `background:${g.color}33; border:1px solid ${g.color}66; color:white` }, [
            el('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>' }),
          ]),
          el('div', { class: 'flex-1 min-w-0' }, [
            el('div', { class: 'text-white/75 text-[11px] uppercase tracking-wider font-medium' }, 'Más cerca de completar'),
            el('div', { class: 'font-sora font-bold text-white text-[22px] truncate leading-tight' }, g.name),
          ]),
        ]),
        el('div', { class: 'mt-5 flex items-baseline gap-2' }, [
          el('div', { class: 'font-sora font-bold text-white leading-none', style: 'font-size: clamp(54px, 15vw, 72px);', 'data-count': g.pct, 'data-count-suffix': '%' }, '0%'),
          el('div', { class: 'font-mono text-white/80 text-sm' }, 'completada'),
        ]),
        el('div', { class: 'mt-3 h-3 rounded-full bg-white/20 overflow-hidden' }, [
          el('div', { class: 'h-full rounded-full transition-all duration-1000', style: `width:${g.pct}%; background:linear-gradient(90deg, #fff, ${g.color})` }),
        ]),
        el('div', { class: 'mt-2 flex items-center justify-between font-mono text-[12px] text-white/85' }, [
          el('span', {}, fmtARS(g.current)),
          el('span', {}, 'de ' + fmtARS(g.target)),
        ]),
      ]),
    ]),
    el('div', { class: 'mt-auto px-6 pb-20 stagger' }, [
      el('div', { class: 'rounded-xl px-4 py-3 flex items-center gap-3 bg-white/12 border border-white/22' }, [
        el('span', { class: 'text-2xl' }, '🎯'),
        el('div', { class: 'text-white text-[15px]' }, [
          'Completaste ',
          el('span', { class: 'font-sora font-bold' }, g.completedThisMonth + ' metas'),
          ' este mes.',
        ]),
      ]),
    ]),
  ]);
  s.prepend(gradientBg('oklch(0.42 0.12 230)', 'oklch(0.48 0.10 155)'));
  s.prepend(blobBg(['oklch(0.65 0.13 230)', 'oklch(0.60 0.12 155)', 'oklch(0.58 0.14 260)'], .55));
  return s;
}

// -----------------------------------------------------------------------------
// Slide 9 — Personalidad financiera
// -----------------------------------------------------------------------------
function slide9(data) {
  const p = PERSONALITIES[data.personality];
  const s = slideWrap([
    el('div', { class: 'pt-14 px-6 text-white/80 text-[12px] uppercase tracking-[0.22em] font-medium text-center' }, 'Tu personalidad del mes'),
    el('div', { class: 'flex-1 px-6 flex flex-col items-center justify-center gap-5 stagger' }, [
      // Collectible card
      el('div', { class: 'relative rounded-[22px] w-[260px] aspect-[3/4] overflow-hidden grain', style: `background: linear-gradient(155deg, ${p.g1} 0%, ${p.g2} 100%); box-shadow: 0 30px 80px -30px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.18);` }, [
        el('div', { class: 'absolute inset-0', style: 'background: radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.22), transparent 60%); pointer-events:none;' }),
        el('div', { class: 'relative h-full flex flex-col p-5', style: 'z-index:1' }, [
          el('div', { class: 'flex items-center justify-between text-white/75 text-[10px] uppercase tracking-[0.2em] font-medium' }, [
            el('span', {}, 'MFI · 2026'),
            el('span', { class: 'font-mono' }, '#' + (p.id.charCodeAt(0) + p.id.charCodeAt(1)).toString().padStart(3, '0')),
          ]),
          el('div', { class: 'flex-1 grid place-items-center' }, [
            el('div', { class: 'text-[110px] leading-none select-none drop-shadow-lg' }, p.emoji),
          ]),
          el('div', {}, [
            el('div', { class: 'text-white/70 text-[10px] uppercase tracking-[0.22em] font-medium' }, 'Sos'),
            el('div', { class: 'mt-0.5 font-sora font-bold text-white text-[26px] leading-[0.95] balance' }, p.label),
          ]),
        ]),
      ]),
      el('div', { class: 'max-w-[320px] text-center px-2' }, [
        el('p', { class: 'text-white/90 text-[15px] pretty leading-relaxed' }, p.desc),
        el('div', { class: 'mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 font-mono text-[12px] text-white' }, [
          el('span', { class: 'w-1.5 h-1.5 rounded-full bg-white' }),
          el('span', {}, p.micro),
        ]),
      ]),
    ]),
    el('div', { class: 'shrink-0 pb-20' }),
  ]);
  s.prepend(gradientBg(p.g1, p.g2));
  s.prepend(blobBg([p.g1, p.g2, 'oklch(0.55 0.12 295)'], .5));
  return s;
}

// -----------------------------------------------------------------------------
// Slide 10 — Cierre + compartir
// -----------------------------------------------------------------------------
function shareCard(data, opts = {}) {
  const p = PERSONALITIES[data.personality];
  const peakIdx = data.peakDay.daily.indexOf(Math.max(...data.peakDay.daily));
  const { ratio = 'feed' } = opts; // feed 4:5 (1080x1350) or story 9:16 (1080x1920)
  const aspectCls = ratio === 'story' ? 'aspect-[9/16]' : 'aspect-[4/5]';
  return el('div', { class: `relative w-full ${aspectCls} rounded-2xl overflow-hidden grain shadow-deep`, style: `background: linear-gradient(155deg, ${p.g1} 0%, ${p.g2} 100%);` }, [
    el('div', { class: 'absolute inset-0 overflow-hidden', style: 'z-index:0' }, [
      el('div', { class: 'blob', style: `left:-10%; top:-14%; width:65%; height:45%; background:${p.g1}; opacity:.6` }),
      el('div', { class: 'blob', style: `right:-12%; bottom:-12%; width:70%; height:50%; background:${p.g2}; opacity:.6` }),
    ]),
    el('div', { class: 'relative h-full w-full flex flex-col p-6 text-white', style: 'z-index:1' }, [
      el('div', { class: 'flex items-center justify-between' }, [
        el('div', { class: 'flex items-center gap-2' }, [
          el('div', { class: 'w-6 h-6 rounded-md grid place-items-center bg-white text-sage font-sora font-bold text-[11px]' }, 'M'),
          el('div', { class: 'font-sora font-semibold text-[13px]' }, 'MFI'),
        ]),
        el('div', { class: 'text-[10px] uppercase tracking-[0.22em] font-medium text-white/75' }, `${data.month} · ${data.year}`),
      ]),
      el('div', { class: 'mt-5' }, [
        el('div', { class: 'text-white/80 text-[11px] uppercase tracking-[0.22em] font-medium' }, 'Sos'),
        el('div', { class: 'font-sora font-bold leading-[0.95] balance', style: 'font-size: clamp(36px, 6vw, 56px);' }, p.label),
      ]),
      el('div', { class: 'mt-4 grid grid-cols-2 gap-2' }, [
        el('div', { class: 'rounded-xl p-3', style: 'background: rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22)' }, [
          el('div', { class: 'text-[10px] uppercase tracking-wider text-white/70 font-medium' }, 'Balance'),
          el('div', { class: 'mt-0.5 font-mono font-medium text-white text-[15px]' }, fmtARS(data.balance.ars, true)),
        ]),
        el('div', { class: 'rounded-xl p-3', style: 'background: rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22)' }, [
          el('div', { class: 'text-[10px] uppercase tracking-wider text-white/70 font-medium' }, 'Ahorro'),
          el('div', { class: 'mt-0.5 font-mono font-medium text-white text-[15px]' }, fmtARS(data.savings.savings + data.savings.investment)),
        ]),
        el('div', { class: 'rounded-xl p-3 col-span-2', style: 'background: rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22)' }, [
          el('div', { class: 'flex items-center justify-between' }, [
            el('div', {}, [
              el('div', { class: 'text-[10px] uppercase tracking-wider text-white/70 font-medium' }, 'Gastaste más en'),
              el('div', { class: 'mt-0.5 font-sora font-semibold text-white text-[15px]' }, data.topCategory.name),
            ]),
            el('div', { class: 'text-right' }, [
              el('div', { class: 'font-mono text-white text-[13px]' }, fmtARS(data.topCategory.amount)),
              el('div', { class: 'text-[10px] text-white/70' }, data.topCategory.pctOfExpenses + '% del total'),
            ]),
          ]),
        ]),
      ]),
      el('div', { class: 'mt-4 rounded-xl p-3', style: 'background: rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.20)' }, [
        el('div', { class: 'text-[10px] uppercase tracking-wider text-white/70 font-medium mb-1' }, 'Ritmo de gasto'),
        sparkline(data.peakDay.daily, peakIdx, 400, 44),
      ]),
      el('div', { class: 'mt-auto flex items-end justify-between' }, [
        el('div', { class: 'text-white/80 text-[11px]' }, [
          el('div', { class: 'font-mono' }, data.user.initials + ' · ' + data.user.name),
          el('div', { class: 'text-white/60' }, 'mfi.app'),
        ]),
        el('div', { class: 'text-6xl leading-none' }, p.emoji),
      ]),
    ]),
  ]);
}

function slide10(data) {
  const s = slideWrap([
    el('div', { class: 'pt-12 px-6 text-center stagger' }, [
      el('div', { class: 'text-white/80 text-[12px] uppercase tracking-[0.22em] font-medium' }, `Abril · ${data.year}`),
      el('h2', { class: 'mt-1 font-sora font-bold text-white text-[26px] leading-tight balance' }, 'Ese fue tu mes.'),
    ]),
    el('div', { class: 'px-6 mt-4 flex-1 flex flex-col items-center justify-center' }, [
      el('div', { class: 'w-full max-w-[260px] slide-enter' }, [shareCard(data, { ratio: 'feed' })]),
    ]),
    el('div', { class: 'shrink-0 px-6 pb-20 stagger' }, [
      el('div', { class: 'grid grid-cols-3 gap-2 mt-4' }, [
        el('button', { class: 'rounded-xl h-11 flex items-center justify-center gap-1.5 bg-white text-sage font-sora font-semibold text-[13px] shadow-pop' }, [
          el('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>' }),
          'Compartir',
        ]),
        el('button', { class: 'rounded-xl h-11 flex items-center justify-center gap-1.5 bg-white/15 border border-white/25 text-white font-sora font-medium text-[13px]' }, [
          el('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: '<path d="M8 2H20V22H4V6z"/><path d="M8 2v4H4"/>' }),
          'Excel',
        ]),
        el('button', { class: 'rounded-xl h-11 flex items-center justify-center gap-1.5 bg-white/15 border border-white/25 text-white font-sora font-medium text-[13px]' }, [
          el('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' }),
          'PDF',
        ]),
      ]),
      el('div', { class: 'text-center mt-3 text-white/80 text-sm' }, 'Nos vemos el mes que viene 👋'),
    ]),
  ]);
  const p = PERSONALITIES[data.personality];
  s.prepend(gradientBg(p.g1, p.g2));
  s.prepend(blobBg([p.g1, p.g2, 'oklch(0.55 0.12 65)'], .5));
  return s;
}

window.SLIDES = [slide1, slide2, slide3, slide4, slide5, slide6, slide7, slide8, slide9, slide10];
window.SLIDE_TITLES = ['Portada', 'Números', 'Balance', 'Top categoría', 'Qué podías comprar', 'Día más caro', 'Ahorro+Inversión', 'Metas', 'Personalidad', 'Compartir'];
window.shareCard = shareCard;
