// Sample data for the Comunidad prototype.

const CATEGORIES = [
  { id: 'todo',        label: 'Todo',         icon: 'LayoutGrid' },
  { id: 'inversiones', label: 'Inversiones',  icon: 'TrendingUp', color: 'violet500' },
  { id: 'ahorros',     label: 'Ahorros',      icon: 'PiggyBank',  color: 'sky500' },
  { id: 'dolar',       label: 'Dólar',        icon: 'DollarSign', color: 'emerald500' },
  { id: 'plazosfijos', label: 'Plazos fijos', icon: 'Landmark',   color: 'sky500' },
  { id: 'cripto',      label: 'Cripto',       icon: 'Bitcoin',    color: 'copper' },
  { id: 'gastos',      label: 'Gastos',       icon: 'Receipt',    color: 'rose500' },
  { id: 'metas',       label: 'Metas',        icon: 'Target',     color: 'sage' },
  { id: 'preguntas',   label: 'Preguntas',    icon: 'HelpCircle', color: 'muted' },
];

const BADGES = [
  { id: 'novato',    label: 'Novato',     min: 0,    color: 'muted' },
  { id: 'ahorrista', label: 'Ahorrista',  min: 100,  color: 'sky500' },
  { id: 'inversor',  label: 'Inversor',   min: 500,  color: 'violet500' },
  { id: 'veterano',  label: 'Veterano',   min: 2000, color: 'copper' },
  { id: 'mentor',    label: 'Mentor',     min: 5000, color: 'sage' },
];

function badgeFor(karma) {
  let b = BADGES[0];
  for (const x of BADGES) if (karma >= x.min) b = x;
  return b;
}

const USERS = {
  u1: { id: 'u1', name: 'Lucía Romero',    handle: '@luciar',     karma: 2840, avatarTone: 'sage' },
  u2: { id: 'u2', name: 'Tomás Figueroa',  handle: '@tomifig',    karma: 612,  avatarTone: 'copper' },
  u3: { id: 'u3', name: 'Camila Aguirre',  handle: '@camiag',     karma: 5230, avatarTone: 'violet500' },
  u4: { id: 'u4', name: 'Joaquín Méndez',  handle: '@joacomz',    karma: 184,  avatarTone: 'sky500' },
  u5: { id: 'u5', name: 'Martina Bravo',   handle: '@martib',     karma: 48,   avatarTone: 'rose500' },
  u6: { id: 'u6', name: 'Federico Paz',    handle: '@fedepaz',    karma: 1510, avatarTone: 'emerald500' },
  u7: { id: 'u7', name: 'Sol Benítez',     handle: '@solbz',      karma: 980,  avatarTone: 'sage' },
  me: { id: 'me', name: 'Vos',             handle: '@vos',        karma: 312,  avatarTone: 'copper' },
};

// es-AR number formatters
const fmtARS = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n).replace('ARS', '$').trim();
const fmtUSD = (n) => 'U$S ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
const fmtNum = (n) => new Intl.NumberFormat('es-AR').format(n);

const POSTS = [
  {
    id: 'p1',
    author: 'u1',
    category: 'dolar',
    title: '¿Dólar MEP o CCL esta semana? Comparto mi jugada',
    body: 'Estuve mirando la brecha y el costo operativo para un monto chico. Con comisiones de mi bróker, el MEP me sigue dando más barato bajo los U$S 2.000. Les dejo los números que hice y me cuentan si ven algo raro.\n\nSpread MEP vs CCL: 0,4%. Con fee 0,5% + IVA, MEP gana para volumen chico.',
    image: null,
    votes: 142,
    myVote: 0,
    comments: 34,
    saved: false,
    embed: null,
    ts: '3 h',
  },
  {
    id: 'p2',
    author: 'u3',
    category: 'plazosfijos',
    title: 'Plazo fijo UVA vs tradicional: hice los números',
    body: 'Comparé los dos a 90 días con inflación esperada del REM. UVA +1% gana por cómodo si la inflación no se desploma. Paso la planilla en los comentarios.',
    image: 'chart',
    votes: 221,
    myVote: 1,
    comments: 58,
    saved: true,
    embed: null,
    ts: '6 h',
  },
  {
    id: 'p3',
    author: 'u2',
    category: 'metas',
    title: 'Mi meta: U$S 5.000 ahorrados en 12 meses — voy por el mes 4',
    body: 'Arranqué en enero con U$S 0. Separo 15% de cada sueldo apenas cobro y lo paso a MEP. Vamos bien pero el mes que viene se viene gasto fuerte. Alguien con una meta parecida para bancarnos?',
    image: null,
    votes: 389,
    myVote: 0,
    comments: 72,
    saved: false,
    embed: { kind: 'goal', title: 'U$S 5.000 en 12 meses', current: 1680, target: 5000, currency: 'USD', months: 4, totalMonths: 12 },
    ts: '1 d',
  },
  {
    id: 'p4',
    author: 'u6',
    category: 'inversiones',
    title: '¿Alguien invirtiendo en CEDEARs? Armé esta cartera',
    body: 'Le vengo metiendo fichas hace 8 meses. 40% SPY, 25% QQQ, 15% KO, 10% MELI, 10% GOLD. Rendimiento medido en dólares MEP. No es consejo financiero, obvio.',
    image: 'pie',
    votes: 276,
    myVote: 0,
    comments: 91,
    saved: false,
    embed: null,
    ts: '1 d',
  },
  {
    id: 'p5',
    author: 'u7',
    category: 'cripto',
    title: 'USDT en Argentina: dónde lo tienen ustedes?',
    body: 'Entre exchanges locales, wallets auto-custodia y P2P, me siento medio perdida. Cuál usan y por qué? Me importa más seguridad que rendimiento.',
    image: null,
    votes: 98,
    myVote: 0,
    comments: 47,
    saved: false,
    embed: null,
    ts: '2 d',
  },
  {
    id: 'p6',
    author: 'u4',
    category: 'gastos',
    title: 'Recorté $ 80.000 de gastos fijos este mes',
    body: 'Revisé suscripciones, cambié de prepaga, negocié el plan del celu. Se puede. Acá el movimiento de MFI que lo muestra 👇',
    image: null,
    votes: 512,
    myVote: 1,
    comments: 128,
    saved: true,
    embed: { kind: 'txn', title: 'Ahorro mensual recurrente', amount: 80000, currency: 'ARS', category: 'Gastos fijos', date: '2026-04-01' },
    ts: '2 d',
  },
  {
    id: 'p7',
    author: 'u5',
    category: 'preguntas',
    title: 'Pregunta de novato: qué es el carry trade?',
    body: 'Lo escucho todo el tiempo en Twitter financiero y no termino de entender. Alguien me tira una explicación tipo ELI5? Gracias 🙏',
    image: null,
    votes: 64,
    myVote: 0,
    comments: 29,
    saved: false,
    embed: null,
    ts: '3 d',
  },
];

const COMMENTS = {
  p3: [
    {
      id: 'c1', author: 'u6', ts: '22 h', votes: 48, body: 'Re bien ahí. Yo voy por el mes 7 de una meta parecida y lo que me salvó fue automatizarlo: débito automático el día que cobro, no lo veo nunca más.',
      children: [
        {
          id: 'c1a', author: 'u2', ts: '18 h', votes: 12, body: 'Totalmente. Lo manual te termina comiendo la meta en algún imprevisto. Cómo automatizás el paso a MEP?',
          children: [
            { id: 'c1a1', author: 'u6', ts: '16 h', votes: 9, body: 'Transferencia programada a la cuenta comitente + orden recurrente. En mi bróker se puede.', children: [] }
          ]
        },
        { id: 'c1b', author: 'u1', ts: '14 h', votes: 6, body: 'Consulta: te conviene MEP semanal o mensual por comisiones?', children: [] },
      ]
    },
    {
      id: 'c2', author: 'u3', ts: '20 h', votes: 31, body: 'Si el mes que viene se te complica, ojo con romper la racha. Bajá el % y seguí, no pares del todo. Dato mental importante.',
      children: []
    },
    {
      id: 'c3', author: 'u5', ts: '12 h', votes: 7, body: 'Gracias por compartir, me anima a arrancar la mía 💪', children: []
    },
  ],
};

const TRENDING = [
  { id: 't1', title: 'Bonos duales: ¿vale la pena entrar ahora?', comments: 204, category: 'inversiones' },
  { id: 't2', title: 'Aguinaldo: 5 ideas para no fundirlo', comments: 167, category: 'ahorros' },
  { id: 't3', title: 'Monotributo 2026: cambios y números', comments: 143, category: 'preguntas' },
  { id: 't4', title: 'MEP vs Cripto para ahorrar en dólares', comments: 98, category: 'dolar' },
];

const RULES = [
  'Respeto ante todo — nada de agresiones personales.',
  'No es consejo financiero. Compartí experiencias, no promesas.',
  'Nada de referidos, spam ni promos pagas.',
  'Usá la categoría correcta para que otros te encuentren.',
];

Object.assign(window, { CATEGORIES, BADGES, USERS, POSTS, COMMENTS, TRENDING, RULES, badgeFor, fmtARS, fmtUSD, fmtNum });
