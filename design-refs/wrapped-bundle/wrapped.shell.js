// The phone viewport shell — progress bars, tap zones, hint arrow, auto-advance, count-up animations.

const PHONE_W = 390;
const PHONE_H = 844;

function phoneFrame(inner, tone = 'dark') {
  return el('div', { class: 'relative', style: `width:${PHONE_W}px; height:${PHONE_H}px;` }, [
    el('div', { class: 'absolute inset-0 rounded-[42px] p-[6px]', style: `background:${tone==='dark'?'oklch(0.15 0.012 260)':'oklch(0.22 0.012 260)'}; box-shadow: 0 40px 100px -30px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.06);` }, [
      el('div', { class: 'w-full h-full rounded-[36px] overflow-hidden relative bg-black' }, [
        el('div', { class: 'absolute top-0 inset-x-0 h-10 px-6 flex items-center justify-between text-[12px] font-semibold text-white z-30 pointer-events-none' }, [
          el('span', {}, '9:41'),
          el('span', { class: 'flex items-center gap-1', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="12" width="3" height="8" rx="1"/><rect x="7" y="9" width="3" height="11" rx="1"/><rect x="12" y="6" width="3" height="14" rx="1"/><rect x="17" y="3" width="3" height="17" rx="1"/></svg><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg><svg width="18" height="14" viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="18" height="12" rx="2"/><rect x="3" y="5" width="14" height="8" rx="1" fill="currentColor"/><path d="M20 7v4"/></svg>' }),
        ]),
        inner,
      ]),
    ]),
  ]);
}

function desktopBg(colors) {
  const bg = el('div', { class: 'absolute inset-0 overflow-hidden pointer-events-none', style: 'z-index:0; filter: blur(60px); opacity:.85;' });
  const a = el('div', { class: 'blob blob-a', style: `left:10%; top:-5%; width:60%; height:55%; background:${colors[0]};` });
  const b = el('div', { class: 'blob blob-b', style: `right:-5%; top:30%; width:60%; height:55%; background:${colors[1]};` });
  const c = el('div', { class: 'blob blob-c', style: `left:20%; bottom:-15%; width:65%; height:50%; background:${colors[2] || colors[0]};` });
  bg.append(a, b, c);
  return bg;
}

// Animate count-up numbers — sets final value immediately, then eases.
function animateNumbers(slideEl, dur = 900) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hidden = document.hidden;
  slideEl.querySelectorAll('[data-count]').forEach(n => {
    const target = parseFloat(n.getAttribute('data-count'));
    const suffix = n.getAttribute('data-count-suffix') || '';
    n.textContent = new Intl.NumberFormat('es-AR').format(target) + suffix;
    if (reduced || hidden) return;
    const start = performance.now();
    function step(t) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(target * eased);
      n.textContent = new Intl.NumberFormat('es-AR').format(v) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
  slideEl.querySelectorAll('[data-count-currency]').forEach(n => {
    const target = parseFloat(n.getAttribute('data-count-currency'));
    const withSign = n.textContent.trim().startsWith('+') || n.textContent.trim().startsWith('−') || n.textContent.trim().startsWith('-');
    n.textContent = fmtARS(target, withSign);
    if (reduced || hidden) return;
    const start = performance.now();
    function step(t) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(target * eased);
      n.textContent = fmtARS(v, withSign);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

// Share modal — confirms publishing to /comunidad
function shareModal({ data, onClose, onConfirm }) {
  const { PERSONALITIES } = window.MFI;
  const p = PERSONALITIES[data.personality];
  const defaultCaption = `Este fue mi ${data.month.toLowerCase()} 👇 — ¿sos de ${p.label}?`;
  const hashtags = `#wrapped #${data.month.toLowerCase()}${data.year} #${data.personality}`;

  const backdrop = el('div', { class: 'absolute inset-0 grid place-items-center', style: 'background: rgba(0,0,0,.65); z-index:40; backdrop-filter: blur(4px);', onclick: (e) => { if (e.target === backdrop) onClose(); } });

  const card = el('div', { class: 'w-[340px] max-w-[92%] rounded-2xl bg-white text-ink slide-enter', style: 'box-shadow: 0 30px 80px -20px rgba(0,0,0,.5);' }, [
    el('div', { class: 'p-5 border-b border-borderL' }, [
      el('div', { class: 'flex items-center justify-between' }, [
        el('div', { class: 'font-sora font-bold text-[17px]' }, 'Publicar en Comunidad'),
        el('button', { class: 'w-7 h-7 rounded grid place-items-center text-mutedL hover:bg-mist', 'aria-label': 'Cerrar', onclick: onClose, html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="6"/></svg>' }),
      ]),
      el('div', { class: 'mt-1 text-[13px] text-mutedL' }, `Categoría: ${data.personality === 'inversor' ? 'inversiones' : 'ahorros'}`),
    ]),
    el('div', { class: 'p-5 space-y-3' }, [
      el('div', {}, [
        el('label', { class: 'text-[11px] uppercase tracking-wider text-mutedL font-medium' }, 'Tu mensaje'),
        el('textarea', { class: 'mt-1 w-full h-20 rounded-lg border border-borderL p-2.5 text-[14px] resize-none focus:outline-none focus:border-sage', id: '_capt' }, defaultCaption),
      ]),
      // Preview
      el('div', { class: 'rounded-xl overflow-hidden border border-borderL', style: `background: linear-gradient(155deg, ${p.g1}, ${p.g2}); aspect-ratio: 4/5;` }, [
        el('div', { class: 'h-full p-4 text-white flex flex-col justify-between' }, [
          el('div', { class: 'flex items-center justify-between' }, [
            el('div', { class: 'flex items-center gap-1.5' }, [
              el('div', { class: 'w-5 h-5 rounded-md grid place-items-center bg-white text-sage font-sora font-bold text-[10px]' }, 'M'),
              el('span', { class: 'font-sora font-semibold text-[11px]' }, 'MFI'),
            ]),
            el('span', { class: 'text-[9px] uppercase tracking-[0.2em] text-white/75' }, `${data.month} ${data.year}`),
          ]),
          el('div', { class: 'flex items-end justify-between' }, [
            el('div', {}, [
              el('div', { class: 'text-[9px] uppercase tracking-[0.2em] text-white/70 font-medium' }, 'Sos'),
              el('div', { class: 'font-sora font-bold leading-tight text-[22px]' }, p.label),
            ]),
            el('div', { class: 'text-[44px] leading-none' }, p.emoji),
          ]),
        ]),
      ]),
      el('div', { class: 'text-[11px] text-mutedL font-mono' }, hashtags),
    ]),
    el('div', { class: 'p-4 border-t border-borderL flex items-center gap-2' }, [
      el('button', { class: 'flex-1 h-10 rounded-lg border border-borderL font-sora font-medium text-[13px] hover:bg-mist', onclick: onClose }, 'Cancelar'),
      el('button', { class: 'flex-[1.4] h-10 rounded-lg bg-sage text-white font-sora font-semibold text-[13px] shadow-pop hover:bg-sageL', onclick: () => {
        const caption = document.getElementById('_capt')?.value || defaultCaption;
        onConfirm({ caption, hashtags });
      } }, 'Publicar en Comunidad'),
    ]),
  ]);
  backdrop.appendChild(card);
  return backdrop;
}

function buildPhone({ data, autoAdvance = true, onClose = () => {}, showHint = true }) {
  let current = 0;
  let paused = false;
  let userPaused = false;
  let hintShown = false;
  const total = window.SLIDES.length;
  const SLIDE_MS = 6500; // slower pace

  // Slide 0 (portada) waits for user tap, regardless of autoAdvance
  const INTRO_IDX = 0;

  const stage = el('div', { class: 'absolute inset-0', style: 'z-index:5' });
  const controlsHost = el('div', { class: 'absolute inset-0 pointer-events-none', style: 'z-index:15' });

  // Tap zones — sit BELOW controls, and ignore events that originated on a button
  const leftZone = el('div', { class: 'absolute left-0 top-0 bottom-0 w-[35%] tap-zone cursor-pointer', style: 'z-index:10' });
  const rightZone = el('div', { class: 'absolute right-0 top-0 bottom-0 w-[65%] tap-zone cursor-pointer', style: 'z-index:10' });

  const hint = showHint ? el('div', { class: 'absolute bottom-24 right-5 flex flex-col items-center gap-1 text-white arrow-hint pointer-events-none', style: 'z-index:12' }, [
    el('div', { class: 'text-[10px] uppercase tracking-wider text-white/80 font-medium' }, 'tocá'),
    el('div', { class: 'w-9 h-9 rounded-full bg-white/20 backdrop-blur border border-white/30 grid place-items-center', html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' }),
  ]) : null;

  const container = el('div', { class: 'absolute inset-0 bg-black', style: 'z-index:2' });
  container.append(stage, leftZone, rightZone, controlsHost);
  if (hint) container.appendChild(hint);

  let advanceTimer = null;
  let progressStart = 0;
  let progressRAF = null;

  function isAutoForThisSlide() {
    return autoAdvance && current !== INTRO_IDX && !userPaused;
  }

  function renderControls() {
    controlsHost.innerHTML = '';

    const bars = el('div', { class: 'flex items-center gap-1 flex-1' });
    for (let i = 0; i < total; i++) {
      const seg = el('div', { class: 'pg-seg' + (i < current ? ' done' : (i === current ? ' active' : '')) }, [
        el('div', { class: 'pg-fill' }),
      ]);
      bars.appendChild(seg);
    }

    // Pause/play toggle
    const pauseBtn = el('button', {
      class: 'w-8 h-8 rounded-full grid place-items-center bg-black/30 backdrop-blur text-white/95 hover:bg-black/45 transition',
      'aria-label': userPaused ? 'Reproducir' : 'Pausar',
      onclick: (e) => { e.stopPropagation(); togglePause(); },
      html: userPaused
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    });

    const closeBtn = el('button', {
      class: 'w-8 h-8 rounded-full grid place-items-center bg-black/30 backdrop-blur text-white/95 hover:bg-black/45 transition',
      'aria-label': 'Cerrar',
      onclick: (e) => { e.stopPropagation(); onClose(); },
      html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="6"/></svg>',
    });

    const ctrl = el('div', { class: 'absolute top-12 inset-x-0 px-4 flex items-center gap-3 pointer-events-auto' }, [
      bars, pauseBtn, closeBtn,
    ]);
    controlsHost.appendChild(ctrl);
  }

  function tickProgress() {
    const fill = controlsHost.querySelector('.pg-seg.active .pg-fill');
    if (!fill) return;
    const p = Math.min(1, (performance.now() - progressStart) / SLIDE_MS);
    fill.style.transform = `scaleX(${p})`;
    if (p < 1 && !paused && isAutoForThisSlide()) progressRAF = requestAnimationFrame(tickProgress);
  }

  function clearTimers() {
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    if (progressRAF) { cancelAnimationFrame(progressRAF); progressRAF = null; }
  }

  function togglePause() {
    userPaused = !userPaused;
    if (userPaused) {
      clearTimers();
      renderControls();
    } else {
      // resume
      if (isAutoForThisSlide()) {
        // Resume from remaining time based on current bar fill
        const fill = controlsHost.querySelector('.pg-seg.active .pg-fill');
        const m = (fill?.style.transform || '').match(/scaleX\(([\d.]+)\)/);
        const consumed = m ? parseFloat(m[1]) : 0;
        const remaining = Math.max(300, SLIDE_MS * (1 - consumed));
        progressStart = performance.now() - SLIDE_MS * consumed;
        advanceTimer = setTimeout(() => show(current + 1), remaining);
        progressRAF = requestAnimationFrame(tickProgress);
      }
      renderControls();
    }
  }

  function show(idx) {
    if (idx < 0) idx = 0;
    if (idx >= total) { onClose(); return; }
    current = idx;
    stage.innerHTML = '';
    const slideEl = window.SLIDES[idx](data);
    slideEl.classList.add('slide-enter');
    stage.appendChild(slideEl);

    // Make any interactive element inside the slide block tap-zone clicks.
    // In particular, slide 10 has Compartir/Excel/PDF buttons.
    slideEl.querySelectorAll('button, a, [data-noadvance]').forEach(b => {
      b.style.position = b.style.position || 'relative';
      b.style.zIndex = b.style.zIndex || '20';
    });

    // Slide 10 — wire the Compartir button to open the share modal
    if (idx === total - 1) {
      const btns = slideEl.querySelectorAll('button');
      if (btns[0]) {
        btns[0].addEventListener('click', (e) => {
          e.stopPropagation();
          openShare();
        });
      }
    }

    renderControls();
    animateNumbers(slideEl);
    if (hint) {
      if (hintShown) hint.remove();
    }
    clearTimers();
    progressStart = performance.now();
    if (isAutoForThisSlide()) {
      advanceTimer = setTimeout(() => show(current + 1), SLIDE_MS);
      progressRAF = requestAnimationFrame(tickProgress);
    }
  }

  function openShare() {
    clearTimers();
    const modal = shareModal({
      data,
      onClose: () => {
        modal.remove();
        // resume auto-advance if we were on auto
        if (isAutoForThisSlide()) {
          progressStart = performance.now();
          advanceTimer = setTimeout(() => show(current + 1), SLIDE_MS);
          progressRAF = requestAnimationFrame(tickProgress);
        }
      },
      onConfirm: ({ caption, hashtags }) => {
        modal.remove();
        // In this prototype, show a toast. In production this dispatches to /comunidad.
        const toast = el('div', { class: 'absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-white text-ink text-[13px] font-sora font-semibold shadow-pop slide-enter', style: 'z-index:45;' }, '✓ Publicado en /comunidad');
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 2400);
      },
    });
    container.appendChild(modal);
  }

  function next(e) {
    // If the click originated from a button or interactive, ignore.
    if (e && e.target.closest && e.target.closest('button, a, [data-noadvance]')) return;
    if (hint && !hintShown) { hint.remove(); hintShown = true; }
    show(current + 1);
  }
  function prev(e) {
    if (e && e.target.closest && e.target.closest('button, a, [data-noadvance]')) return;
    if (hint && !hintShown) { hint.remove(); hintShown = true; }
    show(current - 1);
  }

  leftZone.addEventListener('click', prev);
  rightZone.addEventListener('click', next);

  // Hold to pause
  let holdTimer = null;
  const pauseStart = () => {
    holdTimer = setTimeout(() => {
      paused = true;
      clearTimers();
    }, 220);
  };
  const pauseEnd = () => {
    clearTimeout(holdTimer);
    if (paused) {
      paused = false;
      if (isAutoForThisSlide()) {
        const fill = controlsHost.querySelector('.pg-seg.active .pg-fill');
        const m = (fill?.style.transform || '').match(/scaleX\(([\d.]+)\)/);
        const consumed = m ? parseFloat(m[1]) : 0;
        const remaining = Math.max(300, SLIDE_MS * (1 - consumed));
        progressStart = performance.now() - SLIDE_MS * consumed;
        advanceTimer = setTimeout(() => show(current + 1), remaining);
        progressRAF = requestAnimationFrame(tickProgress);
      }
    }
  };
  [leftZone, rightZone].forEach(z => {
    z.addEventListener('mousedown', pauseStart);
    z.addEventListener('mouseup', pauseEnd);
    z.addEventListener('mouseleave', pauseEnd);
    z.addEventListener('touchstart', pauseStart, { passive: true });
    z.addEventListener('touchend', pauseEnd);
  });

  show(0);

  return {
    node: container,
    goto: show,
    next: () => next(),
    prev: () => prev(),
    destroy: clearTimers,
  };
}

window.WrappedShell = { buildPhone, phoneFrame, desktopBg, animateNumbers, SLIDE_MS: 6500 };
