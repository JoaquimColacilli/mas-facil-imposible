// Desktop editorial horizontal — 10 slides con layouts custom 16:9
// Each slide returns an HTMLElement that fills 100% of a 16:9 container.

// --- helpers (reuse el() from slides.js via window) ---
const _D_el = window._D_el || ((tag, attrs = {}, children = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style') n.setAttribute('style', v);
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  }
  if (!Array.isArray(children)) children = [children];
  for (const c of children) {
    if (c == null || c === false) continue;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return n;
});
window._D_el = _D_el;
const D_el = _D_el;

function _dBg(colors) {
  const bg = D_el('div', { class: 'absolute inset-0 overflow-hidden', style: `background: linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%);` });
  const a = D_el('div', { class: 'blob', style: `left:-8%; top:-15%; width:45%; height:60%; background:${colors[0]}; filter: blur(90px); opacity:.55;` });
  const b = D_el('div', { class: 'blob', style: `right:-10%; bottom:-20%; width:50%; height:65%; background:${colors[1]}; filter: blur(100px); opacity:.55;` });
  const c = D_el('div', { class: 'blob', style: `left:30%; bottom:-10%; width:40%; height:40%; background:${colors[2] || colors[0]}; filter: blur(110px); opacity:.4;` });
  bg.append(a, b, c);
  return bg;
}

function _eyebrow(text) {
  return D_el('div', { class: 'font-mono text-[12px] tracking-[0.2em] uppercase text-white/70' }, text);
}

// ========================= Slide 1: Portada editorial =========================
function dSlide1(data) {
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg(['oklch(0.45 0.10 260)', 'oklch(0.55 0.12 220)', 'oklch(0.50 0.10 155)']));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-10 px-24 py-20 text-white' });
  // Left
  const left = D_el('div', { class: 'col-span-7 flex flex-col justify-between' }, [
    D_el('div', { class: 'flex items-center gap-3' }, [
      D_el('div', { class: 'w-10 h-10 rounded-xl grid place-items-center bg-white/15 backdrop-blur', html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>' }),
      D_el('div', { class: 'font-sora font-semibold tracking-tight' }, 'MFI'),
      D_el('div', { class: 'font-mono text-[11px] tracking-widest text-white/60 ml-2' }, `· ${data.year}`),
    ]),
    D_el('div', {}, [
      _eyebrow('Tu mes en MFI'),
      D_el('h1', { class: 'font-sora font-semibold mt-4 leading-[0.88] tracking-tight', style: 'font-size: clamp(80px, 11vw, 180px);' }, data.month),
      D_el('div', { class: 'font-sora text-white/80 mt-4 max-w-[540px] text-[20px] leading-[1.4] pretty' }, `Un recorrido por tus ${data.totals.movements} movimientos. Hola, ${data.user.name.split(' ')[0]}.`),
    ]),
    D_el('div', { class: 'flex items-center gap-4' }, [
      D_el('div', { class: 'h-[2px] w-12 bg-white/50' }),
      D_el('div', { class: 'font-mono text-[11px] tracking-widest text-white/60 uppercase' }, '10 capítulos · 90 segundos'),
    ]),
  ]);
  // Right — giant mood / year mark
  const right = D_el('div', { class: 'col-span-5 relative flex items-center justify-center' }, [
    D_el('div', { class: 'absolute inset-0 grid place-items-center opacity-10 pointer-events-none' }, [
      D_el('div', { class: 'font-sora font-semibold', style: 'font-size: 360px; line-height: 1;' }, `'${String(data.year).slice(-2)}`),
    ]),
    D_el('div', { class: 'relative w-[340px] h-[340px] rounded-full grid place-items-center', style: 'background: radial-gradient(closest-side, rgba(255,255,255,.18), transparent);' }, [
      D_el('div', { class: 'text-[140px] leading-none drop-shadow-lg' }, data.user.mood || '🌤️'),
    ]),
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

// ========================= Slide 2: Números del mes =========================
function dSlide2(data) {
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg(['oklch(0.42 0.08 260)', 'oklch(0.48 0.10 220)', 'oklch(0.50 0.10 295)']));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-8 px-24 py-16 text-white' });
  const left = D_el('div', { class: 'col-span-6 flex flex-col justify-center' }, [
    _eyebrow('Empecemos por los números'),
    D_el('div', { class: 'mt-6 font-sora font-semibold leading-none tracking-tight', style: 'font-size: clamp(140px, 15vw, 240px);' }, [
      D_el('span', { 'data-count': data.totals.movements }, String(data.totals.movements)),
    ]),
    D_el('div', { class: 'font-sora text-[26px] mt-2 text-white/80' }, 'movimientos registrados'),
    D_el('div', { class: 'font-sora text-[17px] mt-8 text-white/65 max-w-[460px] pretty' }, `${data.month} fue un mes activo. Entre ingresos, gastos y transferencias, pasaste por el banco casi ${Math.round(data.totals.movements/30)} veces por día.`),
  ]);
  const right = D_el('div', { class: 'col-span-6 flex flex-col justify-center gap-5' }, [
    D_el('div', { class: 'rounded-3xl p-8 bg-white/8 border border-white/15 backdrop-blur-sm' }, [
      D_el('div', { class: 'font-mono text-[11px] tracking-widest text-white/60 uppercase mb-3' }, 'Volumen ARS'),
      D_el('div', { class: 'font-sora font-semibold leading-none', style: 'font-size: 68px;' }, [
        D_el('span', { 'data-count-currency': data.totals.flowARS }, '$ ' + new Intl.NumberFormat('es-AR').format(data.totals.flowARS)),
      ]),
    ]),
    D_el('div', { class: 'rounded-3xl p-8 bg-white/8 border border-white/15 backdrop-blur-sm' }, [
      D_el('div', { class: 'font-mono text-[11px] tracking-widest text-white/60 uppercase mb-3' }, 'Volumen USD'),
      D_el('div', { class: 'font-sora font-semibold leading-none', style: 'font-size: 68px;' }, [
        D_el('span', { 'data-count': data.totals.flowUSD, 'data-count-suffix': '' }, 'U$S ' + new Intl.NumberFormat('es-AR').format(data.totals.flowUSD)),
      ]),
    ]),
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

// ========================= Slide 3: Balance =========================
function dSlide3(data) {
  const bal = data.balance;
  const pos = bal.ars >= 0;
  const colors = pos
    ? ['oklch(0.40 0.11 155)', 'oklch(0.50 0.12 180)', 'oklch(0.48 0.10 220)']
    : ['oklch(0.45 0.12 25)',  'oklch(0.40 0.10 280)', 'oklch(0.42 0.10 260)'];
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg(colors));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-10 px-24 py-16 text-white' });
  const left = D_el('div', { class: 'col-span-6 flex flex-col justify-center' }, [
    _eyebrow(pos ? 'Terminaste el mes con' : 'Cerraste el mes con'),
    D_el('div', { class: 'mt-6 font-sora font-semibold leading-[0.88] tracking-tight', style: 'font-size: clamp(100px, 12vw, 200px); color: ' + (pos ? 'oklch(0.92 0.15 140)' : 'oklch(0.88 0.15 30)') + ';' }, [
      D_el('span', { 'data-count-currency': bal.ars }, (pos ? '+ ' : '− ') + '$ ' + new Intl.NumberFormat('es-AR').format(Math.abs(bal.ars))),
    ]),
    D_el('div', { class: 'font-sora text-[22px] mt-2 text-white/80' }, [
      D_el('span', {}, pos ? 'a favor · ' : 'en rojo · '),
      D_el('span', { class: 'font-mono' }, 'U$S ' + Math.abs(bal.usd)),
    ]),
    D_el('div', { class: 'font-sora text-[17px] mt-8 text-white/70 max-w-[500px] pretty' }, pos
      ? 'Ingresaste más de lo que gastaste. El mes que viene, intentá aumentar el margen un poco más.'
      : 'Gastaste más de lo que ingresó. No es el fin del mundo — pero el mes que viene, apretá un poquito.'),
  ]);
  // Right — comparative bars
  const max = Math.max(bal.income, bal.expense);
  const right = D_el('div', { class: 'col-span-6 flex flex-col justify-center gap-6' }, [
    D_el('div', {}, [
      D_el('div', { class: 'flex items-baseline justify-between mb-2' }, [
        D_el('div', { class: 'font-mono text-[12px] tracking-widest uppercase text-white/60' }, 'Ingresos'),
        D_el('div', { class: 'font-sora font-semibold', style: 'font-size: 28px;' }, '$ ' + new Intl.NumberFormat('es-AR').format(bal.income)),
      ]),
      D_el('div', { class: 'h-6 rounded-full bg-white/10 overflow-hidden' }, [
        D_el('div', { class: 'h-full rounded-full', style: `width: ${(bal.income/max*100).toFixed(1)}%; background: linear-gradient(90deg, oklch(0.75 0.14 155), oklch(0.80 0.12 180));` }),
      ]),
    ]),
    D_el('div', {}, [
      D_el('div', { class: 'flex items-baseline justify-between mb-2' }, [
        D_el('div', { class: 'font-mono text-[12px] tracking-widest uppercase text-white/60' }, 'Gastos'),
        D_el('div', { class: 'font-sora font-semibold', style: 'font-size: 28px;' }, '$ ' + new Intl.NumberFormat('es-AR').format(bal.expense)),
      ]),
      D_el('div', { class: 'h-6 rounded-full bg-white/10 overflow-hidden' }, [
        D_el('div', { class: 'h-full rounded-full', style: `width: ${(bal.expense/max*100).toFixed(1)}%; background: linear-gradient(90deg, oklch(0.72 0.15 25), oklch(0.78 0.14 55));` }),
      ]),
    ]),
    D_el('div', { class: 'rounded-2xl p-5 bg-white/8 border border-white/15 backdrop-blur-sm flex items-center gap-4' }, [
      D_el('div', { class: 'w-11 h-11 rounded-xl grid place-items-center text-[20px]', style: `background: ${pos?'oklch(0.5 0.12 155 / 0.4)':'oklch(0.5 0.15 25 / 0.4)'}` }, pos ? '↗' : '↘'),
      D_el('div', {}, [
        D_el('div', { class: 'font-mono text-[11px] tracking-widest uppercase text-white/60' }, 'vs mes anterior'),
        D_el('div', { class: 'font-sora font-semibold text-[22px]' }, (bal.deltaVsPrev>=0?'+':'') + bal.deltaVsPrev + '%'),
      ]),
    ]),
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

// ========================= Slide 4: Top categoría con donut gigante =========================
function dSlide4(data) {
  const tc = data.topCategory;
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg(['oklch(0.40 0.10 25)', 'oklch(0.45 0.12 55)', 'oklch(0.48 0.11 90)']));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-10 px-24 py-16 text-white' });
  const left = D_el('div', { class: 'col-span-6 flex flex-col justify-center' }, [
    _eyebrow('Donde más gastaste'),
    D_el('div', { class: 'mt-6 font-sora font-semibold leading-[0.92] tracking-tight', style: 'font-size: clamp(90px, 10vw, 160px);' }, tc.name),
    D_el('div', { class: 'mt-4 font-sora font-semibold', style: 'font-size: 48px;' }, [
      D_el('span', { 'data-count-currency': tc.amount }, '$ ' + new Intl.NumberFormat('es-AR').format(tc.amount)),
    ]),
    D_el('div', { class: 'font-sora text-[20px] mt-2 text-white/75' }, `${tc.pctOfExpenses}% de tus gastos del mes`),
    D_el('div', { class: 'font-sora text-[16px] mt-8 text-white/65 max-w-[460px] pretty' }, 'De todas las categorías donde dejaste plata, esta se llevó la parte más grande.'),
  ]);
  // Right — giant donut with labels
  const total = tc.breakdown.reduce((a, b) => a + b.amount, 0);
  const size = 440, r = 170, cx = size/2, cy = size/2, stroke = 44;
  let offset = -Math.PI / 2;
  const arcs = tc.breakdown.map((b) => {
    const angle = (b.amount / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(offset), y1 = cy + r * Math.sin(offset);
    const x2 = cx + r * Math.cos(offset + angle), y2 = cy + r * Math.sin(offset + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    offset += angle;
    return `<path d="${path}" fill="none" stroke="${b.color}" stroke-width="${stroke}" stroke-linecap="round"/>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${size} ${size}" width="440" height="440">${arcs}</svg>`;
  const right = D_el('div', { class: 'col-span-6 relative flex items-center justify-center' }, [
    D_el('div', { class: 'relative' }, [
      D_el('div', { html: svg }),
      D_el('div', { class: 'absolute inset-0 grid place-items-center text-center' }, [
        D_el('div', {}, [
          D_el('div', { class: 'font-mono text-[10px] tracking-widest uppercase text-white/60' }, 'Total gastos'),
          D_el('div', { class: 'font-sora font-semibold', style: 'font-size: 44px;' }, '$ ' + new Intl.NumberFormat('es-AR').format(total)),
        ]),
      ]),
    ]),
    D_el('div', { class: 'ml-8 flex flex-col gap-4' }, tc.breakdown.map(b => (
      D_el('div', { class: 'flex items-center gap-3' }, [
        D_el('div', { class: 'w-3 h-3 rounded-sm', style: `background: ${b.color}` }),
        D_el('div', {}, [
          D_el('div', { class: 'font-sora font-medium text-[18px]' }, b.name),
          D_el('div', { class: 'font-mono text-[13px] text-white/60' }, '$ ' + new Intl.NumberFormat('es-AR').format(b.amount)),
        ]),
      ])
    ))),
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

// ========================= Slide 5: Equivalencias =========================
function dSlide5(data) {
  const eq = data.equivalents;
  const hero = eq[0];
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg(['oklch(0.45 0.10 55)', 'oklch(0.48 0.10 30)', 'oklch(0.50 0.10 85)']));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-10 px-24 py-16 text-white' });
  const left = D_el('div', { class: 'col-span-6 flex flex-col justify-center' }, [
    _eyebrow('Con ese gasto podías comprar'),
    D_el('div', { class: 'mt-6 flex items-end gap-2' }, [
      D_el('div', { class: 'font-sora font-semibold leading-[0.88] tracking-tight', style: 'font-size: clamp(120px, 14vw, 220px);' }, [
        D_el('span', { 'data-count': hero.n }, String(hero.n)),
      ]),
    ]),
    D_el('div', { class: 'font-sora text-[40px] mt-2 text-white/85' }, hero.label),
    D_el('div', { class: 'font-sora text-[16px] mt-8 text-white/60 max-w-[460px] pretty' }, `A precio promedio de $ ${new Intl.NumberFormat('es-AR').format(hero.ref)} por unidad.`),
  ]);
  const right = D_el('div', { class: 'col-span-6 relative flex items-center justify-center' }, [
    D_el('div', { class: 'relative' }, [
      D_el('div', { class: 'absolute inset-0 rounded-full', style: 'background: radial-gradient(closest-side, rgba(255,255,255,.2), transparent); filter: blur(30px);' }),
      D_el('div', { class: 'relative text-[280px] leading-none drop-shadow-2xl' }, hero.emoji),
    ]),
    D_el('div', { class: 'absolute bottom-16 right-24 flex flex-col gap-3' }, eq.slice(1).map(e => (
      D_el('div', { class: 'flex items-center gap-3 px-5 py-3 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm' }, [
        D_el('div', { class: 'text-[28px]' }, e.emoji),
        D_el('div', { class: 'font-sora font-semibold text-[20px]' }, `${e.n} ${e.label}`),
      ])
    ))),
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

// ========================= Slide 6: Día pico con sparkline =========================
function dSlide6(data) {
  const pd = data.peakDay;
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg(['oklch(0.38 0.10 280)', 'oklch(0.45 0.12 240)', 'oklch(0.42 0.10 200)']));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-10 px-24 py-16 text-white' });
  const left = D_el('div', { class: 'col-span-5 flex flex-col justify-center' }, [
    _eyebrow('Tu día más caro'),
    D_el('div', { class: 'mt-6 font-sora font-semibold leading-[0.92] tracking-tight', style: 'font-size: clamp(60px, 6.5vw, 100px);' }, pd.date),
    D_el('div', { class: 'mt-4 font-sora font-semibold', style: 'font-size: 68px; color: oklch(0.82 0.15 25);' }, [
      D_el('span', { 'data-count-currency': pd.amount }, '$ ' + new Intl.NumberFormat('es-AR').format(pd.amount)),
    ]),
    D_el('div', { class: 'mt-8 flex flex-col gap-2' }, pd.items.map(it => (
      D_el('div', { class: 'flex items-center justify-between py-2 border-b border-white/10' }, [
        D_el('div', { class: 'font-sora text-[15px] text-white/80' }, it.cat),
        D_el('div', { class: 'font-mono text-[14px]' }, '$ ' + new Intl.NumberFormat('es-AR').format(it.amount)),
      ])
    ))),
  ]);
  // Right — large sparkline
  const daily = pd.daily;
  const mx = Math.max(...daily);
  const w = 640, h = 340, pad = 20;
  const pts = daily.map((v, i) => {
    const x = pad + (i / (daily.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / mx) * (h - pad * 2);
    return [x, y, v];
  });
  const peakIdx = daily.indexOf(mx);
  const [px, py] = pts[peakIdx];
  const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ');
  const areaD = pathD + ` L ${pts[pts.length-1][0]} ${h-pad} L ${pts[0][0]} ${h-pad} Z`;
  const sparkSvg = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%">
      <defs>
        <linearGradient id="spkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="oklch(0.82 0.15 25)" stop-opacity=".5"/>
          <stop offset="1" stop-color="oklch(0.82 0.15 25)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#spkGrad)"/>
      <path d="${pathD}" fill="none" stroke="oklch(0.85 0.15 25)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${px}" cy="${py}" r="16" fill="oklch(0.85 0.15 25 / 0.25)"/>
      <circle cx="${px}" cy="${py}" r="8" fill="oklch(0.90 0.12 25)" stroke="white" stroke-width="2"/>
    </svg>`;
  const right = D_el('div', { class: 'col-span-7 flex flex-col justify-center' }, [
    D_el('div', { class: 'font-mono text-[11px] tracking-widest uppercase text-white/55 mb-4' }, `Gasto diario · ${data.month} ${data.year}`),
    D_el('div', { class: 'rounded-3xl p-6 bg-white/6 border border-white/10 backdrop-blur-sm', style: 'height: 340px;' }, [
      D_el('div', { class: 'w-full h-full', html: sparkSvg }),
    ]),
    D_el('div', { class: 'flex items-center justify-between mt-4 font-mono text-[11px] text-white/50' }, [
      D_el('span', {}, 'día 1'),
      D_el('span', {}, `día ${daily.length}`),
    ]),
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

// ========================= Slide 7: Ahorro + Inversión =========================
function dSlide7(data) {
  const sv = data.savings;
  const total = sv.savings + sv.investment;
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg(['oklch(0.40 0.11 155)', 'oklch(0.45 0.12 180)', 'oklch(0.48 0.10 220)']));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-10 px-24 py-16 text-white' });
  const left = D_el('div', { class: 'col-span-6 flex flex-col justify-center' }, [
    _eyebrow('Guardaste para vos'),
    D_el('div', { class: 'mt-6 font-sora font-semibold leading-[0.88] tracking-tight', style: 'font-size: clamp(100px, 12vw, 200px); color: oklch(0.92 0.14 155);' }, [
      D_el('span', { 'data-count-currency': total }, '$ ' + new Intl.NumberFormat('es-AR').format(total)),
    ]),
    D_el('div', { class: 'font-sora text-[22px] mt-4 text-white/80' }, [
      (sv.deltaVsPrev >= 0 ? '+' : '') + sv.deltaVsPrev + '% vs mes anterior · ',
      D_el('span', { class: 'text-white/60' }, `rendimiento ${sv.yield>=0?'+':''}${sv.yield}%`),
    ]),
  ]);
  const max = Math.max(sv.savings, sv.investment);
  const right = D_el('div', { class: 'col-span-6 flex flex-col justify-center gap-6' }, [
    D_el('div', { class: 'rounded-3xl p-8 bg-white/8 border border-white/15 backdrop-blur-sm' }, [
      D_el('div', { class: 'flex items-baseline justify-between' }, [
        D_el('div', { class: 'font-mono text-[12px] tracking-widest uppercase text-white/60' }, 'Ahorro'),
        D_el('div', { class: 'font-sora font-semibold', style: 'font-size: 34px;' }, '$ ' + new Intl.NumberFormat('es-AR').format(sv.savings)),
      ]),
      D_el('div', { class: 'mt-4 h-4 rounded-full bg-white/10 overflow-hidden' }, [
        D_el('div', { class: 'h-full rounded-full', style: `width: ${(sv.savings/max*100).toFixed(1)}%; background: linear-gradient(90deg, oklch(0.75 0.14 155), oklch(0.80 0.10 195));` }),
      ]),
    ]),
    D_el('div', { class: 'rounded-3xl p-8 bg-white/8 border border-white/15 backdrop-blur-sm' }, [
      D_el('div', { class: 'flex items-baseline justify-between' }, [
        D_el('div', { class: 'font-mono text-[12px] tracking-widest uppercase text-white/60' }, 'Inversión'),
        D_el('div', { class: 'font-sora font-semibold', style: 'font-size: 34px;' }, '$ ' + new Intl.NumberFormat('es-AR').format(sv.investment)),
      ]),
      D_el('div', { class: 'mt-4 h-4 rounded-full bg-white/10 overflow-hidden' }, [
        D_el('div', { class: 'h-full rounded-full', style: `width: ${(sv.investment/max*100).toFixed(1)}%; background: linear-gradient(90deg, oklch(0.75 0.12 230), oklch(0.80 0.13 275));` }),
      ]),
    ]),
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

// ========================= Slide 8: Metas =========================
function dSlide8(data) {
  const g = data.goal;
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg(['oklch(0.40 0.10 230)', 'oklch(0.45 0.11 260)', 'oklch(0.48 0.10 195)']));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-10 px-24 py-16 text-white' });
  const left = D_el('div', { class: 'col-span-6 flex flex-col justify-center' }, [
    _eyebrow('Avanzaste en tu meta'),
    D_el('div', { class: 'mt-6 font-sora font-semibold leading-[0.92] tracking-tight', style: 'font-size: clamp(80px, 9vw, 140px);' }, g.name),
    D_el('div', { class: 'flex items-baseline gap-3 mt-6' }, [
      D_el('div', { class: 'font-sora font-semibold leading-none', style: 'font-size: 110px; color: oklch(0.88 0.14 230);' }, [
        D_el('span', { 'data-count': g.pct, 'data-count-suffix': '%' }, g.pct + '%'),
      ]),
      D_el('div', { class: 'font-sora text-[18px] text-white/70' }, 'completado'),
    ]),
    D_el('div', { class: 'font-mono text-[14px] text-white/60 mt-4' }, `$ ${new Intl.NumberFormat('es-AR').format(g.current)} de $ ${new Intl.NumberFormat('es-AR').format(g.target)}`),
  ]);
  // Right — radial progress
  const size = 360, r = 155, cx = size/2, cy = size/2, c = 2 * Math.PI * r;
  const right = D_el('div', { class: 'col-span-6 relative flex items-center justify-center' }, [
    D_el('div', { class: 'relative', style: `width:${size}px; height:${size}px;` }, [
      D_el('div', { html: `
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="transform: rotate(-90deg);">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="18"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="oklch(0.80 0.14 230)" stroke-width="18" stroke-linecap="round"
            stroke-dasharray="${c}" stroke-dashoffset="${c - (c * g.pct / 100)}"/>
        </svg>` }),
      D_el('div', { class: 'absolute inset-0 grid place-items-center' }, [
        D_el('div', { class: 'text-center' }, [
          D_el('div', { class: 'text-[72px] leading-none' }, '✈️'),
          D_el('div', { class: 'font-mono text-[11px] tracking-widest uppercase text-white/60 mt-3' }, `Metas completadas: ${g.completedThisMonth}`),
        ]),
      ]),
    ]),
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

// ========================= Slide 9: Personalidad =========================
function dSlide9(data) {
  const p = window.MFI.PERSONALITIES[data.personality];
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg([p.g1, p.g2, p.g1]));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-10 px-24 py-16 text-white' });
  const left = D_el('div', { class: 'col-span-7 flex flex-col justify-center' }, [
    _eyebrow('Tu personalidad financiera'),
    D_el('div', { class: 'mt-6 font-sora font-semibold leading-[0.88] tracking-tight', style: 'font-size: clamp(80px, 10vw, 170px);' }, p.label),
    D_el('div', { class: 'font-sora text-[22px] mt-6 text-white/85 max-w-[560px] pretty' }, p.desc),
    D_el('div', { class: 'mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm w-max' }, [
      D_el('div', { class: 'w-2 h-2 rounded-full bg-white' }),
      D_el('div', { class: 'font-mono text-[13px] tracking-wider' }, p.micro),
    ]),
  ]);
  const right = D_el('div', { class: 'col-span-5 relative flex items-center justify-center' }, [
    D_el('div', { class: 'relative' }, [
      D_el('div', { class: 'absolute inset-0 rounded-full', style: 'background: radial-gradient(closest-side, rgba(255,255,255,.25), transparent); filter: blur(40px);' }),
      D_el('div', { class: 'relative text-[320px] leading-none drop-shadow-2xl' }, p.emoji),
    ]),
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

// ========================= Slide 10: Compartir =========================
function dSlide10(data, ctx) {
  const p = window.MFI.PERSONALITIES[data.personality];
  const s = D_el('div', { class: 'relative w-full h-full overflow-hidden' });
  s.appendChild(_dBg(['oklch(0.42 0.10 260)', 'oklch(0.48 0.11 220)', 'oklch(0.45 0.10 295)']));
  const inner = D_el('div', { class: 'relative h-full grid grid-cols-12 gap-10 px-24 py-16 text-white' });
  const left = D_el('div', { class: 'col-span-7 flex flex-col justify-center' }, [
    _eyebrow(`Tu ${data.month.toLowerCase()} en MFI · terminado`),
    D_el('h2', { class: 'mt-6 font-sora font-semibold leading-[0.92] tracking-tight', style: 'font-size: clamp(72px, 8vw, 130px);' }, '¿Lo compartís?'),
    D_el('div', { class: 'font-sora text-[20px] mt-6 text-white/80 max-w-[540px] pretty' }, 'Publicalo en Comunidad para comparar con otros, o descargalo como imagen para redes.'),
    D_el('div', { class: 'mt-10 flex items-center gap-3' }, [
      D_el('button', {
        class: 'inline-flex items-center gap-2 h-14 px-7 rounded-full text-white font-sora font-semibold text-[16px]',
        style: 'background: linear-gradient(92deg, oklch(0.50 0.10 155) 0%, oklch(0.60 0.10 65) 100%); box-shadow: 0 10px 30px -10px rgba(0,0,0,.4);',
        'data-noadvance': '1',
        onclick: (e) => { e.stopPropagation(); ctx && ctx.onShare && ctx.onShare(); },
      }, [
        D_el('span', { html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' }),
        D_el('span', {}, 'Publicar en Comunidad'),
      ]),
      D_el('button', {
        class: 'inline-flex items-center gap-2 h-14 px-6 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 font-sora font-semibold text-[15px] text-white',
        'data-noadvance': '1',
        onclick: (e) => { e.stopPropagation(); ctx && ctx.onDownload && ctx.onDownload(); },
      }, [
        D_el('span', { html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' }),
        D_el('span', {}, 'Descargar PNG'),
      ]),
    ]),
  ]);
  // Right — share card preview 9:16
  const cardW = 300, cardH = 533;
  const card = D_el('div', { class: 'relative rounded-3xl overflow-hidden shadow-2xl', style: `width:${cardW}px; height:${cardH}px; background: linear-gradient(145deg, ${p.g1} 0%, ${p.g2} 100%);` }, [
    D_el('div', { class: 'absolute inset-0', style: `background: radial-gradient(ellipse at 30% 20%, ${p.g1}, transparent 60%), radial-gradient(ellipse at 70% 80%, ${p.g2}, transparent 60%);` }),
    D_el('div', { class: 'relative h-full flex flex-col justify-between p-6 text-white' }, [
      D_el('div', {}, [
        D_el('div', { class: 'font-mono text-[10px] tracking-widest uppercase text-white/70' }, `Tu ${data.month.toLowerCase()} en MFI`),
        D_el('div', { class: 'font-sora font-semibold text-[28px] leading-tight mt-2' }, data.user.name),
      ]),
      D_el('div', { class: 'text-center' }, [
        D_el('div', { class: 'text-[100px] leading-none' }, p.emoji),
        D_el('div', { class: 'font-sora font-semibold text-[30px] mt-3 leading-tight' }, p.label),
      ]),
      D_el('div', { class: 'flex items-center justify-between' }, [
        D_el('div', {}, [
          D_el('div', { class: 'font-mono text-[9px] tracking-widest uppercase text-white/60' }, 'Balance'),
          D_el('div', { class: 'font-sora font-semibold text-[18px]' }, (data.balance.ars>=0?'+ ':'− ') + '$ ' + new Intl.NumberFormat('es-AR').format(Math.abs(data.balance.ars))),
        ]),
        D_el('div', { class: 'font-mono text-[10px] text-white/50' }, 'mfi.app'),
      ]),
    ]),
  ]);
  const right = D_el('div', { class: 'col-span-5 relative flex items-center justify-center' }, [
    D_el('div', { class: 'absolute -left-8 top-[30%] rotate-[-6deg] opacity-60 scale-90', style: 'filter: blur(1px);' }, [
      D_el('div', { class: 'rounded-3xl', style: `width:${cardW}px; height:${cardH}px; background: linear-gradient(145deg, ${p.g2}, ${p.g1}); box-shadow: 0 30px 60px -20px rgba(0,0,0,.5);` }),
    ]),
    card,
  ]);
  inner.append(left, right);
  s.appendChild(inner);
  return s;
}

window.DESKTOP_SLIDES = [dSlide1, dSlide2, dSlide3, dSlide4, dSlide5, dSlide6, dSlide7, dSlide8, dSlide9, dSlide10];
window.DESKTOP_SLIDE_TITLES = window.SLIDE_TITLES || ['Portada','Números','Balance','Top categoría','Equivalencias','Día pico','Ahorro','Metas','Personalidad','Compartir'];
