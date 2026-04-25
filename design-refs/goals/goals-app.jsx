// Main app: layout chrome, state machine, tweaks panel

const { GOALS: ALL, CATS: ALLCATS } = window.GoalsData;

// Defaults wrapped for the host's edit-mode protocol
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "scenario": "many",
  "theme": "light",
  "showSidebar": true
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [openId, setOpenId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('progress');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tweaks.theme === 'dark');
  }, [tweaks.theme]);

  // Filter goals by scenario
  const allGoals = useMemo(() => {
    switch (tweaks.scenario) {
      case 'empty':    return [];
      case 'one':      return [ALL[0]];
      case 'many':     return ALL.filter(g => !g.completed && !g.overdue).slice(0, 5);
      case 'completed':return ALL.filter(g => g.completed);
      case 'overdue':  return [ALL.find(g => g.overdue), ALL[0], ALL[1]].filter(Boolean);
      case 'detail':   return [ALL[0]];
      case 'mixed':
      default:         return ALL;
    }
  }, [tweaks.scenario]);

  // Open detail by default in 'detail' scenario
  useEffect(() => {
    if (tweaks.scenario === 'detail') {
      setOpenId(ALL[0].id);
    } else {
      setOpenId(null);
    }
  }, [tweaks.scenario]);

  const filtered = useMemo(() => {
    let xs = filter === 'all' ? allGoals : allGoals.filter(g => g.category === filter);
    const sorted = [...xs];
    if (sort === 'progress') sorted.sort((a, b) => b.pct - a.pct);
    else if (sort === 'deadline') sorted.sort((a, b) => (a.deadline || 1e15) - (b.deadline || 1e15));
    else if (sort === 'amount') sorted.sort((a, b) => b.target - a.target);
    else if (sort === 'recent') sorted.sort((a, b) => b.createdAt - a.createdAt);
    return sorted;
  }, [allGoals, filter, sort]);

  const counts = useMemo(() => {
    const c = { all: allGoals.length };
    Object.keys(ALLCATS).forEach(k => c[k] = 0);
    allGoals.forEach(g => { c[g.category] = (c[g.category] || 0) + 1; });
    return c;
  }, [allGoals]);

  const openGoal = openId ? ALL.find(g => g.id === openId) : null;
  const activeGoals = filtered.filter(g => !g.completed);
  const completedGoals = filtered.filter(g => g.completed);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (decorative — matches the screenshot's chrome) */}
      {tweaks.showSidebar && <Sidebar/>}

      <div className="flex-1 min-w-0">
        <Topbar/>
        <main className="max-w-[1280px] mx-auto px-6 lg:px-8 py-6 space-y-6">
          {openGoal ? (
            <GoalDetail goal={openGoal} onBack={() => setOpenId(null)} onDeposit={() => alert('Depositar — en el proyecto real abrís el flow de movimiento.')}/>
          ) : allGoals.length === 0 ? (
            <>
              <PageHeader onNew={() => setCreateOpen(true)}/>
              <EmptyState onNew={() => setCreateOpen(true)}/>
            </>
          ) : (
            <>
              <PageHeader onNew={() => setCreateOpen(true)} count={allGoals.length}/>
              <GoalsHero goals={allGoals} onNew={() => setCreateOpen(true)}/>
              <GoalsFilters filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} counts={counts}/>
              {activeGoals.length > 0 && (
                <div>
                  <SectionHeader title="Activas" count={activeGoals.length} hint="Tus metas en marcha"/>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger">
                    {activeGoals.map(g => (
                      <GoalCard key={g.id} goal={g}
                        onOpen={() => setOpenId(g.id)}
                        onDeposit={() => alert('Depositar a ' + g.name)}/>
                    ))}
                  </div>
                </div>
              )}
              {completedGoals.length > 0 && (
                <div>
                  <SectionHeader title="Cumplidas" count={completedGoals.length} hint="Buen trabajo"/>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger">
                    {completedGoals.map(g => (
                      <GoalCard key={g.id} goal={g} onOpen={() => setOpenId(g.id)}/>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <footer className="pt-6 pb-10 text-center text-[11px] text-mutedL dark:text-mutedD font-mono">
            MFI · /metas · prototipo de rediseño · {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </footer>
        </main>
      </div>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks · /metas">
        <TweakSection title="Estado">
          <TweakRadio
            label="Escenario"
            value={tweaks.scenario}
            onChange={(v) => setTweak('scenario', v)}
            options={[
              { value: 'many',      label: 'Varias' },
              { value: 'one',       label: '1 meta' },
              { value: 'mixed',     label: 'Mix' },
              { value: 'completed', label: 'Cumplidas' },
              { value: 'overdue',   label: 'Vencida' },
              { value: 'detail',    label: 'Detalle' },
              { value: 'empty',     label: 'Vacío' },
            ]}
          />
        </TweakSection>
        <TweakSection title="Apariencia">
          <TweakRadio
            label="Tema"
            value={tweaks.theme}
            onChange={(v) => setTweak('theme', v)}
            options={[{value:'light',label:'Claro'},{value:'dark',label:'Oscuro'}]}
          />
          <TweakToggle
            label="Sidebar"
            value={tweaks.showSidebar}
            onChange={(v) => setTweak('showSidebar', v)}
          />
        </TweakSection>
        <TweakSection title="Acciones">
          <TweakButton onClick={() => setCreateOpen(true)}>Abrir modal de crear meta</TweakButton>
        </TweakSection>
      </TweaksPanel>

      {createOpen && <CreateGoalModal onClose={() => setCreateOpen(false)}/>}
    </div>
  );
}

function PageHeader({ onNew, count }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-mono">Joaquín · /metas</div>
        <h1 className="font-sora font-bold text-ink dark:text-white" style={{ fontSize: 28 }}>Metas{count != null && <span className="ml-2 font-mono text-mutedL dark:text-mutedD font-semibold text-[15px]">{count}</span>}</h1>
      </div>
      <Button variant="ghost" size="sm" icon={<Icon name="info" size={13}/>} className="hidden md:inline-flex">Cómo funcionan</Button>
      <Button variant="primary" icon={<Icon name="plus" size={14}/>} onClick={onNew}>Nueva meta</Button>
    </div>
  );
}

function SectionHeader({ title, count, hint }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div className="flex items-baseline gap-2">
        <h2 className="font-sora font-semibold text-ink dark:text-white text-[18px]">{title}</h2>
        {count != null && <span className="font-mono text-mutedL dark:text-mutedD text-[13px]">{count}</span>}
      </div>
      {hint && <span className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-mono">{hint}</span>}
    </div>
  );
}

// Decorative app chrome (matches the screenshot)
function Sidebar() {
  const items = [
    { icon: 'home', label: 'Inicio' },
    { icon: 'wallet', label: 'Movimientos' },
    { icon: 'target', label: 'Metas', active: true },
    { icon: 'sparkles', label: 'Análisis' },
    { icon: 'trending-up', label: 'Inversiones' },
  ];
  return (
    <aside className="hidden md:block w-[208px] shrink-0 border-r border-borderL dark:border-borderD bg-white dark:bg-charcoal2 min-h-screen">
      <div className="p-4 border-b border-borderL dark:border-borderD flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg grid place-items-center bg-sage text-white font-sora font-bold text-[13px]">M</div>
        <div className="font-sora font-semibold tracking-tight">MFI</div>
      </div>
      <div className="p-2">
        <div className="px-2 py-2">
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={12}/>} className="w-full justify-start">Agregar movimiento</Button>
        </div>
        <div className="px-2 mt-2 mb-1 text-[10px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium">Navegar</div>
        <ul className="space-y-0.5">
          {items.map(it => (
            <li key={it.label}>
              <a href="#" className={`flex items-center gap-2 px-2.5 h-8 rounded-lg text-[13px] font-sora ${it.active ? 'bg-sageBg text-sage dark:bg-sageBgD dark:text-emerald font-semibold' : 'text-ink dark:text-white hover:bg-mist dark:hover:bg-white/5'}`}>
                <Icon name={it.icon} size={14}/>
                <span>{it.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-20 h-14 border-b border-borderL dark:border-borderD bg-white/85 dark:bg-charcoal2/85 backdrop-blur flex items-center px-6 gap-4">
      <div className="text-[12px] font-mono text-mutedL dark:text-mutedD flex items-center gap-3">
        <span>MEP <span className="text-ink dark:text-white">$1.441</span></span>
        <span>Blue <span className="text-ink dark:text-white">$1.408</span></span>
      </div>
      <div className="flex-1"/>
      <div className="hidden md:flex items-center gap-3 text-[12px] font-mono text-mutedL dark:text-mutedD">
        <span>22°</span><span>13:21</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-sage text-white grid place-items-center font-sora font-bold text-[12px]">JC</div>
    </header>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
