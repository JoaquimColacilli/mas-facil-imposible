// App shell: sidebar (208px) + topbar + mobile bottom nav.

const NAV = [
  { id: 'inicio',      label: 'Inicio',      icon: 'Home' },
  { id: 'movimientos', label: 'Movimientos', icon: 'ArrowLeftRight' },
  { id: 'metas',       label: 'Metas',       icon: 'Target' },
  { id: 'analisis',    label: 'Análisis',    icon: 'BarChart3' },
  { id: 'inversiones', label: 'Inversiones', icon: 'TrendingUp' },
  { id: 'amigos',      label: 'Amigos',      icon: 'Users' },
  { id: 'mensajes',    label: 'Mensajes',    icon: 'MessageCircle' },
  { id: 'comunidad',   label: 'Comunidad',   icon: 'MessagesSquare', isNew: true },
];

const Sidebar = ({ active = 'comunidad' }) => {
  return (
    <aside className="hidden md:flex shrink-0 flex-col w-[208px] h-full border-r border-border dark:border-border-dark bg-white dark:bg-charcoal2">
      <div className="h-14 px-4 flex items-center gap-2 border-b border-border dark:border-border-dark">
        <div className="w-7 h-7 rounded-lg grid place-items-center bg-sage text-white font-sora font-bold text-[13px]">M</div>
        <div className="font-sora font-semibold tracking-tight">MFI</div>
        <span className="ml-auto text-[10px] font-mono text-muted dark:text-muted-dark">v2.4</span>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto scrollbar-thin">
        {NAV.map(item => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              className={
                "w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] font-medium transition-colors focus-ring " +
                (isActive
                  ? "bg-sage/10 text-sage dark:text-sage-400 dark:bg-sage/15"
                  : "text-ink/75 hover:bg-mist dark:text-white/75 dark:hover:bg-white/5")
              }
            >
              <Icon name={item.icon} className="w-4 h-4" strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
              {item.isNew && (
                <span className="ml-auto text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-copper/15 text-copper">
                  nuevo
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border dark:border-border-dark">
        <div className="rounded-lg bg-parchment2 dark:bg-ink/40 p-3">
          <div className="flex items-center gap-2">
            <Avatar user={USERS.me} size={28} />
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{USERS.me.name}</div>
              <div className="text-[10px] text-muted dark:text-muted-dark"><BadgePill karma={USERS.me.karma} /></div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Topbar = ({ theme, setTheme, onOpenComposer, mobile }) => {
  return (
    <header className="h-14 shrink-0 border-b border-border dark:border-border-dark bg-white/80 dark:bg-charcoal2/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="h-full px-4 md:px-6 flex items-center gap-3">
        {mobile && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg grid place-items-center bg-sage text-white font-sora font-bold text-[13px]">M</div>
            <div className="font-sora font-semibold">MFI</div>
          </div>
        )}
        {!mobile && (
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="w-full h-9 rounded-lg border border-border dark:border-border-dark bg-parchment2 dark:bg-ink/40 flex items-center px-3 gap-2 text-sm text-muted dark:text-muted-dark">
              <Icon name="Search" className="w-4 h-4" strokeWidth={2} />
              <span>Buscar en MFI…</span>
              <kbd className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded border border-border dark:border-border-dark">⌘K</kbd>
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-lg grid place-items-center hover:bg-mist dark:hover:bg-white/5 focus-ring"
            aria-label="Cambiar tema"
          >
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-lg grid place-items-center hover:bg-mist dark:hover:bg-white/5 focus-ring relative" aria-label="Notificaciones">
            <Icon name="Bell" className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-copper"></span>
          </button>
          <div className="hidden md:flex items-center gap-2 ml-1 pl-2 border-l border-border dark:border-border-dark">
            <Avatar user={USERS.me} size={28} />
            <Icon name="ChevronDown" className="w-3.5 h-3.5 text-muted dark:text-muted-dark" />
          </div>
        </div>
      </div>
    </header>
  );
};

const MobileBottomNav = ({ active = 'comunidad', onNav }) => {
  const items = NAV.slice(0, 7).concat([NAV[7]]);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white dark:bg-charcoal2 border-t border-border dark:border-border-dark flex items-stretch justify-around z-30">
      {items.map(item => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            onClick={() => onNav && onNav(item.id)}
            className={"flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium " +
              (isActive ? "text-sage" : "text-muted dark:text-muted-dark")}
          >
            <Icon name={item.icon} className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="truncate max-w-[52px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

Object.assign(window, { Sidebar, Topbar, MobileBottomNav });
