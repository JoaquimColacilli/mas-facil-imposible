// Primitives — icons, chips, buttons, sparkline, ring, progress

const { useState, useEffect, useRef, useMemo } = React;

// ---- Icons (inline SVG) ----
const ICONS = {
  plane: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
};
function Icon({ name, size = 16, className = '', stroke = 2 }) {
  const lib = {
    plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.2.6-.6.5-1.1z"/>,
    car: <><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-6l2-5h11l4 5h1a2 2 0 0 1 2 2v4h-2"/><path d="M9 17h6"/></>,
    home: <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></>,
    shield: <><path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z"/></>,
    'trending-up': <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    arrowL: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    chevR: <polyline points="9 18 15 12 9 6"/>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
    bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></>,
    sparkles: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2.5"/></>,
    flag: <><path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/></>,
    wallet: <><path d="M3 7a2 2 0 0 1 2-2h14v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {lib[name] || lib.target}
    </svg>
  );
}

// ---- Chip / pill ----
function Chip({ children, tone = 'neutral', size = 'sm', icon, onClick, active = false }) {
  const tones = {
    neutral: 'bg-mist text-ink dark:bg-white/8 dark:text-white border-borderL/60 dark:border-borderD',
    sage:    'bg-sageBg text-sage dark:bg-sageBgD dark:text-emerald border-transparent',
    copper:  'bg-amber/15 text-copper dark:text-copperL border-transparent',
    rose:    'bg-rose/12 text-rose dark:text-rose border-transparent',
    sky:     'bg-sky/12 text-sky dark:text-sky border-transparent',
    violet:  'bg-violet/12 text-violet dark:text-violet border-transparent',
  };
  const sizes = { sm: 'h-6 px-2 text-[11px]', md: 'h-7 px-2.5 text-[12px]' };
  const base = `inline-flex items-center gap-1 rounded-full border font-sora font-medium ${tones[tone]} ${sizes[size]}`;
  const activeCls = active ? ' ring-2 ring-sage/40 ring-offset-1 ring-offset-parchment dark:ring-offset-charcoal' : '';
  if (onClick) {
    return <button type="button" onClick={onClick} className={base + activeCls + ' hover:opacity-90 transition'}>{icon}<span>{children}</span></button>;
  }
  return <span className={base + activeCls}>{icon}<span>{children}</span></span>;
}

// ---- Buttons ----
function Button({ children, variant = 'primary', size = 'md', icon, onClick, className = '', type = 'button' }) {
  const variants = {
    primary: 'bg-sage hover:bg-sageL text-white shadow-card',
    secondary: 'bg-white dark:bg-charcoal2 text-ink dark:text-white border border-borderL dark:border-borderD hover:bg-mist dark:hover:bg-white/5',
    ghost: 'text-ink dark:text-white hover:bg-mist dark:hover:bg-white/5',
    copper: 'bg-copper hover:bg-copperL text-white shadow-card',
    danger: 'bg-rose hover:bg-rose/90 text-white shadow-card',
  };
  const sizes = { sm: 'h-8 px-3 text-[12px]', md: 'h-10 px-4 text-[13px]', lg: 'h-12 px-5 text-[14px]' };
  return (
    <button type={type} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-sora font-semibold transition ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon}<span>{children}</span>
    </button>
  );
}

// ---- Category badge ----
function CatBadge({ catId, size = 36 }) {
  const c = window.GoalsData.CATS[catId] || window.GoalsData.CATS.otro;
  return (
    <div className="rounded-xl grid place-items-center shrink-0" style={{ width: size, height: size, background: c.color + '22', color: c.color }} aria-label={c.label}>
      <Icon name={c.icon} size={Math.round(size * 0.5)} stroke={2} />
    </div>
  );
}

// ---- Linear progress with milestones ----
function Progress({ pct, tone = 'sage', height = 8, milestones = [25, 50, 75], showMilestones = true }) {
  const colors = {
    sage: 'oklch(0.55 0.12 155)',
    rose: 'oklch(0.62 0.18 25)',
    copper: 'oklch(0.62 0.12 65)',
    emerald: 'oklch(0.62 0.13 155)',
  };
  const c = colors[tone] || colors.sage;
  return (
    <div className="relative w-full" style={{ height }}>
      <div className="absolute inset-0 rounded-full bg-mist dark:bg-white/8" />
      <div className="absolute inset-y-0 left-0 rounded-full bar-fill" style={{ '--p': Math.min(1, pct / 100), width: '100%', background: `linear-gradient(90deg, ${c} 0%, ${tone === 'sage' ? 'oklch(0.65 0.13 155)' : c} 100%)` }} />
      {showMilestones && milestones.map(m => (
        <div key={m} className="absolute top-1/2 -translate-y-1/2 w-px bg-white/70 dark:bg-black/40" style={{ left: m + '%', height: height + 4 }} />
      ))}
    </div>
  );
}

// ---- Sparkline ----
function Sparkline({ data, target, color = 'oklch(0.55 0.12 155)', width = 240, height = 64, showTarget = true, showDots = false }) {
  const max = Math.max(target || Math.max(...data), ...data);
  const pad = 4;
  const w = width, h = height;
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y, v];
  });
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${pts[pts.length-1][0]} ${h-pad} L ${pts[0][0]} ${h-pad} Z`;
  const targetY = h - pad - (target / max) * (h - pad * 2);
  const last = pts[pts.length - 1];
  const id = useMemo(() => 'spk_' + Math.random().toString(36).slice(2, 8), []);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35"/>
          <stop offset="1" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="spark-path" style={{ '--len': w * 1.6 }}/>
      {showTarget && target && (
        <line x1={pad} x2={w-pad} y1={targetY} y2={targetY} stroke={color} strokeOpacity=".35" strokeWidth="1" strokeDasharray="3 3"/>
      )}
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} stroke="white" strokeWidth="1.5"/>
      {showDots && pts.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={color} fillOpacity=".55"/>
      ))}
    </svg>
  );
}

// ---- Radial ring ----
function Ring({ pct, size = 56, stroke = 6, color = 'oklch(0.55 0.12 155)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (c * Math.min(100, pct)) / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)' }}/>
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono font-semibold" style={{ fontSize: Math.max(10, size * 0.22) }}>
        {children != null ? children : Math.round(pct) + '%'}
      </div>
    </div>
  );
}

// ---- Card primitive ----
function Card({ children, className = '', as = 'div', onClick }) {
  const Tag = as;
  return (
    <Tag onClick={onClick} className={`rounded-2xl bg-white dark:bg-charcoal2 border border-borderL dark:border-borderD shadow-card ${onClick ? 'cursor-pointer hover:shadow-pop transition' : ''} ${className}`}>{children}</Tag>
  );
}

// Confetti for completed
function Confetti() {
  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444'];
  const pieces = Array.from({ length: 18 });
  return (
    <div className="confetti pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <span key={i} style={{
          left: (5 + (i * 5.3) % 90) + '%',
          top: -10,
          background: colors[i % colors.length],
          animationDelay: (i * 0.13) + 's',
          transform: `rotate(${i * 27}deg)`,
        }}/>
      ))}
    </div>
  );
}

Object.assign(window, { Icon, Chip, Button, CatBadge, Progress, Sparkline, Ring, Card, Confetti });
