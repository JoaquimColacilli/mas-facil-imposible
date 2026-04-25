// Goal detail drilldown view

function GoalDetail({ goal, onBack, onDeposit }) {
  const { CATS, fmtMoney, fmtPct, ACTIVITY, daysBetween, TODAY } = window.GoalsData;
  const cat = CATS[goal.category];
  const accent = goal.completed ? 'oklch(0.60 0.13 155)' : (goal.overdue ? 'oklch(0.62 0.18 25)' : cat.color);
  const acts = ACTIVITY.filter(a => a.goalId === goal.id).sort((a, b) => b.date - a.date);
  const monthlyDelta = goal.monthlyTarget - goal.requiredMonthly;

  // Simulator state
  const [simAmount, setSimAmount] = useState(Math.round(goal.monthlyTarget));
  const monthsToTarget = simAmount > 0 ? Math.ceil(goal.remaining / simAmount) : '—';
  const simEta = simAmount > 0 ? new Date(TODAY.getFullYear(), TODAY.getMonth() + Math.ceil(goal.remaining / simAmount), TODAY.getDate()) : null;

  // Milestones derived from target
  const milestones = [
    { pct: 25, label: 'Primer cuarto', amt: goal.target * 0.25 },
    { pct: 50, label: 'Mitad de camino', amt: goal.target * 0.5 },
    { pct: 75, label: 'Recta final', amt: goal.target * 0.75 },
    { pct: 100, label: 'Meta cumplida', amt: goal.target },
  ];

  return (
    <div className="space-y-5 entry">
      {/* Top: back + title */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="h-9 w-9 rounded-lg border border-borderL dark:border-borderD bg-white dark:bg-charcoal2 grid place-items-center hover:bg-mist dark:hover:bg-white/5">
          <Icon name="arrowL" size={15}/>
        </button>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-mono">/metas / detalle</div>
          <div className="font-sora font-semibold text-ink dark:text-white text-[15px]">{goal.name}</div>
        </div>
        <Button variant="secondary" size="sm" icon={<Icon name="edit" size={13}/>}>Editar</Button>
        <Button variant="ghost" size="sm" icon={<Icon name="pause" size={13}/>}>Pausar</Button>
      </div>

      {/* Hero: big number + progress + sparkline */}
      <Card className="relative overflow-hidden p-6">
        {goal.completed && <Confetti/>}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <CatBadge catId={goal.category} size={48}/>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-mono">{cat.label}</div>
                <h2 className="font-sora font-semibold text-[22px] text-ink dark:text-white leading-tight">{goal.name}</h2>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium">Ahorrado</div>
              <div className="font-sora font-bold text-ink dark:text-white leading-[0.95] num mt-1" style={{ fontSize: 'clamp(48px, 6vw, 72px)' }}>
                {fmtMoney(goal.current, goal.currency)}
              </div>
              <div className="text-[14px] text-mutedL dark:text-mutedD font-mono mt-1">de {fmtMoney(goal.target, goal.currency)} · faltan <span className="text-ink dark:text-white">{fmtMoney(goal.remaining, goal.currency)}</span></div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="Progreso" value={fmtPct(goal.pct)} tone="sage"/>
              <Stat label={goal.deadline ? 'Días restantes' : 'Sin fecha'} value={goal.deadline ? (goal.overdue ? `−${Math.abs(goal.daysLeft)}d` : `${goal.daysLeft}d`) : '—'} tone={goal.overdue ? 'rose' : 'neutral'}/>
              <Stat label="Aporte mensual" value={fmtMoney(goal.monthlyTarget, goal.currency)} tone={goal.onTrack ? 'sage' : 'copper'}/>
            </div>
          </div>
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 rounded-xl bg-mist dark:bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-mono">Aportes acumulados</div>
                <div className="text-[11px] font-mono text-mutedL dark:text-mutedD">{goal.monthsActive} meses</div>
              </div>
              <Sparkline data={goal.series} target={goal.target} color={accent} height={140} showDots/>
            </div>
            <div className="mt-3">
              <Progress pct={goal.pct} tone={goal.completed ? 'emerald' : (goal.overdue ? 'rose' : 'sage')} height={10}/>
              <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-mutedL dark:text-mutedD">
                <span>0</span>
                <span className="text-ink dark:text-white font-semibold">{fmtPct(goal.pct)}</span>
                <span>{fmtMoney(goal.target, goal.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Two-col: simulator + milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="sparkles" size={16} className="text-copper"/>
            <h3 className="font-sora font-semibold text-[15px] text-ink dark:text-white">Simulador</h3>
          </div>
          <p className="text-[12px] text-mutedL dark:text-mutedD pretty">¿Cuánto tarda en llegar si depositás distinto?</p>
          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium">Aporte mensual</label>
              <div className="font-mono font-semibold text-ink dark:text-white">{fmtMoney(simAmount, goal.currency)}</div>
            </div>
            <input type="range" min={0} max={Math.round(goal.monthlyTarget * 4)} step={goal.currency === 'ARS' ? 5000 : 25} value={simAmount} onChange={e => setSimAmount(parseInt(e.target.value, 10))}
              className="w-full accent-sage"/>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-mist dark:bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium">Meses para llegar</div>
              <div className="font-sora font-bold text-ink dark:text-white num mt-0.5" style={{ fontSize: 28 }}>{monthsToTarget}</div>
            </div>
            <div className="rounded-xl bg-mist dark:bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium">Llegás en</div>
              <div className="font-sora font-bold text-ink dark:text-white mt-0.5" style={{ fontSize: 18 }}>
                {simEta ? simEta.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>
          <div className="mt-4 text-[12px] text-mutedL dark:text-mutedD pretty">
            {goal.deadline && simEta && (
              simEta <= goal.deadline
                ? <span className="text-sage">✓ Llegás a tiempo para tu fecha límite ({goal.deadline.toLocaleDateString('es-AR', { day:'2-digit', month:'short' })}).</span>
                : <span className="text-rose">Te pasás {daysBetween(goal.deadline, simEta)} días de la fecha. Subí el aporte o corré la fecha.</span>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="flag" size={16} className="text-sage"/>
            <h3 className="font-sora font-semibold text-[15px] text-ink dark:text-white">Hitos</h3>
          </div>
          <p className="text-[12px] text-mutedL dark:text-mutedD pretty">Marcadores del recorrido.</p>
          <div className="mt-4 space-y-3">
            {milestones.map(m => {
              const reached = goal.pct >= m.pct;
              return (
                <div key={m.pct} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${reached ? 'bg-sage text-white' : 'bg-mist dark:bg-white/8 text-mutedL dark:text-mutedD'}`}>
                    {reached ? <Icon name="check" size={13}/> : <span className="font-mono text-[11px]">{m.pct}</span>}
                  </div>
                  <div className="flex-1">
                    <div className={`font-sora font-medium text-[13px] ${reached ? 'text-ink dark:text-white' : 'text-mutedL dark:text-mutedD'}`}>{m.label}</div>
                    <div className="font-mono text-[11px] text-mutedL dark:text-mutedD">{fmtMoney(m.amt, goal.currency)}</div>
                  </div>
                  {reached && <Chip tone="sage" size="sm">Logrado</Chip>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-sora font-semibold text-[15px] text-ink dark:text-white">Movimientos de esta meta</h3>
          <Chip tone="neutral" size="sm">{acts.length}</Chip>
        </div>
        {acts.length === 0 ? (
          <div className="text-[13px] text-mutedL dark:text-mutedD">Sin movimientos todavía.</div>
        ) : (
          <ul className="divide-y divide-borderL dark:divide-borderD">
            {acts.map(a => (
              <li key={a.id} className="py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${a.kind === 'completed' ? 'bg-sage text-white' : a.kind === 'milestone' ? 'bg-amber/20 text-copper' : 'bg-sageBg text-sage dark:bg-sageBgD'}`}>
                  <Icon name={a.kind === 'completed' ? 'check' : a.kind === 'milestone' ? 'flag' : (a.method === 'auto' ? 'refresh' : 'plus')} size={14}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-sora font-medium text-[13px] text-ink dark:text-white">
                    {a.kind === 'deposit' ? (a.method === 'auto' ? 'Depósito automático' : 'Depósito manual') : a.text}
                  </div>
                  <div className="text-[11px] font-mono text-mutedL dark:text-mutedD">
                    {a.date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                {a.amount != null && (
                  <div className="font-mono font-semibold text-ink dark:text-white text-[14px]">+{fmtMoney(a.amount, a.currency)}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Sticky CTA */}
      {!goal.completed && (
        <div className="sticky bottom-4 flex justify-end">
          <Button variant="primary" size="lg" icon={<Icon name="plus" size={15}/>} onClick={onDeposit}>Depositar a {goal.name}</Button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'neutral' }) {
  const colors = { sage: 'text-sage', rose: 'text-rose', copper: 'text-copper', neutral: 'text-ink dark:text-white' };
  return (
    <div className="rounded-xl bg-mist dark:bg-white/5 p-3">
      <div className="text-[10px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium">{label}</div>
      <div className={`font-sora font-bold mt-0.5 num ${colors[tone] || colors.neutral}`} style={{ fontSize: 22 }}>{value}</div>
    </div>
  );
}

window.GoalDetail = GoalDetail;
