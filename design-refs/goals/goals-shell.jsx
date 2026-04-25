// App shell + page hero + filters + list views by state

const { CATS: _CATS, GOALS: _GOALS, ACTIVITY: _ACT, TIPS: _TIPS, fmtMoney: _fmtMoney, fmtUSD: _fmtUSD } = window.GoalsData;

// Hero: total saved + global progress + featured next milestone
function GoalsHero({ goals, onNew }) {
  const active = goals.filter(g => !g.completed);
  const completed = goals.filter(g => g.completed);
  // Aggregate USD-equivalent (treat ARS at 1100 = USD for the demo)
  const ARSUSD = 1100;
  const toUSD = (g) => g.currency === 'USD' ? g.current : g.current / ARSUSD;
  const targetUSD = (g) => g.currency === 'USD' ? g.target : g.target / ARSUSD;
  const totalSavedUSD = goals.reduce((acc, g) => acc + toUSD(g), 0);
  const totalTargetUSD = goals.reduce((acc, g) => acc + targetUSD(g), 0);
  const globalPct = totalTargetUSD ? (totalSavedUSD / totalTargetUSD) * 100 : 0;

  // Next milestone — closest active goal to its next 25/50/75/100
  let next = null;
  for (const g of active) {
    const nextPct = [25, 50, 75, 100].find(p => g.pct < p);
    if (!nextPct) continue;
    const remaining = (nextPct / 100) * g.target - g.current;
    if (!next || remaining < next.remaining) {
      next = { goal: g, pct: nextPct, remaining };
    }
  }

  return (
    <div className="relative rounded-3xl overflow-hidden hero-glow text-white p-6 md:p-8 grain entry">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        <div className="lg:col-span-7">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/65 font-mono">Tus metas · abril 2026</div>
          <h1 className="font-sora font-bold leading-[0.95] mt-2 balance" style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}>
            Llevás <span className="text-sageL">{_fmtUSD(totalSavedUSD)}</span> ahorrados
          </h1>
          <p className="mt-3 text-white/75 text-[15px] pretty max-w-lg">
            En {active.length} metas activas{completed.length ? `, ${completed.length} ya cumplida${completed.length>1?'s':''}` : ''}. Es un {Math.round(globalPct)}% del total que te propusiste.
          </p>
          <div className="mt-5 max-w-lg">
            <Progress pct={globalPct} tone="sage" height={10} milestones={[25,50,75]}/>
            <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-white/55">
              <span>0</span>
              <span className="text-white">{_fmtUSD(totalSavedUSD)} / {_fmtUSD(totalTargetUSD)}</span>
              <span>{Math.round(globalPct)}%</span>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <Button variant="copper" icon={<Icon name="plus" size={14}/>} onClick={onNew}>Nueva meta</Button>
            <Button variant="ghost" className="text-white hover:bg-white/10" icon={<Icon name="bolt" size={14}/>}>Activar ahorro auto</Button>
          </div>
        </div>
        <div className="lg:col-span-5">
          {next ? (
            <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/60 font-mono mb-3">Tu próximo hito</div>
              <div className="flex items-center gap-4">
                <Ring pct={next.goal.pct} size={72} stroke={7} color="oklch(0.78 0.13 155)"/>
                <div className="flex-1 min-w-0">
                  <div className="font-sora font-semibold text-white text-[18px] truncate">{next.goal.name}</div>
                  <div className="text-[12px] font-mono text-white/65 mt-0.5">
                    {next.goal.pct}% → {next.pct}% · faltan {_fmtMoney(next.remaining, next.goal.currency)}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-[13px] text-white/80 pretty">
                Con tu ritmo actual de {_fmtMoney(next.goal.monthlyTarget, next.goal.currency)} mensual, llegás al {next.pct}% en menos de 2 meses.
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/60 font-mono">Sin hitos pendientes</div>
              <div className="font-sora font-semibold text-white mt-1">¡Todas tus metas están completas!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Filter row
function GoalsFilters({ filter, setFilter, sort, setSort, counts }) {
  const all = Object.values(_CATS);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Chip tone={filter === 'all' ? 'sage' : 'neutral'} active={filter === 'all'} onClick={() => setFilter('all')}>
        Todas <span className="ml-1 font-mono opacity-70">{counts.all}</span>
      </Chip>
      {all.map(c => counts[c.id] > 0 && (
        <Chip key={c.id} tone={filter === c.id ? 'sage' : 'neutral'} active={filter === c.id} onClick={() => setFilter(c.id)}
          icon={<Icon name={c.icon} size={11}/>}>
          {c.label} <span className="ml-1 font-mono opacity-70">{counts[c.id]}</span>
        </Chip>
      ))}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-[11px] text-mutedL dark:text-mutedD font-mono uppercase tracking-wider">Orden</span>
        <select value={sort} onChange={e => setSort(e.target.value)} className="h-8 px-2 rounded-lg border border-borderL dark:border-borderD bg-white dark:bg-charcoal text-[12px] font-mono focus:outline-none focus:border-sage">
          <option value="progress">Más cerca de cumplir</option>
          <option value="deadline">Fecha más próxima</option>
          <option value="amount">Mayor monto</option>
          <option value="recent">Más recientes</option>
        </select>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ onNew }) {
  return (
    <Card className="p-10 grid place-items-center text-center entry">
      <div className="w-20 h-20 rounded-2xl bg-sageBg dark:bg-sageBgD grid place-items-center mb-4">
        <Icon name="target" size={36} className="text-sage"/>
      </div>
      <h3 className="font-sora font-semibold text-[20px] text-ink dark:text-white">Todavía no tenés metas</h3>
      <p className="text-mutedL dark:text-mutedD text-[14px] max-w-md mt-2 pretty">
        Una meta es una promesa con un número y una fecha. Empezá con algo chico — un viaje en 6 meses, un fondo de emergencia — y dejá que el ahorro automático haga el resto.
      </p>
      <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
        <Button variant="primary" icon={<Icon name="plus" size={14}/>} onClick={onNew}>Crear mi primera meta</Button>
        <Button variant="ghost">Ver ejemplos</Button>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl w-full">
        {['Viaje', 'Fondo de emergencia', 'Auto'].map((t, i) => (
          <div key={t} className="rounded-xl border border-borderL dark:border-borderD p-4 text-left">
            <div className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-mono">Idea {i+1}</div>
            <div className="font-sora font-semibold text-ink dark:text-white mt-1">{t}</div>
            <div className="text-[12px] text-mutedL dark:text-mutedD mt-1 pretty">{['U$S 1.500 en 6 meses', '6 meses de gastos', 'U$S 18.000 en 24 meses'][i]}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

window.GoalsHero = GoalsHero;
window.GoalsFilters = GoalsFilters;
window.EmptyState = EmptyState;
