// Sample data + formatters for Tu Mes en MFI

const fmtARS = (n, withSign=false) => {
  const abs = Math.abs(n);
  const s = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(abs);
  const sign = withSign ? (n >= 0 ? '+ ' : '− ') : (n < 0 ? '− ' : '');
  return sign + '$ ' + s;
};
const fmtARSd = (n, withSign=false) => {
  const abs = Math.abs(n);
  const s = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
  const sign = withSign ? (n >= 0 ? '+ ' : '− ') : (n < 0 ? '− ' : '');
  return sign + '$ ' + s;
};
const fmtUSD = (n) => 'U$S ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.abs(n));
const fmtNum = (n) => new Intl.NumberFormat('es-AR').format(n);
const fmtPct = (n, withSign=true) => (withSign ? (n>=0?'+':'') : '') + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n) + '%';

// Personalities
const PERSONALITIES = {
  ahorrista: { id:'ahorrista', label:'EL AHORRISTA',  emoji:'🌱', desc:'Apartaste más del 20% de tus ingresos. Disciplina nivel pro.', micro:'23% ahorrado',     g1:'oklch(0.55 0.13 155)', g2:'oklch(0.48 0.11 230)' },
  inversor:   { id:'inversor',   label:'EL INVERSOR',   emoji:'📈', desc:'Más de la mitad de lo que apartaste fue a trabajar por vos.', micro:'52% a inversiones', g1:'oklch(0.55 0.14 295)', g2:'oklch(0.55 0.10 65)' },
  social:     { id:'social',     label:'EL SOCIAL',     emoji:'🥂', desc:'Salidas, delivery y planes. Viviste el mes — y está bien.',   micro:'31% a social',     g1:'oklch(0.60 0.14 15)',  g2:'oklch(0.60 0.11 65)' },
  equilibrado:{ id:'equilibrado',label:'EL EQUILIBRADO',emoji:'⚖️', desc:'Ni te privaste ni te pasaste. Mantuviste el pulso.',           micro:'balance 50/30/20', g1:'oklch(0.55 0.10 155)', g2:'oklch(0.55 0.13 230)' },
  austero:    { id:'austero',    label:'EL AUSTERO',    emoji:'🗝️', desc:'Gastaste menos que nunca. Pocas salidas, muchos ahorros.',     micro:'−18% en gastos',   g1:'oklch(0.45 0.08 260)', g2:'oklch(0.55 0.10 155)' },
};

// Main dataset — positive balance month (April 2026 is current)
const DATA_POS = {
  month: 'Abril', year: 2026,
  user: { name: 'Lucía Romero', initials: 'LR', mood: '🌤️' },
  totals: { movements: 87, flowARS: 847250, flowUSD: 320 },
  balance: { ars: 125400, usd: 45, income: 485000, expense: 359600, deltaVsPrev: 23 },
  topCategory: {
    name: 'Supermercado', icon: 'ShoppingCart', color: '#ef4444',
    amount: 142300, pctOfExpenses: 40,
    breakdown: [
      { name:'Supermercado', amount:142300, color:'#ef4444' },
      { name:'Delivery',     amount: 58200, color:'#f59e0b' },
      { name:'Transporte',   amount: 41800, color:'#3b82f6' },
    ]
  },
  equivalents: [
    { emoji:'🥩', n: 35,  label:'asados',          ref: 4000 },
    { emoji:'☕', n: 237, label:'cafés',           ref: 600 },
    { emoji:'🎬', n: 15,  label:'entradas de cine', ref: 9500 },
  ],
  peakDay: {
    date: 'Lunes 14 de abril',
    amount: 32500,
    items: [
      { cat:'Supermercado', amount: 18400 },
      { cat:'Delivery',     amount:  8900 },
      { cat:'Transporte',   amount:  5200 },
    ],
    // 30 days of spend, peak on index 13
    daily: [4200,6800,3100,5400,7800,9200,4100,5800,12300,8900,6200,7100,9800,32500,8400,6700,5200,4800,9100,7600,11200,8800,6400,7200,9800,12400,8100,6600,5900,10400],
  },
  savings: { savings: 45000, investment: 42000, deltaVsPrev: 18, yield: 2.3 },
  goal: { name:'Viaje a Bariloche', icon:'Plane', color:'#3b82f6', current: 400000, target: 500000, pct: 80, completedThisMonth: 2 },
  personality: 'ahorrista',
};

// Negative-balance variant
const DATA_NEG = JSON.parse(JSON.stringify(DATA_POS));
DATA_NEG.balance = { ars: -68400, usd: -25, income: 412000, expense: 480400, deltaVsPrev: -14 };
DATA_NEG.savings = { savings: 15000, investment: 8000, deltaVsPrev: -32, yield: -0.8 };
DATA_NEG.personality = 'social';

window.MFI = { fmtARS, fmtARSd, fmtUSD, fmtNum, fmtPct, PERSONALITIES, DATA_POS, DATA_NEG };
