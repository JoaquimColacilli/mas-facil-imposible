// Create goal modal (preview-only)

function CreateGoalModal({ onClose }) {
  const { CATS, fmtMoney } = window.GoalsData;
  const [name, setName] = useState('Vacaciones en enero');
  const [category, setCategory] = useState('viaje');
  const [currency, setCurrency] = useState('USD');
  const [target, setTarget] = useState(3000);
  const [deadline, setDeadline] = useState('2027-01-15');
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoAmount, setAutoAmount] = useState(250);

  const eta = autoEnabled && autoAmount > 0 ? Math.ceil(target / autoAmount) : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(10,15,25,.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-charcoal2 border border-borderL dark:border-borderD shadow-deep entry">
        <div className="p-5 border-b border-borderL dark:border-borderD flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-mono">Nueva meta</div>
            <div className="font-sora font-semibold text-[18px] text-ink dark:text-white">¿Para qué estás ahorrando?</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg grid place-items-center hover:bg-mist dark:hover:bg-white/5"><Icon name="x" size={15}/></button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: form */}
          <div className="space-y-4">
            <Field label="Nombre">
              <input value={name} onChange={e => setName(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-borderL dark:border-borderD bg-white dark:bg-charcoal text-[14px] focus:outline-none focus:border-sage"/>
            </Field>

            <Field label="Tipo">
              <div className="flex flex-wrap gap-2">
                {Object.values(CATS).map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)} type="button"
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12px] font-sora font-medium transition ${category === c.id ? 'border-transparent text-white' : 'border-borderL dark:border-borderD text-ink dark:text-white hover:bg-mist dark:hover:bg-white/5'}`}
                    style={category === c.id ? { background: c.color } : {}}>
                    <Icon name={c.icon} size={14}/>
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Field label="Moneda">
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-borderL dark:border-borderD bg-white dark:bg-charcoal text-[14px] font-mono focus:outline-none focus:border-sage">
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Monto objetivo">
                  <input type="number" value={target} onChange={e => setTarget(Number(e.target.value) || 0)} className="w-full h-10 px-3 rounded-xl border border-borderL dark:border-borderD bg-white dark:bg-charcoal text-[14px] font-mono focus:outline-none focus:border-sage"/>
                </Field>
              </div>
            </div>

            <Field label="Fecha límite">
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-borderL dark:border-borderD bg-white dark:bg-charcoal text-[14px] font-mono focus:outline-none focus:border-sage"/>
            </Field>

            <div className="rounded-xl border border-borderL dark:border-borderD p-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={autoEnabled} onChange={e => setAutoEnabled(e.target.checked)} className="w-4 h-4 accent-sage"/>
                <div className="flex-1">
                  <div className="font-sora font-medium text-[13px] text-ink dark:text-white">Ahorro automático</div>
                  <div className="text-[11px] text-mutedL dark:text-mutedD">Apartá un monto fijo cada mes el día 5.</div>
                </div>
              </label>
              {autoEnabled && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[12px] text-mutedL dark:text-mutedD">Monto mensual</span>
                  <input type="number" value={autoAmount} onChange={e => setAutoAmount(Number(e.target.value) || 0)} className="flex-1 h-9 px-3 rounded-lg border border-borderL dark:border-borderD bg-white dark:bg-charcoal text-[13px] font-mono focus:outline-none focus:border-sage"/>
                  <span className="text-[12px] font-mono text-mutedL dark:text-mutedD">{currency}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: live preview */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-mono mb-2">Preview</div>
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <CatBadge catId={category} size={42}/>
                <div className="flex-1 min-w-0">
                  <div className="font-sora font-semibold text-ink dark:text-white truncate">{name || 'Sin título'}</div>
                  <div className="text-[11px] font-mono text-mutedL dark:text-mutedD">{CATS[category].label}{deadline ? ' · ' + new Date(deadline).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) : ''}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium">Objetivo</div>
                <div className="font-sora font-bold text-ink dark:text-white num leading-none mt-1" style={{ fontSize: 32 }}>{fmtMoney(target, currency)}</div>
              </div>
              <div className="mt-3"><Progress pct={0} tone="sage" height={8}/></div>
              {autoEnabled && autoAmount > 0 && (
                <div className="mt-4 rounded-xl bg-sageBg dark:bg-sageBgD p-3 text-[12px] font-sora text-sage dark:text-emerald flex items-center gap-2">
                  <Icon name="sparkles" size={14}/>
                  Llegás en <strong className="font-semibold">{eta} meses</strong> con {fmtMoney(autoAmount, currency)} mensual.
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="p-4 border-t border-borderL dark:border-borderD flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={<Icon name="check" size={14}/>} onClick={onClose}>Crear meta</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-mutedL dark:text-mutedD font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}

window.CreateGoalModal = CreateGoalModal;
