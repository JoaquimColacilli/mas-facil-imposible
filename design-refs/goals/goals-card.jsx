// Goal card — used in lists. Rich variant.

const { fmtMoney, fmtPct, fmtUSD, fmtARS, CATS } = window.GoalsData;

function GoalCard({ goal, onOpen, onDeposit, variant = 'rich' }) {
  const cat = CATS[goal.category];
  const tone = goal.completed ? 'emerald' : (goal.overdue ? 'rose' : 'sage');
  const accent = goal.completed ? 'oklch(0.60 0.13 155)' : (goal.overdue ? 'oklch(0.62 0.18 25)' : cat.color);
  const monthlyDelta = goal.monthlyTarget - goal.requiredMonthly;
  const onTrackTxt = goal.completed ? 'Cumplida' : (goal.overdue ? 'Vencida' : (goal.onTrack ? 'En ritmo' : 'Atrás del ritmo'));
  const onTrackTone = goal.completed ? 'sage' : (goal.overdue ? 'rose' : (goal.onTrack ? 'sage' : 'copper'));

  return (
    <Card className={"relative overflow-hidden p-5 " + (goal.completed ? 'ring-1 ring-emerald/30' : '')}>
      {goal.completed && <Confetti/>}
      <div className="flex items-start gap-4 relative">
        <CatBadge catId={goal.category} size={44}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-sora font-semibold text-[16px] text-ink dark:text-white truncate">{goal.name}</h3>
            <Chip tone={onTrackTone === 'copper' ? 'copper' : (onTrackTone === 'rose' ? 'rose' : 'sage')} size="sm" icon={
              goal.completed ? <Icon name="check" size={11}/> : (goal.overdue ? <span className="w-1.5 h-1.5 rounded-full bg-rose pulse-dot"/> : (goal.onTrack ? <Icon name="bolt" size={11}/> : <Icon name="info" size={11}/>))
            }>{onTrackTxt}</Chip>
            {goal.auto?.enabled && !goal.completed && <Chip tone="neutral" size="sm" icon={<Icon name="refresh" size={10}/>}>Auto día {goal.auto.day}</Chip>}
          </div>
          <div className="mt-0.5 text-[12px] text-mutedL dark:text-mutedD font-mono">
            {cat.label}{goal.deadline && !goal.completed ? ' · ' + goal.deadline.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
            {goal.completed && goal.completedAt ? ' · cumplida ' + goal.completedAt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : ''}
          </div>
        </div>
        <Ring pct={goal.pct} size={56} stroke={6} color={accent}/>
      </div>

      {/* Numbers row */}
      <div className="mt-5 grid grid-cols-12 gap-3 items-end">
        <div className="col-span-7">
          <div className="text-[10px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium">Ahorrado</div>
          <div className="font-sora font-bold text-ink dark:text-white leading-none mt-1 num" style={{ fontSize: 30 }}>
            {fmtMoney(goal.current, goal.currency)}
          </div>
          <div className="text-[12px] text-mutedL dark:text-mutedD font-mono mt-1">de {fmtMoney(goal.target, goal.currency)} · faltan {fmtMoney(goal.remaining, goal.currency)}</div>
        </div>
        <div className="col-span-5">
          {variant === 'rich' && (
            <Sparkline data={goal.series} target={goal.target} color={accent} height={56}/>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <Progress pct={goal.pct} tone={tone} height={8}/>
        <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-mutedL dark:text-mutedD">
          <span>{fmtPct(goal.pct)}</span>
          {goal.daysLeft != null && !goal.completed && (
            <span className={goal.overdue ? 'text-rose' : ''}>
              {goal.overdue ? `Vencida hace ${Math.abs(goal.daysLeft)}d` : (goal.daysLeft + ' días restantes')}
            </span>
          )}
          {goal.completed && <span className="text-sage">100%</span>}
        </div>
      </div>

      {/* Footer: monthly target / suggestion + actions */}
      {!goal.completed && (
        <div className="mt-4 pt-4 border-t border-borderL dark:border-borderD flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <div className="text-[10px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium">Aporte mensual</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <div className="font-sora font-semibold text-[15px] text-ink dark:text-white num">{fmtMoney(goal.monthlyTarget, goal.currency)}</div>
              {goal.monthsLeft != null && goal.monthsLeft > 0 && (
                <div className="text-[11px] font-mono text-mutedL dark:text-mutedD">
                  {monthlyDelta >= 0 ? (
                    <>sugerido {fmtMoney(goal.requiredMonthly, goal.currency)}<span className="text-sage"> · suficiente</span></>
                  ) : (
                    <>necesitás {fmtMoney(goal.requiredMonthly, goal.currency)}<span className="text-rose"> · falta {fmtMoney(Math.abs(monthlyDelta), goal.currency)}</span></>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onOpen}>Ver detalle</Button>
            <Button variant="primary" size="sm" icon={<Icon name="plus" size={13}/>} onClick={onDeposit}>Depositar</Button>
          </div>
        </div>
      )}
      {goal.completed && (
        <div className="mt-4 pt-4 border-t border-borderL dark:border-borderD flex items-center gap-3 flex-wrap">
          <div className="flex-1 text-[13px] font-sora text-ink dark:text-white">
            🎉 Lo hiciste. ¿Pasás los fondos a tu cuenta o arrancás otra?
          </div>
          <Button variant="secondary" size="sm" icon={<Icon name="wallet" size={13}/>}>Liquidar</Button>
          <Button variant="copper" size="sm" icon={<Icon name="plus" size={13}/>} onClick={onOpen}>Nueva meta</Button>
        </div>
      )}
    </Card>
  );
}

window.GoalCard = GoalCard;
