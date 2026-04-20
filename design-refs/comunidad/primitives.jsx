// Shared UI primitives.

// Avatar with a deterministic warm tone + initials
const Avatar = ({ user, size = 36, className = '' }) => {
  const s = size;
  const initials = (user?.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const tone = user?.avatarTone || 'sage';
  const bgMap = {
    sage:       'oklch(0.90 0.04 155)',
    copper:     'oklch(0.92 0.05 65)',
    sky500:     'oklch(0.90 0.05 230)',
    violet500:  'oklch(0.90 0.05 295)',
    rose500:    'oklch(0.90 0.05 15)',
    emerald500: 'oklch(0.90 0.05 155)',
  };
  const fgMap = {
    sage:       'oklch(0.40 0.09 155)',
    copper:     'oklch(0.45 0.09 65)',
    sky500:     'oklch(0.40 0.10 230)',
    violet500:  'oklch(0.40 0.12 295)',
    rose500:    'oklch(0.45 0.14 15)',
    emerald500: 'oklch(0.35 0.10 155)',
  };
  return (
    <div
      className={"rounded-full grid place-items-center font-sora font-semibold select-none " + className}
      style={{
        width: s, height: s,
        background: bgMap[tone] || bgMap.sage,
        color: fgMap[tone] || fgMap.sage,
        fontSize: Math.round(s * 0.38),
        letterSpacing: '-0.01em',
      }}
      aria-label={user?.name}
    >
      {initials}
    </div>
  );
};

// Category chip (small inline)
const CatChip = ({ id, size = 'sm' }) => {
  const cat = CATEGORIES.find(c => c.id === id);
  if (!cat) return null;
  const colorMap = {
    sage: 'oklch(0.50 0.10 155)',
    copper: 'oklch(0.60 0.10 65)',
    sky500: 'oklch(0.55 0.12 230)',
    violet500: 'oklch(0.55 0.14 295)',
    rose500: 'oklch(0.60 0.14 15)',
    emerald500: 'oklch(0.55 0.12 155)',
    muted: 'oklch(0.55 0.008 260)',
  };
  const c = colorMap[cat.color] || colorMap.muted;
  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={"inline-flex items-center gap-1 rounded-full font-medium " + padding}
      style={{
        color: c,
        background: 'color-mix(in oklch, ' + c + ' 10%, transparent)',
        border: '1px solid color-mix(in oklch, ' + c + ' 22%, transparent)',
      }}
    >
      <Icon name={cat.icon} className="w-3 h-3" strokeWidth={2} />
      {cat.label}
    </span>
  );
};

const BadgePill = ({ karma, showKarma = true }) => {
  const b = badgeFor(karma);
  const colorMap = {
    sage: 'oklch(0.50 0.10 155)',
    copper: 'oklch(0.60 0.10 65)',
    sky500: 'oklch(0.55 0.12 230)',
    violet500: 'oklch(0.55 0.14 295)',
    rose500: 'oklch(0.60 0.14 15)',
    emerald500: 'oklch(0.55 0.12 155)',
    muted: 'oklch(0.55 0.008 260)',
  };
  const c = colorMap[b.color] || colorMap.muted;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium"
      style={{ color: c }}>
      <Icon name="Award" className="w-3 h-3" strokeWidth={2} />
      {b.label}
      {showKarma && <span className="font-mono text-[11px] opacity-75">· {fmtNum(karma)}</span>}
    </span>
  );
};

// Button
const Button = ({ variant = 'primary', size = 'md', children, className = '', icon, iconRight, ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-sora font-medium rounded-xl focus-ring transition-colors';
  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
  };
  const variants = {
    primary: 'bg-sage text-white hover:bg-sage-600 active:bg-sage-600',
    ghost:   'text-ink/80 hover:bg-mist dark:text-white/85 dark:hover:bg-white/5',
    outline: 'border border-border dark:border-border-dark text-ink dark:text-white/90 hover:bg-mist dark:hover:bg-white/5 bg-white dark:bg-charcoal2',
    subtle:  'bg-mist dark:bg-white/5 text-ink dark:text-white/90 hover:bg-mist/80 dark:hover:bg-white/10',
    copper:  'bg-copper text-white hover:bg-copper-600',
    danger:  'text-rose500 hover:bg-rose500/10',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {icon && <Icon name={icon} className="w-4 h-4" strokeWidth={2} />}
      {children}
      {iconRight && <Icon name={iconRight} className="w-4 h-4" strokeWidth={2} />}
    </button>
  );
};

// Card container
const Card = ({ className = '', children, hoverable = false, ...rest }) => (
  <div
    className={
      "bg-white dark:bg-charcoal2 border border-border dark:border-border-dark rounded-xl shadow-card " +
      (hoverable ? "hover-raise hover:border-[oklch(0.80_0.01_80)] dark:hover:border-[oklch(0.40_0.014_260)] " : "") +
      className
    }
    {...rest}
  >
    {children}
  </div>
);

// Image placeholder with stripes + monospace label
const ImagePlaceholder = ({ label = 'imagen adjunta', aspect = '16/9', className = '' }) => {
  const [dark, setDark] = React.useState(document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return (
    <div
      className={"relative rounded-lg overflow-hidden border border-border dark:border-border-dark " +
        (dark ? 'stripes-dark ' : 'stripes-light ') + className}
      style={{ aspectRatio: aspect }}
    >
      <div className="absolute inset-0 grid place-items-center">
        <div className="font-mono text-[11px] px-2 py-1 rounded bg-white/85 dark:bg-charcoal/85 border border-border dark:border-border-dark text-muted dark:text-muted-dark">
          {label}
        </div>
      </div>
    </div>
  );
};

// MFI embedded chip — three variants
const MfiEmbed = ({ data, variant = 'compact' }) => {
  if (!data) return null;
  const isGoal = data.kind === 'goal';
  const isTxn  = data.kind === 'txn';

  // accent by category
  const accent = isGoal ? 'oklch(0.50 0.10 155)' : 'oklch(0.65 0.18 15)';
  const amount = isGoal
    ? (data.currency === 'USD' ? fmtUSD(data.current) : fmtARS(data.current))
    : (data.currency === 'USD' ? fmtUSD(data.amount) : fmtARS(data.amount));
  const target = isGoal ? (data.currency === 'USD' ? fmtUSD(data.target) : fmtARS(data.target)) : null;
  const pct = isGoal ? Math.round((data.current / data.target) * 100) : null;

  if (variant === 'minimal') {
    // expanding chip
    const [open, setOpen] = React.useState(false);
    return (
      <button
        onClick={() => setOpen(o => !o)}
        className="group inline-flex items-center gap-2 rounded-lg border border-border dark:border-border-dark bg-parchment2 dark:bg-ink/40 px-2.5 py-1.5 text-xs hover:border-[oklch(0.75_0.04_155)] transition-colors"
      >
        <span className="w-5 h-5 rounded grid place-items-center" style={{ background: 'color-mix(in oklch, ' + accent + ' 15%, transparent)', color: accent }}>
          <Icon name={isGoal ? 'Target' : 'Receipt'} className="w-3 h-3" strokeWidth={2.2} />
        </span>
        <span className="font-medium">{isGoal ? 'Meta de MFI' : 'Movimiento de MFI'}</span>
        <span className="font-mono text-[11px]" style={{ color: accent }}>{amount}</span>
        {open && (
          <span className="ml-1 text-muted dark:text-muted-dark">· {isGoal ? `${pct}% de ${target}` : data.category}</span>
        )}
        <Icon name="ChevronRight" className={"w-3 h-3 opacity-60 transition-transform " + (open ? 'rotate-90' : '')} strokeWidth={2.2} />
      </button>
    );
  }

  if (variant === 'rich' && isGoal) {
    return (
      <div className="rounded-lg border border-border dark:border-border-dark bg-parchment2 dark:bg-ink/40 p-3">
        <div className="flex items-center gap-2 text-[11px] text-muted dark:text-muted-dark">
          <Icon name="Target" className="w-3.5 h-3.5" strokeWidth={2.2} style={{ color: accent }} />
          <span className="font-medium uppercase tracking-wider">Meta de MFI</span>
          <span className="ml-auto font-mono">{data.months}/{data.totalMonths} meses</span>
        </div>
        <div className="mt-1 font-sora font-semibold">{data.title}</div>
        <div className="mt-2 flex items-end justify-between">
          <div className="font-mono text-lg" style={{ color: accent }}>{amount}</div>
          <div className="font-mono text-xs text-muted dark:text-muted-dark">de {target}</div>
        </div>
        <div className="mt-2 h-1.5 bg-mist dark:bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: pct + '%', background: accent }} />
        </div>
      </div>
    );
  }

  // compact (default)
  return (
    <div className="rounded-lg border border-border dark:border-border-dark bg-parchment2 dark:bg-ink/40 p-2.5 flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: 'color-mix(in oklch, ' + accent + ' 14%, transparent)', color: accent }}>
        <Icon name={isGoal ? 'Target' : 'Receipt'} className="w-4 h-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted dark:text-muted-dark">
          {isGoal ? 'Meta de MFI' : 'Movimiento de MFI'}
          {isTxn && data.category ? ' · ' + data.category : ''}
        </div>
        <div className="font-medium text-sm truncate">{data.title}</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm" style={{ color: accent }}>
          {isTxn ? '−' : ''}{amount}
        </div>
        {isGoal && <div className="font-mono text-[11px] text-muted dark:text-muted-dark">{pct}%</div>}
      </div>
    </div>
  );
};

// Relative time helper (the data is pre-baked to keep it simple)
const RelTime = ({ ts }) => (
  <time className="text-xs text-muted dark:text-muted-dark">hace {ts}</time>
);

Object.assign(window, { Avatar, CatChip, BadgePill, Button, Card, ImagePlaceholder, MfiEmbed, RelTime });
