// Main app: tabs, sections, state, tweaks-equivalent controls

const W = window;
const _DATA_POS = W.MFI.DATA_POS;
const _DATA_NEG = W.MFI.DATA_NEG;
const _PERS = W.MFI.PERSONALITIES;
const _buildPhone = W.WrappedShell.buildPhone;
const _phoneFrame = W.WrappedShell.phoneFrame;
const _desktopBg = W.WrappedShell.desktopBg;
const _bannerEntry = W.WrappedExtras.bannerEntry;
const _loadingScreen = W.WrappedExtras.loadingScreen;
const _emptyState = W.WrappedExtras.emptyState;
// el() is a global from wrapped.slides.js
const STATE_KEY = 'mfi_wrapped_state_v1';
const state = Object.assign({
  tab: 'story',
  theme: 'light',
  balance: 'pos', // pos | neg
  personality: 'ahorrista',
  showEmpty: false,
  bannerVariant: 'prominent',
}, (() => { try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch { return {}; } })());

function persist() { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }

function applyTheme() {
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
}

function currentData() {
  const d = state.balance === 'pos' ? _DATA_POS : _DATA_NEG;
  return { ...d, personality: state.personality };
}

const TABS = [
  { id: 'story',   label: 'Story mobile' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'grid',    label: 'Las 10 slides' },
  { id: 'share',   label: 'Share card' },
  { id: 'banner',  label: 'Banner entry' },
  { id: 'loading', label: 'Loading' },
  { id: 'empty',   label: 'Empty state' },
];

function renderTabs() {
  const nav = document.getElementById('tabs');
  nav.innerHTML = '';
  TABS.forEach(t => {
    const b = el('button', {
      class: 'tab-btn h-9 px-3 rounded-lg text-[13px] font-sora font-medium whitespace-nowrap border border-borderL dark:border-borderD hover:bg-mist dark:hover:bg-white/5 text-ink dark:text-white',
      'data-active': state.tab === t.id ? 'true' : 'false',
      onclick: () => { state.tab = t.id; persist(); render(); },
    }, t.label);
    nav.appendChild(b);
  });
}

// Control strip (tweaks) shown above each tab
function controlStrip() {
  const personalityIds = Object.keys(_PERS);
  return el('div', { class: 'rounded-xl border border-borderL dark:border-borderD bg-white dark:bg-charcoal2 p-3 mb-4 flex flex-wrap items-center gap-3' }, [
    // Balance sign
    el('div', { class: 'flex items-center gap-1.5' }, [
      el('span', { class: 'text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium' }, 'Balance'),
      el('div', { class: 'flex items-center gap-0.5 p-0.5 rounded-lg bg-mist dark:bg-white/5 border border-borderL dark:border-borderD' }, [
        el('button', {
          class: 'h-7 px-2.5 rounded-md text-[12px] font-medium ' + (state.balance === 'pos' ? 'bg-white dark:bg-charcoal text-sage shadow-card' : 'text-mutedL dark:text-mutedD'),
          onclick: () => { state.balance = 'pos'; persist(); render(); },
        }, 'Positivo'),
        el('button', {
          class: 'h-7 px-2.5 rounded-md text-[12px] font-medium ' + (state.balance === 'neg' ? 'bg-white dark:bg-charcoal text-[#ef4444] shadow-card' : 'text-mutedL dark:text-mutedD'),
          onclick: () => { state.balance = 'neg'; persist(); render(); },
        }, 'Negativo'),
      ]),
    ]),
    // Personality
    el('div', { class: 'flex items-center gap-1.5' }, [
      el('span', { class: 'text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium' }, 'Personalidad'),
      el('select', {
        class: 'h-8 px-2 rounded-lg border border-borderL dark:border-borderD bg-white dark:bg-charcoal text-[12px] font-mono',
        onchange: (e) => { state.personality = e.target.value; persist(); render(); },
      }, personalityIds.map(id => {
        const o = el('option', { value: id }, _PERS[id].label);
        if (id === state.personality) o.selected = true;
        return o;
      })),
    ]),
    // Empty
    el('div', { class: 'flex items-center gap-1.5' }, [
      el('span', { class: 'text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium' }, 'Datos'),
      el('div', { class: 'flex items-center gap-0.5 p-0.5 rounded-lg bg-mist dark:bg-white/5 border border-borderL dark:border-borderD' }, [
        el('button', {
          class: 'h-7 px-2.5 rounded-md text-[12px] font-medium ' + (!state.showEmpty ? 'bg-white dark:bg-charcoal shadow-card' : 'text-mutedL dark:text-mutedD'),
          onclick: () => { state.showEmpty = false; persist(); render(); },
        }, 'Con datos'),
        el('button', {
          class: 'h-7 px-2.5 rounded-md text-[12px] font-medium ' + (state.showEmpty ? 'bg-white dark:bg-charcoal shadow-card' : 'text-mutedL dark:text-mutedD'),
          onclick: () => { state.showEmpty = true; persist(); render(); },
        }, 'Empty'),
      ]),
    ]),
    el('div', { class: 'ml-auto text-[11px] text-mutedL dark:text-mutedD' }, 'Tweaks en vivo'),
  ]);
}

// ----- Tab views -----
function viewStory() {
  const data = currentData();
  let currentPhone = null;
  const host = el('div', { class: 'flex flex-col items-center gap-4 py-6' });
  const reset = el('button', { class: 'text-[12px] font-medium text-sage hover:underline' }, 'Reiniciar historia');
  const frameHost = el('div');

  function buildIt() {
    frameHost.innerHTML = '';
    if (state.showEmpty) {
      const inner = el('div', { class: 'absolute inset-0' });
      inner.appendChild(_emptyState());
      frameHost.appendChild(_phoneFrame(inner));
      return;
    }
    const phone = _buildPhone({
      data,
      autoAdvance: true,
      onClose: () => buildIt(),
    });
    currentPhone = phone;
    frameHost.appendChild(_phoneFrame(phone.node));
  }

  reset.addEventListener('click', buildIt);
  buildIt();

  host.append(
    el('p', { class: 'text-sm text-mutedL dark:text-mutedD text-center max-w-md pretty' }, 'Tocá el lado derecho para avanzar, el izquierdo para volver. Mantené presionado para pausar.'),
    frameHost,
    reset,
  );
  return host;
}

function viewDesktop() {
  const data = currentData();
  const slides = window.DESKTOP_SLIDES;
  const titles = window.DESKTOP_SLIDE_TITLES;
  const total = slides.length;
  let current = 0;

  // Fixed aspect 16:9 stage
  const host = el('div', { class: 'relative w-full', style: 'min-height: 760px;' });

  const stageWrap = el('div', { class: 'relative mx-auto rounded-2xl overflow-hidden bg-black', style: 'width: min(100%, 1280px); aspect-ratio: 16/9; box-shadow: 0 40px 100px -40px rgba(0,0,0,.5);' });

  const slideHost = el('div', { class: 'absolute inset-0' });
  stageWrap.appendChild(slideHost);

  // Progress bars (top)
  const progressBar = el('div', { class: 'absolute top-4 left-6 right-6 flex items-center gap-1 z-30' });
  stageWrap.appendChild(progressBar);

  // Brand chip (top left over progress is fine — put below)
  const brand = el('div', { class: 'absolute top-10 left-6 flex items-center gap-2 z-20 text-white' }, [
    el('div', { class: 'w-6 h-6 rounded-md grid place-items-center bg-white/15 backdrop-blur', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>' }),
    el('div', { class: 'font-sora font-semibold text-[13px] tracking-tight' }, 'MFI'),
    el('div', { class: 'font-mono text-[10px] tracking-widest text-white/60' }, `· ${data.year}`),
  ]);
  stageWrap.appendChild(brand);

  // Slide counter (top right)
  const counter = el('div', { class: 'absolute top-10 right-6 font-mono text-[11px] tracking-widest uppercase text-white/70 z-20' });
  stageWrap.appendChild(counter);

  // Arrow controls (left / right)
  const arrowL = el('button', {
    class: 'absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full grid place-items-center bg-black/25 backdrop-blur text-white hover:bg-black/40 z-30 transition',
    'aria-label': 'Anterior',
    html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  });
  const arrowR = el('button', {
    class: 'absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full grid place-items-center bg-black/25 backdrop-blur text-white hover:bg-black/40 z-30 transition',
    'aria-label': 'Siguiente',
    html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  });
  stageWrap.append(arrowL, arrowR);

  function renderProgress() {
    progressBar.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const seg = el('div', {
        class: 'flex-1 h-[3px] rounded-full overflow-hidden',
        style: 'background: rgba(255,255,255,0.22);'
      }, [
        el('div', {
          class: 'h-full rounded-full',
          style: `width: ${i < current ? '100%' : (i === current ? '100%' : '0%')}; background: rgba(255,255,255,0.9); transition: width .35s ease;`
        })
      ]);
      progressBar.appendChild(seg);
    }
    counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    arrowL.style.opacity = current === 0 ? '0.35' : '1';
    arrowL.style.pointerEvents = current === 0 ? 'none' : 'auto';
  }

  function show(idx) {
    if (idx < 0 || idx >= total) return;
    current = idx;
    slideHost.innerHTML = '';
    const ctx = {
      onShare: () => openShareModal(),
      onDownload: () => alert('Descargar PNG — en el proyecto real renderea la share card con html-to-image.'),
    };
    const slide = slides[idx](data, ctx);
    slide.classList.add('slide-enter');
    slideHost.appendChild(slide);
    // Animate numbers
    requestAnimationFrame(() => window.WrappedShell.animateNumbers && window.WrappedShell.animateNumbers(slide, 1100));
    renderProgress();
    // Also refresh rail
    renderRail();
  }

  function openShareModal() {
    const p = _PERS[data.personality];
    const overlay = el('div', { class: 'fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm grid place-items-center p-6', onclick: (e) => { if (e.target === overlay) overlay.remove(); } });
    const modal = el('div', { class: 'w-full max-w-xl rounded-2xl bg-white dark:bg-charcoal2 p-6 shadow-2xl' }, [
      el('div', { class: 'flex items-center justify-between mb-4' }, [
        el('div', { class: 'font-sora font-semibold text-lg text-ink dark:text-white' }, 'Publicar en Comunidad'),
        el('button', { class: 'w-8 h-8 rounded-lg grid place-items-center hover:bg-mist dark:hover:bg-white/5', onclick: () => overlay.remove(), html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="6"/></svg>' }),
      ]),
      el('textarea', { class: 'w-full h-24 p-3 rounded-xl border border-borderL dark:border-borderD bg-white dark:bg-charcoal text-[14px] resize-none outline-none focus:border-sage' }, `Este fue mi ${data.month.toLowerCase()} 👇 — ¿sos de ${p.label}?`),
      el('div', { class: 'mt-3 text-[11px] text-mutedL dark:text-mutedD font-mono' }, `#wrapped #${data.month.toLowerCase()}${data.year} #${data.personality}`),
      el('div', { class: 'mt-4 rounded-xl overflow-hidden border border-borderL dark:border-borderD bg-mist dark:bg-black flex items-center justify-center p-4' }, [
        el('div', { class: 'scale-[0.6] origin-center' }, [window.shareCard(data, { ratio: 'feed' })]),
      ]),
      el('div', { class: 'mt-5 flex items-center justify-end gap-2' }, [
        el('button', { class: 'h-10 px-4 rounded-xl text-[13px] font-sora font-medium hover:bg-mist dark:hover:bg-white/5 text-ink dark:text-white', onclick: () => overlay.remove() }, 'Cancelar'),
        el('button', { class: 'h-10 px-5 rounded-xl text-white text-[13px] font-sora font-semibold', style: 'background: linear-gradient(92deg, oklch(0.50 0.10 155), oklch(0.60 0.10 65));', onclick: () => { overlay.remove(); alert('En el proyecto real: POST a /comunidad y redirect al post creado.'); } }, 'Publicar'),
      ]),
    ]);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  arrowL.onclick = () => show(current - 1);
  arrowR.onclick = () => show(current < total - 1 ? current + 1 : current);

  // Keyboard
  const keyHandler = (e) => {
    if (state.tab !== 'desktop') return;
    if (e.key === 'ArrowRight') show(current < total - 1 ? current + 1 : current);
    else if (e.key === 'ArrowLeft') show(current - 1);
  };
  window.addEventListener('keydown', keyHandler);
  // Clean up on next render
  if (window.__desktopKeyHandler) window.removeEventListener('keydown', window.__desktopKeyHandler);
  window.__desktopKeyHandler = keyHandler;

  // Rail of thumbnails (below stage)
  const rail = el('div', { class: 'mt-5 flex items-center gap-2 overflow-x-auto pb-2', style: 'max-width: 1280px; margin-left:auto; margin-right:auto;' });

  function renderRail() {
    rail.innerHTML = '';
    slides.forEach((fn, i) => {
      const thumb = el('button', {
        class: 'relative shrink-0 rounded-lg overflow-hidden border transition',
        style: `width: 116px; aspect-ratio: 16/9; border-color: ${i === current ? 'oklch(0.55 0.13 155)' : 'rgba(120,120,120,.2)'}; box-shadow: ${i === current ? '0 0 0 2px oklch(0.55 0.13 155 / .35)' : 'none'};`,
        onclick: () => show(i),
      });
      // mini preview — just gradient + title overlay (full slides are too heavy for rail)
      const miniBg = el('div', { class: 'absolute inset-0', style: 'background: linear-gradient(135deg, oklch(0.42 0.10 260), oklch(0.48 0.10 220));' });
      thumb.appendChild(miniBg);
      thumb.appendChild(el('div', { class: 'absolute inset-0 p-2 flex flex-col justify-between' }, [
        el('div', { class: 'font-mono text-[8px] tracking-widest uppercase text-white/70' }, String(i+1).padStart(2,'0')),
        el('div', { class: 'font-sora font-semibold text-[10px] text-white leading-tight' }, titles[i]),
      ]));
      rail.appendChild(thumb);
    });
  }

  // Header above stage (mini intro + download CTA)
  const header = el('div', { class: 'flex items-center justify-between mb-4', style: 'max-width: 1280px; margin-left:auto; margin-right:auto;' }, [
    el('div', {}, [
      el('div', { class: 'text-[11px] uppercase tracking-[0.18em] text-mutedL dark:text-mutedD font-medium' }, `Vista desktop · Tu ${data.month.toLowerCase()} en MFI`),
      el('div', { class: 'font-sora font-semibold text-ink dark:text-white text-lg mt-0.5' }, 'Recorrelo con flechas o teclado. Cada slide es un layout editorial distinto.'),
    ]),
    el('div', { class: 'flex items-center gap-2' }, [
      el('button', { class: 'h-9 px-3 rounded-lg border border-borderL dark:border-borderD text-[12px] font-sora font-medium hover:bg-mist dark:hover:bg-white/5 text-ink dark:text-white' }, 'Descargar PDF'),
    ]),
  ]);

  host.append(header, stageWrap, rail);

  // Initial render
  show(0);

  return host;
}

function viewGrid() {
  const data = currentData();
  const host = el('div', { class: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5' });
  const scale = 220 / 390; // thumbnail / phone width
  const thumbH = 476;
  window.SLIDES.forEach((fn, i) => {
    const cardWrap = el('div', { class: 'flex flex-col items-center gap-2' });
    const frame = el('div', { class: 'relative rounded-[24px] p-1 bg-ink/90 dark:bg-black', style: `width: 220px; height: ${thumbH}px; box-shadow: 0 20px 40px -20px rgba(0,0,0,.4);` });
    const inner = el('div', { class: 'w-full h-full rounded-[20px] overflow-hidden bg-black relative' });
    // Scaled slide container at native phone dims
    const scaler = el('div', { class: 'absolute top-0 left-0 origin-top-left', style: `width:390px; height:${Math.round(thumbH / scale)}px; transform: scale(${scale});` });
    const slide = fn(data);
    scaler.appendChild(slide);
    inner.appendChild(scaler);
    frame.appendChild(inner);
    cardWrap.appendChild(frame);
    cardWrap.appendChild(el('div', { class: 'text-[11px] font-mono text-mutedL dark:text-mutedD' }, String(i + 1).padStart(2, '0') + ' · ' + window.SLIDE_TITLES[i]));
    host.appendChild(cardWrap);
    // Populate count-up targets immediately (no animation in thumbnails needed; the fn sets finals)
    requestAnimationFrame(() => window.WrappedShell.animateNumbers && window.WrappedShell.animateNumbers(slide, 0));
  });
  return host;
}

function viewShare() {
  const data = currentData();
  const host = el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-8 items-start' });
  host.append(
    el('div', {}, [
      el('div', { class: 'text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium mb-2' }, 'Feed · 1080 × 1350 (4:5)'),
      el('div', { class: 'max-w-[380px]' }, [window.shareCard(data, { ratio: 'feed' })]),
    ]),
    el('div', {}, [
      el('div', { class: 'text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium mb-2' }, 'Story · 1080 × 1920 (9:16)'),
      el('div', { class: 'max-w-[280px]' }, [window.shareCard(data, { ratio: 'story' })]),
    ]),
  );
  return host;
}

function viewBanner() {
  const host = el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl' });
  host.append(
    el('div', {}, [
      el('div', { class: 'text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium mb-2' }, 'Banner actual con chip nuevo (prominente)'),
      _bannerEntry('prominent'),
    ]),
    el('div', {}, [
      el('div', { class: 'text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium mb-2' }, 'Variante discreta (si la quieren menos intrusiva)'),
      _bannerEntry('subtle'),
    ]),
  );
  // States
  host.appendChild(el('div', {}, [
    el('div', { class: 'text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium mb-2' }, 'Estados del chip nuevo'),
    el('div', { class: 'rounded-2xl p-4 bg-white dark:bg-charcoal2 border border-borderL dark:border-borderD flex flex-wrap gap-3 items-center' }, [
      // normal
      el('button', { class: 'relative inline-flex items-center gap-2 h-10 pl-3 pr-4 rounded-full text-white font-sora font-semibold text-[13px] shadow-pop overflow-hidden', style: 'background: linear-gradient(92deg, oklch(0.50 0.10 155), oklch(0.60 0.10 65));' }, [
        el('span', { class: 'w-6 h-6 rounded-full grid place-items-center bg-white/25', html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 2"/></svg>' }),
        'Tu marzo en MFI',
      ]),
      el('div', { class: 'text-[10px] text-mutedL dark:text-mutedD font-mono' }, 'normal'),
      // hover (simulated brighter)
      el('button', { class: 'relative inline-flex items-center gap-2 h-10 pl-3 pr-4 rounded-full text-white font-sora font-semibold text-[13px] shadow-pop overflow-hidden', style: 'background: linear-gradient(92deg, oklch(0.55 0.11 155), oklch(0.66 0.11 65)); transform: translateY(-1px);' }, [
        el('span', { class: 'w-6 h-6 rounded-full grid place-items-center bg-white/30', html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 2"/></svg>' }),
        'Tu marzo en MFI',
      ]),
      el('div', { class: 'text-[10px] text-mutedL dark:text-mutedD font-mono' }, 'hover'),
      // loading
      el('button', { class: 'relative inline-flex items-center gap-2 h-10 pl-3 pr-4 rounded-full text-white font-sora font-semibold text-[13px] shadow-pop overflow-hidden opacity-85', style: 'background: linear-gradient(92deg, oklch(0.50 0.10 155), oklch(0.60 0.10 65));' }, [
        el('span', { class: 'w-4 h-4 rounded-full border-2 border-white border-t-transparent', style: 'animation: spin 0.9s linear infinite;' }),
        'Preparando…',
      ]),
      el('div', { class: 'text-[10px] text-mutedL dark:text-mutedD font-mono' }, 'loading'),
    ]),
  ]));
  // Add spin keyframes once
  if (!document.getElementById('_spin')) {
    const st = document.createElement('style');
    st.id = '_spin';
    st.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(st);
  }
  return host;
}

function viewLoading() {
  const host = el('div', { class: 'flex flex-col items-center gap-3 py-6' });
  const inner = el('div', { class: 'absolute inset-0' });
  inner.appendChild(_loadingScreen());
  host.appendChild(_phoneFrame(inner));
  host.appendChild(el('p', { class: 'text-sm text-mutedL dark:text-mutedD max-w-md text-center' }, 'Mientras fetcheamos movimientos del mes. Incluye spinner, copy cálido y skeleton con shimmer.'));
  return host;
}

function viewEmpty() {
  const host = el('div', { class: 'flex flex-col items-center gap-3 py-6' });
  const inner = el('div', { class: 'absolute inset-0' });
  inner.appendChild(_emptyState());
  host.appendChild(_phoneFrame(inner));
  host.appendChild(el('p', { class: 'text-sm text-mutedL dark:text-mutedD max-w-md text-center pretty' }, 'Cuando el usuario no registró movimientos el mes anterior. CTA amable para que arranque.'));
  return host;
}

function render() {
  applyTheme();
  renderTabs();
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(controlStrip());
  let view;
  switch (state.tab) {
    case 'story':   view = viewStory(); break;
    case 'desktop': view = viewDesktop(); break;
    case 'grid':    view = viewGrid(); break;
    case 'share':   view = viewShare(); break;
    case 'banner':  view = viewBanner(); break;
    case 'loading': view = viewLoading(); break;
    case 'empty':   view = viewEmpty(); break;
    default: view = viewStory();
  }
  app.appendChild(view);
}

document.getElementById('themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  persist(); render();
});

render();
