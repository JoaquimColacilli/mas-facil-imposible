// Sample data + formatters for /metas

const fmtUSD = (n) => 'U$S ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n));
const fmtUSDd = (n) => 'U$S ' + new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtARS = (n) => '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n));
const fmtMoney = (n, cur) => cur === 'USD' ? fmtUSD(n) : fmtARS(n);
const fmtPct = (n) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n) + '%';

// Categories
const CATS = {
  viaje:      { id: 'viaje',      label: 'Viaje',      color: '#3b82f6', icon: 'plane' },
  auto:       { id: 'auto',       label: 'Auto',       color: '#a855f7', icon: 'car' },
  casa:       { id: 'casa',       label: 'Casa',       color: '#10b981', icon: 'home' },
  emergencia: { id: 'emergencia', label: 'Emergencia', color: '#ef4444', icon: 'shield' },
  inversion:  { id: 'inversion',  label: 'Inversión',  color: '#f59e0b', icon: 'trending-up' },
  otro:       { id: 'otro',       label: 'Otro',       color: '#64748b', icon: 'target' },
};

// Generate a deposits sparkline series of N points up to a current amount
function genDeposits(target, current, months) {
  const pts = [];
  let cum = 0;
  const monthly = current / months;
  for (let i = 0; i < months; i++) {
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * monthly * 0.25;
    const step = Math.max(monthly * 0.4, monthly + noise);
    cum = Math.min(current, cum + step);
    pts.push(cum);
  }
  // ensure last point == current
  pts[pts.length - 1] = current;
  return pts;
}

const TODAY = new Date(2026, 3, 25); // 25 abr 2026

function daysBetween(a, b) {
  const ms = b - a;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

const ALL_GOALS = [
  {
    id: 'g1', name: 'Bariloche en julio', category: 'viaje', currency: 'USD',
    target: 2400, current: 1800, monthlyTarget: 200, monthsActive: 9,
    deadline: new Date(2026, 6, 15), createdAt: new Date(2025, 6, 10),
    auto: { enabled: true, amount: 200, day: 5 },
    color: '#3b82f6',
    note: 'Avión + cabaña 5 noches + alquiler de equipo de ski.',
  },
  {
    id: 'g2', name: 'Auto 0km', category: 'auto', currency: 'USD',
    target: 18000, current: 6300, monthlyTarget: 700, monthsActive: 14,
    deadline: new Date(2027, 11, 1), createdAt: new Date(2024, 10, 1),
    auto: { enabled: true, amount: 700, day: 5 },
    color: '#a855f7',
  },
  {
    id: 'g3', name: 'Fondo de emergencia', category: 'emergencia', currency: 'USD',
    target: 6000, current: 5400, monthlyTarget: 200, monthsActive: 22,
    deadline: null, createdAt: new Date(2024, 4, 1),
    auto: { enabled: true, amount: 200, day: 5 },
    color: '#ef4444',
    note: '6 meses de gastos esenciales. Casi listo.',
  },
  {
    id: 'g4', name: 'Notebook nueva', category: 'otro', currency: 'ARS',
    target: 2200000, current: 540000, monthlyTarget: 220000, monthsActive: 3,
    deadline: new Date(2026, 9, 1), createdAt: new Date(2026, 0, 15),
    auto: { enabled: false },
    color: '#64748b',
  },
  {
    id: 'g5', name: 'Cuotas iniciales depto', category: 'casa', currency: 'USD',
    target: 25000, current: 8200, monthlyTarget: 850, monthsActive: 9,
    deadline: new Date(2028, 5, 1), createdAt: new Date(2025, 6, 1),
    auto: { enabled: true, amount: 850, day: 10 },
    color: '#10b981',
  },
  {
    id: 'g6', name: 'Curso de UX research', category: 'inversion', currency: 'USD',
    target: 1500, current: 1500, monthlyTarget: 250, monthsActive: 6,
    deadline: new Date(2026, 2, 30), createdAt: new Date(2025, 8, 1),
    auto: { enabled: false },
    color: '#f59e0b',
    completed: true,
    completedAt: new Date(2026, 2, 18),
  },
  {
    id: 'g7', name: 'Bicicleta gravel', category: 'otro', currency: 'USD',
    target: 1800, current: 720, monthlyTarget: 180, monthsActive: 5,
    deadline: new Date(2026, 3, 1), // already past
    createdAt: new Date(2025, 10, 1),
    auto: { enabled: false },
    color: '#64748b',
    overdue: true,
  },
];

// Compute derived fields
function withDerived(g) {
  const pct = Math.min(100, Math.round((g.current / g.target) * 100));
  const remaining = Math.max(0, g.target - g.current);
  const daysLeft = g.deadline ? daysBetween(TODAY, g.deadline) : null;
  const monthsLeft = daysLeft != null ? Math.max(0, Math.round(daysLeft / 30)) : null;
  const requiredMonthly = monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : remaining;
  const series = genDeposits(g.target, g.current, Math.max(g.monthsActive, 4));
  const onTrack = g.monthlyTarget >= requiredMonthly * 0.95;
  return {
    ...g,
    pct, remaining, daysLeft, monthsLeft, requiredMonthly, series, onTrack,
  };
}

const GOALS = ALL_GOALS.map(withDerived);

// Activity feed (deposits)
const ACTIVITY = [
  { id: 'a1', goalId: 'g1', kind: 'deposit', amount: 200, date: new Date(2026, 3, 5), method: 'auto', currency: 'USD' },
  { id: 'a2', goalId: 'g3', kind: 'deposit', amount: 200, date: new Date(2026, 3, 5), method: 'auto', currency: 'USD' },
  { id: 'a3', goalId: 'g5', kind: 'deposit', amount: 850, date: new Date(2026, 3, 10), method: 'auto', currency: 'USD' },
  { id: 'a4', goalId: 'g2', kind: 'deposit', amount: 700, date: new Date(2026, 3, 5), method: 'auto', currency: 'USD' },
  { id: 'a5', goalId: 'g4', kind: 'deposit', amount: 180000, date: new Date(2026, 3, 12), method: 'manual', currency: 'ARS' },
  { id: 'a6', goalId: 'g1', kind: 'milestone', date: new Date(2026, 2, 28), text: '75% alcanzado' },
  { id: 'a7', goalId: 'g6', kind: 'completed', date: new Date(2026, 2, 18), text: 'Meta cumplida' },
  { id: 'a8', goalId: 'g3', kind: 'deposit', amount: 200, date: new Date(2026, 2, 5), method: 'auto', currency: 'USD' },
];

// Tip / nudge content per state
const TIPS = {
  empty: 'Empezá con una meta chica que puedas cumplir en 3 meses. Es la mejor forma de agarrar el ritmo.',
  one: 'Activá el ahorro automático: lo que se va el día 5 no lo extrañás.',
  many: 'Tres metas activas es el sweet spot. Más, y la atención se diluye.',
  overdue: 'Una meta atrasada no es un fracaso. Reajustá la fecha o el monto y seguí.',
};

window.GoalsData = {
  CATS, GOALS, ACTIVITY, TIPS, TODAY,
  fmtUSD, fmtUSDd, fmtARS, fmtMoney, fmtPct,
  daysBetween,
};
