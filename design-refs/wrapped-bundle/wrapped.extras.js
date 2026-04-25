// Extras: banner entry chip, loading screen, empty state, share card sizes

function bannerEntry(variant = 'prominent', monthLabel = 'abril') {
  // A row simulating the dashboard banner with the existing chips + new "Wrapped" chip
  const cap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const host = el('div', { class: 'rounded-2xl p-4 bg-white dark:bg-charcoal2 border border-borderL dark:border-borderD shadow-card' }, [
    el('div', { class: 'flex items-start gap-3' }, [
      el('div', { class: 'w-10 h-10 rounded-xl grid place-items-center bg-sage/12 text-sage shrink-0', html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>' }),
      el('div', { class: 'flex-1 min-w-0' }, [
        el('div', { class: 'font-sora font-semibold' }, `Ya cerró ${monthLabel}`),
        el('div', { class: 'text-sm text-mutedL dark:text-mutedD pretty' }, 'Mirá cómo te fue el mes pasado. Descargalo o recorrelo como una historia.'),
      ]),
      el('button', { class: 'w-7 h-7 rounded grid place-items-center text-mutedL dark:text-mutedD hover:bg-mist dark:hover:bg-white/5', 'aria-label': 'Cerrar', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="6"/></svg>' }),
    ]),
    el('div', { class: 'mt-3 flex flex-wrap gap-2' }, [
      // New wrapped chip (prominent, gradient)
      variant === 'prominent' ?
        el('button', { class: 'group relative inline-flex items-center gap-2 h-10 pl-3 pr-4 rounded-full text-white font-sora font-semibold text-[13px] shadow-pop overflow-hidden', style: 'background: linear-gradient(92deg, oklch(0.50 0.10 155) 0%, oklch(0.60 0.10 65) 100%);' }, [
          el('div', { class: 'absolute inset-0 opacity-60 shimmer', style: 'background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); background-size: 200% 100%;' }),
          el('span', { class: 'relative w-6 h-6 rounded-full grid place-items-center bg-white/25', html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 2"/></svg>' }),
          el('span', { class: 'relative' }, `Tu ${monthLabel} en MFI`),
          el('span', { class: 'relative text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/25' }, 'nuevo'),
        ])
        :
        el('button', { class: 'inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-white dark:bg-charcoal border border-borderL dark:border-borderD hover:border-sage/40 font-sora font-medium text-[13px]' }, [
          el('span', { class: 'w-5 h-5 rounded-full grid place-items-center bg-sage/15 text-sage', html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 2"/></svg>' }),
          el('span', {}, `Tu ${monthLabel}`),
        ])
      ,
      // Excel (existing)
      el('button', { class: 'inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-white dark:bg-charcoal border border-borderL dark:border-borderD hover:border-sage/40 font-sora font-medium text-[13px] text-ink/85 dark:text-white/85' }, [
        el('span', { class: 'text-[#10b981]', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13l4 4M12 13l-4 4"/></svg>' }),
        'Excel',
      ]),
      // PDF
      el('button', { class: 'inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-white dark:bg-charcoal border border-borderL dark:border-borderD hover:border-sage/40 font-sora font-medium text-[13px] text-ink/85 dark:text-white/85' }, [
        el('span', { class: 'text-[#ef4444]', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' }),
        'PDF',
      ]),
    ]),
  ]);
  return host;
}

function loadingScreen() {
  const s = slideWrap([
    el('div', { class: 'pt-16 px-6 text-white/80 text-[12px] uppercase tracking-[0.22em] font-medium text-center' }, 'Preparando tu mes'),
    el('div', { class: 'flex-1 px-6 flex flex-col items-center justify-center gap-6' }, [
      el('div', { class: 'relative w-20 h-20' }, [
        el('div', { class: 'absolute inset-0 rounded-full border-4 border-white/15' }),
        el('div', { class: 'absolute inset-0 rounded-full border-4 border-white/80 border-t-transparent', style: 'animation: spin 1.2s linear infinite;' }),
      ]),
      el('div', { class: 'text-center space-y-2' }, [
        el('div', { class: 'font-sora font-semibold text-white text-lg' }, 'Juntando tus movimientos'),
        el('div', { class: 'text-white/75 text-sm' }, '87 movimientos · calculando balance…'),
      ]),
      // Skeleton cards with shimmer
      el('div', { class: 'w-full space-y-2 mt-2' }, [
        el('div', { class: 'h-12 rounded-xl', style: 'background: linear-gradient(90deg, rgba(255,255,255,.1), rgba(255,255,255,.25), rgba(255,255,255,.1)); background-size: 200% 100%; animation: shimmer 1.6s linear infinite;' }),
        el('div', { class: 'h-12 rounded-xl', style: 'background: linear-gradient(90deg, rgba(255,255,255,.1), rgba(255,255,255,.25), rgba(255,255,255,.1)); background-size: 200% 100%; animation: shimmer 1.6s linear infinite; animation-delay:.2s;' }),
        el('div', { class: 'h-12 rounded-xl w-3/4', style: 'background: linear-gradient(90deg, rgba(255,255,255,.1), rgba(255,255,255,.25), rgba(255,255,255,.1)); background-size: 200% 100%; animation: shimmer 1.6s linear infinite; animation-delay:.4s;' }),
      ]),
    ]),
    el('div', { class: 'shrink-0 pb-16 text-center text-white/60 text-[11px]' }, 'MFI · 2026'),
  ]);
  s.prepend(gradientBg('oklch(0.45 0.12 155)', 'oklch(0.50 0.10 65)'));
  s.prepend(blobBg(['oklch(0.65 0.14 155)', 'oklch(0.68 0.12 65)', 'oklch(0.55 0.14 295)'], .45));
  // spin keyframes (scoped inline)
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  s.appendChild(style);
  return s;
}

function emptyState() {
  const s = slideWrap([
    el('div', { class: 'flex-1 px-8 flex flex-col items-center justify-center text-center gap-4' }, [
      el('div', { class: 'w-16 h-16 rounded-2xl grid place-items-center bg-white/15 border border-white/22 text-3xl' }, '🍃'),
      el('div', { class: 'font-sora font-bold text-white text-[22px] leading-tight balance' }, 'Tu mes estuvo tranquilo'),
      el('p', { class: 'text-white/85 text-[15px] pretty max-w-[280px]' }, 'Agregá movimientos a lo largo del mes y te armamos un resumen con los datos más interesantes.'),
      el('div', { class: 'mt-2 grid grid-cols-3 gap-2 w-full max-w-[280px]' }, [
        el('div', { class: 'rounded-lg p-2 bg-white/10 border border-white/18 text-center' }, [
          el('div', { class: 'text-white/60 text-[10px] uppercase tracking-wider font-medium' }, 'Movs'),
          el('div', { class: 'font-mono text-white text-sm mt-0.5' }, '0'),
        ]),
        el('div', { class: 'rounded-lg p-2 bg-white/10 border border-white/18 text-center' }, [
          el('div', { class: 'text-white/60 text-[10px] uppercase tracking-wider font-medium' }, 'Ahorro'),
          el('div', { class: 'font-mono text-white text-sm mt-0.5' }, '$ 0'),
        ]),
        el('div', { class: 'rounded-lg p-2 bg-white/10 border border-white/18 text-center' }, [
          el('div', { class: 'text-white/60 text-[10px] uppercase tracking-wider font-medium' }, 'Metas'),
          el('div', { class: 'font-mono text-white text-sm mt-0.5' }, '0'),
        ]),
      ]),
      el('button', { class: 'mt-3 h-11 px-5 rounded-xl bg-white text-sage font-sora font-semibold shadow-pop' }, 'Agregar un movimiento'),
    ]),
    el('div', { class: 'shrink-0 pb-16 text-center text-white/60 text-[11px]' }, 'Nos vemos el próximo cierre 👋'),
  ]);
  s.prepend(gradientBg('oklch(0.45 0.10 260)', 'oklch(0.48 0.10 155)'));
  s.prepend(blobBg(['oklch(0.58 0.12 260)', 'oklch(0.62 0.12 155)', 'oklch(0.58 0.10 230)'], .45));
  return s;
}

window.WrappedExtras = { bannerEntry, loadingScreen, emptyState };
