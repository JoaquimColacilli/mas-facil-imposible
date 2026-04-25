'use client'

/**
 * Desktop editorial slides (lg+). Ports design-refs/wrapped-bundle/wrapped.desktop.js
 * into React. Each slide is a 16:9 layout tuned for horizontal reading —
 * split across a 12-col grid with `col-span` deciding the left/right weight.
 *
 * Shared contract with mobile: consumes WrappedData, gradients/blobs driven
 * by PERSONALITIES, formatters reused from lib/wrapped. Behavior differs:
 *   - No auto-advance (user pacing)
 *   - No tap zones, no story-mode progress
 *   - Hero numbers use ScaledHero so --wrapped-hero-scale can shrink them on
 *     short laptops without editing individual clamp() values.
 */

import type { ReactElement } from 'react'
import { Target, TrendingUp } from 'lucide-react'
import type { WrappedData } from '@/lib/wrapped/types'
import { PERSONALITIES } from '@/lib/wrapped/personalities'
import { fmtARS, fmtNum, fmtPct, fmtUSD } from '@/lib/wrapped/formatters'
import { CountUp } from '../count-up'
import {
  DesktopEyebrow,
  DesktopSlideWrap,
  ScaledHero,
} from './desktop-slide-primitives'

interface DesktopSlideProps {
  data: WrappedData
  onShare?: () => void
  onDownloadWrappedPDF?: () => void
  onRestart?: () => void
  loadingAction?: 'share' | 'wrapped-pdf' | null
}

// ─── Slide 1: Portada editorial ──────────────────────────────────────────────

function DSlide1({ data }: DesktopSlideProps) {
  return (
    <DesktopSlideWrap
      colors={['oklch(0.45 0.10 260)', 'oklch(0.55 0.12 220)', 'oklch(0.50 0.10 155)']}
    >
      <div className="col-span-7 flex flex-col justify-between py-4 stagger">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl grid place-items-center bg-white/15 backdrop-blur">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
          </div>
          <div className="font-serif font-semibold tracking-tight">MFI</div>
          <div className="font-mono text-[11px] tracking-widest text-white/60 ml-2">· {data.year}</div>
        </div>
        <div>
          <DesktopEyebrow>Tu mes en MFI</DesktopEyebrow>
          <ScaledHero
            as="h1"
            fontSize="clamp(80px, 11vw, 180px)"
            className="mt-4 leading-[0.88]"
          >
            {data.month}
          </ScaledHero>
          <div className="font-serif text-white/80 mt-4 max-w-[540px] text-[20px] leading-[1.4] pretty">
            Un recorrido por tus {data.totals.movements} movimientos. Hola, {data.user.name.split(' ')[0] || 'vos'}.
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-[2px] w-12 bg-white/50" />
          <div className="font-mono text-[11px] tracking-widest text-white/60 uppercase">
            10 capítulos · pausá cuando quieras
          </div>
        </div>
      </div>
      <div className="col-span-5 relative flex items-center justify-center stagger">
        <div className="absolute inset-0 grid place-items-center opacity-10 pointer-events-none">
          <div
            className="font-serif font-semibold"
            style={{
              fontSize: `calc(var(--wrapped-hero-scale, 1) * 360px)`,
              lineHeight: 1,
            }}
          >{`'${String(data.year).slice(-2)}`}</div>
        </div>
        <div
          className="relative w-[340px] h-[340px] rounded-full grid place-items-center"
          style={{
            background: 'radial-gradient(closest-side, rgba(255,255,255,.18), transparent)',
          }}
        >
          <div
            className="leading-none drop-shadow-lg"
            style={{ fontSize: `calc(var(--wrapped-hero-scale, 1) * 140px)` }}
          >
            {data.user.mood || '🌤️'}
          </div>
        </div>
      </div>
    </DesktopSlideWrap>
  )
}

// ─── Slide 2: Números del mes ────────────────────────────────────────────────

function DSlide2({ data }: DesktopSlideProps) {
  const perDay = Math.max(1, Math.round(data.totals.movements / 30))
  return (
    <DesktopSlideWrap
      colors={['oklch(0.42 0.08 260)', 'oklch(0.48 0.10 220)', 'oklch(0.50 0.10 295)']}
    >
      <div className="col-span-6 flex flex-col justify-center stagger">
        <DesktopEyebrow>Empecemos por los números</DesktopEyebrow>
        <ScaledHero
          fontSize="clamp(140px, 15vw, 240px)"
          className="mt-6 leading-none"
        >
          <CountUp value={data.totals.movements} format={fmtNum} />
        </ScaledHero>
        <div className="font-serif text-[26px] mt-2 text-white/80">movimientos registrados</div>
        <div className="font-serif text-[17px] mt-8 text-white/65 max-w-[460px] pretty">
          {data.month} fue un mes activo. Entre ingresos, gastos y transferencias, pasaste por el banco casi {perDay} {perDay === 1 ? 'vez' : 'veces'} por día.
        </div>
      </div>
      <div className="col-span-6 flex flex-col justify-center gap-5 stagger">
        <div className="rounded-3xl p-8 bg-white/10 border border-white/15 backdrop-blur-sm">
          <div className="font-mono text-[11px] tracking-widest text-white/60 uppercase mb-3">Volumen ARS</div>
          <ScaledHero fontSize="68px" className="leading-none">
            <CountUp value={data.totals.flowARS} format={(v) => fmtARS(v)} />
          </ScaledHero>
        </div>
        <div className="rounded-3xl p-8 bg-white/10 border border-white/15 backdrop-blur-sm">
          <div className="font-mono text-[11px] tracking-widest text-white/60 uppercase mb-3">Volumen USD</div>
          <ScaledHero fontSize="68px" className="leading-none">
            <CountUp value={data.totals.flowUSD} format={fmtUSD} />
          </ScaledHero>
        </div>
      </div>
    </DesktopSlideWrap>
  )
}

// ─── Slide 3: Balance ────────────────────────────────────────────────────────

function DSlide3({ data }: DesktopSlideProps) {
  const bal = data.balance
  const pos = bal.ars >= 0
  const colors: [string, string, string] = pos
    ? ['oklch(0.40 0.11 155)', 'oklch(0.50 0.12 180)', 'oklch(0.48 0.10 220)']
    : ['oklch(0.45 0.12 25)', 'oklch(0.40 0.10 280)', 'oklch(0.42 0.10 260)']
  const max = Math.max(bal.income, bal.expense, 1)

  return (
    <DesktopSlideWrap colors={colors}>
      <div className="col-span-6 flex flex-col justify-center stagger">
        <DesktopEyebrow>{pos ? 'Terminaste el mes con' : 'Cerraste el mes con'}</DesktopEyebrow>
        <ScaledHero
          fontSize="clamp(100px, 12vw, 200px)"
          className="mt-6 leading-[0.88]"
          color={pos ? 'oklch(0.92 0.15 140)' : 'oklch(0.88 0.15 30)'}
        >
          <CountUp value={bal.ars} format={(v) => fmtARS(v, true)} />
        </ScaledHero>
        <div className="font-serif text-[22px] mt-2 text-white/80">
          <span>{pos ? 'a favor · ' : 'en rojo · '}</span>
          <span className="font-mono">{fmtUSD(bal.usd)}</span>
        </div>
        <div className="font-serif text-[17px] mt-8 text-white/70 max-w-[500px] pretty">
          {pos
            ? 'Ingresaste más de lo que gastaste. El mes que viene, intentá aumentar el margen un poco más.'
            : 'Gastaste más de lo que ingresó. No es el fin del mundo — pero el mes que viene, apretá un poquito.'}
        </div>
      </div>
      <div className="col-span-6 flex flex-col justify-center gap-6 stagger">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="font-mono text-[12px] tracking-widest uppercase text-white/60">Ingresos</div>
            <div className="font-serif font-semibold" style={{ fontSize: 28 }}>
              {fmtARS(bal.income)}
            </div>
          </div>
          <div className="h-6 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(bal.income / max) * 100}%`,
                background: 'linear-gradient(90deg, oklch(0.75 0.14 155), oklch(0.80 0.12 180))',
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="font-mono text-[12px] tracking-widest uppercase text-white/60">Gastos</div>
            <div className="font-serif font-semibold" style={{ fontSize: 28 }}>
              {fmtARS(bal.expense)}
            </div>
          </div>
          <div className="h-6 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(bal.expense / max) * 100}%`,
                background: 'linear-gradient(90deg, oklch(0.72 0.15 25), oklch(0.78 0.14 55))',
              }}
            />
          </div>
        </div>
        {bal.deltaVsPrev !== 0 && (
          <div className="rounded-2xl p-5 bg-white/10 border border-white/15 backdrop-blur-sm flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl grid place-items-center text-[20px]"
              style={{
                background: pos
                  ? 'oklch(0.5 0.12 155 / 0.4)'
                  : 'oklch(0.5 0.15 25 / 0.4)',
              }}
            >
              {bal.deltaVsPrev >= 0 ? '↗' : '↘'}
            </div>
            <div>
              <div className="font-mono text-[11px] tracking-widest uppercase text-white/60">vs mes anterior</div>
              <div className="font-serif font-semibold text-[22px]">{fmtPct(bal.deltaVsPrev)}</div>
            </div>
          </div>
        )}
      </div>
    </DesktopSlideWrap>
  )
}

// ─── Slide 4: Top categoría con donut gigante ────────────────────────────────

function DSlide4({ data }: DesktopSlideProps) {
  const tc = data.topCategory
  if (!tc) {
    return (
      <SlideFallback
        colors={['oklch(0.40 0.10 25)', 'oklch(0.45 0.12 55)', 'oklch(0.48 0.11 90)']}
        data={data}
        message="No registraste gastos este mes."
      />
    )
  }

  const total = tc.breakdown.reduce((a, b) => a + b.amount, 0) || 1
  const size = 440
  const r = 170
  const cx = size / 2
  const cy = size / 2
  const stroke = 44
  let offset = -Math.PI / 2
  const arcs = tc.breakdown.map((b, i) => {
    const angle = (b.amount / total) * Math.PI * 2
    const x1 = cx + r * Math.cos(offset)
    const y1 = cy + r * Math.sin(offset)
    const x2 = cx + r * Math.cos(offset + angle)
    const y2 = cy + r * Math.sin(offset + angle)
    const large = angle > Math.PI ? 1 : 0
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
    offset += angle
    return (
      <path
        key={`${b.name}-${i}`}
        d={d}
        fill="none"
        stroke={b.color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    )
  })

  return (
    <DesktopSlideWrap
      colors={['oklch(0.40 0.10 25)', 'oklch(0.45 0.12 55)', 'oklch(0.48 0.11 90)']}
    >
      <div className="col-span-6 flex flex-col justify-center stagger">
        <DesktopEyebrow>Donde más gastaste</DesktopEyebrow>
        <ScaledHero fontSize="clamp(90px, 10vw, 160px)" className="mt-6 leading-[0.92]">
          {tc.name}
        </ScaledHero>
        <ScaledHero fontSize="48px" className="mt-4 leading-none">
          <CountUp value={tc.amount} format={(v) => fmtARS(v)} />
        </ScaledHero>
        <div className="font-serif text-[20px] mt-2 text-white/75">
          {tc.pctOfExpenses}% de tus gastos del mes
        </div>
        <div className="font-serif text-[16px] mt-8 text-white/65 max-w-[460px] pretty">
          De todas las categorías donde dejaste plata, esta se llevó la parte más grande.
        </div>
      </div>
      <div className="col-span-6 relative flex items-center justify-center stagger">
        <div className="relative">
          <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
            {arcs}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-mono text-[10px] tracking-widest uppercase text-white/60">Total gastos</div>
              <ScaledHero fontSize="44px" className="leading-none">
                <CountUp value={total} format={(v) => fmtARS(v)} />
              </ScaledHero>
            </div>
          </div>
        </div>
        <div className="ml-8 flex flex-col gap-4">
          {tc.breakdown.map((b) => (
            <div key={b.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm" style={{ background: b.color }} />
              <div>
                <div className="font-serif font-medium text-[18px]">{b.name}</div>
                <div className="font-mono text-[13px] text-white/60">{fmtARS(b.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DesktopSlideWrap>
  )
}

// ─── Slide 5: Equivalencias ──────────────────────────────────────────────────

function DSlide5({ data }: DesktopSlideProps) {
  const eq = data.equivalents
  if (!data.topCategory || eq.length === 0) {
    return (
      <SlideFallback
        colors={['oklch(0.45 0.10 55)', 'oklch(0.48 0.10 30)', 'oklch(0.50 0.10 85)']}
        data={data}
        message="Faltaron datos para hacer comparaciones este mes."
      />
    )
  }
  const hero = eq[0]
  const rest = eq.slice(1)
  return (
    <DesktopSlideWrap
      colors={['oklch(0.45 0.10 55)', 'oklch(0.48 0.10 30)', 'oklch(0.50 0.10 85)']}
    >
      <div className="col-span-6 flex flex-col justify-center stagger">
        <DesktopEyebrow>Con ese gasto podías comprar</DesktopEyebrow>
        <ScaledHero
          fontSize="clamp(120px, 14vw, 220px)"
          className="mt-6 leading-[0.88]"
        >
          <CountUp value={hero.n} format={fmtNum} />
        </ScaledHero>
        <div className="font-serif text-[40px] mt-2 text-white/85">{hero.label}</div>
        <div className="font-serif text-[16px] mt-8 text-white/60 max-w-[460px] pretty">
          A precio promedio de {fmtARS(hero.ref)} por unidad.
        </div>
      </div>
      <div className="col-span-6 relative flex items-center justify-center stagger">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(closest-side, rgba(255,255,255,.2), transparent)',
              filter: 'blur(30px)',
            }}
          />
          <div
            className="relative leading-none drop-shadow-2xl"
            style={{ fontSize: `calc(var(--wrapped-hero-scale, 1) * 280px)` }}
          >
            {hero.emoji}
          </div>
        </div>
        {rest.length > 0 && (
          <div className="absolute bottom-10 right-10 flex flex-col gap-3 items-end">
            {rest.map((e, i) => (
              <div
                key={`${e.label}-${i}`}
                className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm"
              >
                <div className="text-[28px] leading-none">{e.emoji}</div>
                <div className="font-serif font-semibold text-[20px]">
                  {fmtNum(e.n)} {e.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DesktopSlideWrap>
  )
}

// ─── Slide 6: Día pico con sparkline ─────────────────────────────────────────

function DSlide6({ data }: DesktopSlideProps) {
  const pd = data.peakDay
  if (!pd) {
    return (
      <SlideFallback
        colors={['oklch(0.38 0.10 280)', 'oklch(0.45 0.12 240)', 'oklch(0.42 0.10 200)']}
        data={data}
        message="Sin gastos diarios que destacar este mes."
      />
    )
  }
  const daily = pd.daily
  const mx = Math.max(...daily, 1)
  const w = 640
  const h = 340
  const pad = 20
  const pts = daily.map((v, i) => {
    const x = pad + (daily.length > 1 ? (i / (daily.length - 1)) * (w - pad * 2) : w / 2)
    const y = h - pad - (v / mx) * (h - pad * 2)
    return [x, y] as const
  })
  const peakIdx = daily.indexOf(mx)
  const [px, py] = pts[peakIdx] ?? [w / 2, h / 2]
  const pathD = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')
  const areaD =
    pathD +
    ` L ${pts[pts.length - 1][0].toFixed(1)} ${h - pad} L ${pts[0][0].toFixed(1)} ${h - pad} Z`

  return (
    <DesktopSlideWrap
      colors={['oklch(0.38 0.10 280)', 'oklch(0.45 0.12 240)', 'oklch(0.42 0.10 200)']}
    >
      <div className="col-span-5 flex flex-col justify-center stagger">
        <DesktopEyebrow>Tu día más caro</DesktopEyebrow>
        <ScaledHero fontSize="clamp(60px, 6.5vw, 100px)" className="mt-6 leading-[0.92]">
          {pd.date}
        </ScaledHero>
        <ScaledHero
          fontSize="68px"
          className="mt-4 leading-none"
          color="oklch(0.82 0.15 25)"
        >
          <CountUp value={pd.amount} format={(v) => fmtARS(v)} />
        </ScaledHero>
        {pd.items.length > 0 && (
          <div className="mt-8 flex flex-col gap-2">
            {pd.items.map((it) => (
              <div
                key={it.cat}
                className="flex items-center justify-between py-2 border-b border-white/10"
              >
                <div className="font-serif text-[15px] text-white/80">{it.cat}</div>
                <div className="font-mono text-[14px]">{fmtARS(it.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="col-span-7 flex flex-col justify-center stagger">
        <div className="font-mono text-[11px] tracking-widest uppercase text-white/55 mb-4">
          Gasto diario · {data.month.toLowerCase()} {data.year}
        </div>
        <div
          className="rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-sm"
          style={{ height: 340 }}
        >
          <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <linearGradient id="d-spkGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="oklch(0.82 0.15 25)" stopOpacity={0.5} />
                <stop offset="1" stopColor="oklch(0.82 0.15 25)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#d-spkGrad)" />
            <path
              d={pathD}
              fill="none"
              stroke="oklch(0.85 0.15 25)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={px} cy={py} r={16} fill="oklch(0.85 0.15 25 / 0.25)" />
            <circle cx={px} cy={py} r={8} fill="oklch(0.90 0.12 25)" stroke="white" strokeWidth={2} />
          </svg>
        </div>
        <div className="flex items-center justify-between mt-4 font-mono text-[11px] text-white/50">
          <span>día 1</span>
          <span>día {daily.length}</span>
        </div>
      </div>
    </DesktopSlideWrap>
  )
}

// ─── Slide 7: Ahorro + Inversión ─────────────────────────────────────────────

function DSlide7({ data }: DesktopSlideProps) {
  const sv = data.savings
  const savingsAddedARS = sv.savings ?? 0
  const savingsAddedUSD = sv.savingsUSD ?? 0
  const savingsBalARS = sv.savingsBalanceARS ?? savingsAddedARS
  const savingsBalUSD = sv.savingsBalanceUSD ?? savingsAddedUSD
  const investBalARS = sv.investmentBalanceARS ?? 0
  const investBalUSD = sv.investmentBalanceUSD ?? 0
  const investGainARS = sv.investmentGainARS ?? 0
  const investGainUSD = sv.investmentGainUSD ?? 0
  const hasSavings = savingsBalARS > 0 || savingsBalUSD > 0
  const hasInvestment = investBalARS > 0 || investBalUSD > 0
  const totalGain = investGainARS + investGainUSD
  const nudge = pickDesktopSavingsNudge(hasSavings, hasInvestment, totalGain)

  return (
    <DesktopSlideWrap
      colors={['oklch(0.40 0.11 155)', 'oklch(0.45 0.12 180)', 'oklch(0.48 0.10 220)']}
    >
      <div className="col-span-5 flex flex-col justify-center stagger">
        <DesktopEyebrow>Apartaste para vos</DesktopEyebrow>
        <ScaledHero
          as="h2"
          fontSize="clamp(56px, 6.5vw, 100px)"
          className="mt-4 leading-[0.92]"
        >
          Ahorro<br />& Inversión
        </ScaledHero>
        <div className="font-serif text-[18px] mt-6 text-white/75 max-w-[420px] pretty">
          {nudge}
        </div>
        {sv.deltaVsPrev !== 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px]"
              style={{
                background:
                  sv.deltaVsPrev >= 0 ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.22)',
                border: `1px solid ${sv.deltaVsPrev >= 0 ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)'}`,
              }}
            >
              <span className="font-serif font-semibold text-white">
                {fmtPct(sv.deltaVsPrev)}
              </span>
              <span className="text-white/85">vs mes anterior en ahorro</span>
            </span>
          </div>
        )}
      </div>
      <div className="col-span-7 flex flex-col justify-center gap-4 stagger">
        <DesktopAhorroCard
          balanceARS={savingsBalARS}
          balanceUSD={savingsBalUSD}
          addedARS={savingsAddedARS}
          addedUSD={savingsAddedUSD}
        />
        <DesktopInversionCard
          balanceARS={investBalARS}
          balanceUSD={investBalUSD}
          gainARS={investGainARS}
          gainUSD={investGainUSD}
          series={sv.investmentSeries}
        />
      </div>
    </DesktopSlideWrap>
  )
}

function pickDesktopSavingsNudge(
  hasSavings: boolean,
  hasInvestment: boolean,
  gain: number,
): string {
  if (!hasSavings && !hasInvestment) {
    return 'Arrancar es la parte más difícil. El mes que viene lo empezás.'
  }
  if (hasInvestment && gain > 0) {
    return 'Tu plata trabajó este mes. Vos también, pero menos cansado.'
  }
  if (hasInvestment && gain < 0) {
    return 'Mes rojo pasa. Lo que importa es que seguís adentro.'
  }
  if (hasSavings && !hasInvestment) {
    return 'Guardaste algo. Aunque sea poco, ya te ponés por encima de la mayoría.'
  }
  return 'Dos frentes abiertos este mes: efectivo y plata trabajando. Bien ahí.'
}

/**
 * Desktop AHORRO card. Hero = balance total histórico (lo que realmente
 * tenés guardado al cierre del mes), chip = lo que sumaste este mes.
 */
function DesktopAhorroCard({
  balanceARS,
  balanceUSD,
  addedARS,
  addedUSD,
}: {
  balanceARS: number
  balanceUSD: number
  addedARS: number
  addedUSD: number
}) {
  const hasAny = balanceARS > 0 || balanceUSD > 0
  const addedThisMonth = addedARS !== 0 || addedUSD !== 0
  return (
    <div
      className="rounded-3xl p-6"
      style={{
        background: 'rgba(132, 204, 172, 0.14)',
        border: '1px solid rgba(132, 204, 172, 0.32)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-white/85 text-[12px] uppercase tracking-[0.2em] font-medium">
          <span className="text-xl leading-none">🏦</span>
          <span>Ahorro · balance total</span>
        </div>
        {addedThisMonth && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-mono"
            style={{
              background: 'rgba(16,185,129,.24)',
              color: '#a7f3d0',
            }}
          >
            ↑ +{addedUSD > 0 ? fmtUSD(addedUSD) : fmtARS(addedARS)} este mes
          </span>
        )}
      </div>
      {!hasAny ? (
        <div className="mt-3 text-white/70 text-[16px]">
          Todavía no guardaste nada. Arrancar por poco ya es arrancar.
        </div>
      ) : (
        <div className="mt-3 flex items-baseline gap-6 flex-wrap">
          {balanceARS > 0 && (
            <CountUp
              value={balanceARS}
              format={(v) => fmtARS(v)}
              className="font-serif font-semibold text-white leading-none"
              style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}
            />
          )}
          {balanceUSD > 0 && (
            <CountUp
              value={balanceUSD}
              format={fmtUSD}
              className="font-serif font-semibold text-white leading-none"
              style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}
            />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Desktop INVERSIÓN card. Hero = balance total al fin de mes (como en
 * /investments). Chip = ganancia/pérdida absoluta del mes. Chart abajo.
 * Altura de chart limitada para que no se estire si la card crece.
 */
function DesktopInversionCard({
  balanceARS,
  balanceUSD,
  gainARS,
  gainUSD,
  series,
}: {
  balanceARS: number
  balanceUSD: number
  gainARS: number
  gainUSD: number
  series: import('@/lib/wrapped/types').WrappedInvestmentSeries | null
}) {
  const hasAny = balanceARS > 0 || balanceUSD > 0
  const heroIsUSD = series ? series.currency === 'USD' : balanceUSD >= balanceARS
  const balance = heroIsUSD ? balanceUSD : balanceARS
  const gain = heroIsUSD ? gainUSD : gainARS
  const heroFmt = heroIsUSD ? fmtUSD : (v: number) => fmtARS(v)
  const secondary =
    heroIsUSD && balanceARS > 0
      ? fmtARS(balanceARS)
      : !heroIsUSD && balanceUSD > 0
        ? fmtUSD(balanceUSD)
        : null
  const gainLabel = gain !== 0 ? heroFmt(Math.abs(gain)) : null

  return (
    <div
      className="rounded-3xl p-6 flex flex-col"
      style={{
        background: 'rgba(132, 168, 232, 0.14)',
        border: '1px solid rgba(132, 168, 232, 0.32)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-white/85 text-[12px] uppercase tracking-[0.2em] font-medium">
          <span className="text-xl leading-none">📈</span>
          <span>Inversión · balance total</span>
        </div>
        {gainLabel && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-mono"
            style={{
              background: gain >= 0 ? 'rgba(16,185,129,.24)' : 'rgba(239,68,68,.24)',
              color: gain >= 0 ? '#a7f3d0' : '#fecaca',
            }}
          >
            {gain >= 0 ? '↑' : '↓'} {gain >= 0 ? '+' : '−'}
            {gainLabel} este mes
          </span>
        )}
      </div>
      {!hasAny ? (
        <div className="mt-3 text-white/70 text-[16px]">
          Todavía no tenés portfolios activos.
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-6 flex-wrap">
            <CountUp
              value={balance}
              format={heroFmt}
              className="font-serif font-semibold text-white leading-none"
              style={{ fontSize: 'clamp(36px, 4.4vw, 62px)' }}
            />
            {secondary && (
              <div className="font-mono text-white/80 text-[17px]">+ {secondary}</div>
            )}
          </div>
          {series && series.points.length >= 2 && (
            <div className="mt-4 h-[150px]">
              <DesktopInvestmentLineChart series={series} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DesktopInvestmentLineChart({
  series,
}: {
  series: import('@/lib/wrapped/types').WrappedInvestmentSeries
}) {
  const pts = series.points
  if (pts.length < 2) return null
  const days = pts.map((p) => p.day)
  const values = pts.map((p) => p.balance)
  const minDay = Math.min(...days)
  const maxDay = Math.max(...days)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const pad = (maxV - minV) * 0.12 || maxV * 0.05 || 1
  const yMin = minV - pad
  const yMax = maxV + pad

  const W = 640
  const H = 180
  const PAD_X = 10
  const PAD_Y = 12

  const x = (d: number) =>
    PAD_X + ((d - minDay) / Math.max(1, maxDay - minDay)) * (W - PAD_X * 2)
  const y = (v: number) =>
    H - PAD_Y - ((v - yMin) / Math.max(1e-9, yMax - yMin)) * (H - PAD_Y * 2)

  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.day).toFixed(1)} ${y(p.balance).toFixed(1)}`)
    .join(' ')
  const areaPath =
    path +
    ` L ${x(pts[pts.length - 1].day).toFixed(1)} ${H - PAD_Y} L ${x(pts[0].day).toFixed(1)} ${H - PAD_Y} Z`

  const up = pts[pts.length - 1].balance >= pts[0].balance
  const lineColor = up ? 'oklch(0.88 0.14 155)' : 'oklch(0.80 0.15 25)'
  const areaTop = up ? 'oklch(0.88 0.14 155 / 0.45)' : 'oklch(0.80 0.15 25 / 0.45)'

  // Peak + valley — stock chart bread and butter.
  let peakIdx = 0
  let valleyIdx = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[peakIdx]) peakIdx = i
    if (values[i] < values[valleyIdx]) valleyIdx = i
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mfi-dinv-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={areaTop} />
          <stop offset="1" stopColor={areaTop} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* subtle gridlines — only top + bottom for visual anchor */}
      <line x1={0} y1={PAD_Y} x2={W} y2={PAD_Y} stroke="rgba(255,255,255,.08)" strokeWidth={1} />
      <line
        x1={0}
        y1={H - PAD_Y}
        x2={W}
        y2={H - PAD_Y}
        stroke="rgba(255,255,255,.08)"
        strokeWidth={1}
      />
      <path d={areaPath} fill="url(#mfi-dinv-area)" />
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* start */}
      <circle cx={x(pts[0].day)} cy={y(pts[0].balance)} r={3.5} fill="rgba(255,255,255,.85)" />
      {/* peak + valley if distinct from endpoints */}
      {peakIdx !== 0 && peakIdx !== pts.length - 1 && (
        <circle
          cx={x(pts[peakIdx].day)}
          cy={y(pts[peakIdx].balance)}
          r={3}
          fill={lineColor}
          opacity={0.8}
        />
      )}
      {valleyIdx !== 0 && valleyIdx !== pts.length - 1 && (
        <circle
          cx={x(pts[valleyIdx].day)}
          cy={y(pts[valleyIdx].balance)}
          r={3}
          fill="rgba(255,255,255,.5)"
        />
      )}
      {/* end */}
      <circle
        cx={x(pts[pts.length - 1].day)}
        cy={y(pts[pts.length - 1].balance)}
        r={9}
        fill={lineColor}
        opacity="0.3"
      />
      <circle
        cx={x(pts[pts.length - 1].day)}
        cy={y(pts[pts.length - 1].balance)}
        r={5}
        fill={lineColor}
        stroke="white"
        strokeWidth={1.8}
      />
    </svg>
  )
}

// ─── Slide 8: Metas ──────────────────────────────────────────────────────────

function DSlide8({ data }: DesktopSlideProps) {
  const g = data.goal
  if (!g) {
    return (
      <SlideFallback
        colors={['oklch(0.40 0.10 230)', 'oklch(0.45 0.11 260)', 'oklch(0.48 0.10 195)']}
        data={data}
        message="Todavía no tenés metas activas. Creá una y seguila acá."
      />
    )
  }
  const size = 360
  const r = 155
  const cx = size / 2
  const cy = size / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, g.pct))
  const nudge = pickGoalNudge(pct, g.completedThisMonth)
  return (
    <DesktopSlideWrap
      colors={['oklch(0.40 0.10 230)', 'oklch(0.45 0.11 260)', 'oklch(0.48 0.10 195)']}
    >
      <div className="col-span-6 flex flex-col justify-center stagger">
        <DesktopEyebrow>Avanzaste en tu meta</DesktopEyebrow>
        <ScaledHero fontSize="clamp(80px, 9vw, 140px)" className="mt-6 leading-[0.92]">
          {g.name}
        </ScaledHero>
        <div className="flex items-baseline gap-3 mt-6">
          <ScaledHero
            fontSize="110px"
            className="leading-none"
            color="oklch(0.88 0.14 230)"
          >
            <CountUp value={pct} format={(v) => `${fmtNum(v)}%`} />
          </ScaledHero>
          <div className="font-serif text-[18px] text-white/70">completado</div>
        </div>
        <div className="font-mono text-[14px] text-white/60 mt-4">
          {fmtARS(g.current)} de {fmtARS(g.target)}
        </div>
        <div className="font-serif text-[18px] text-white/80 mt-5 max-w-[420px] pretty">
          {nudge}
        </div>
      </div>
      <div className="col-span-6 relative flex items-center justify-center stagger">
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            viewBox={`0 0 ${size} ${size}`}
            width={size}
            height={size}
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={18} />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="oklch(0.80 0.14 230)"
              strokeWidth={18}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c - (c * pct) / 100}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center flex flex-col items-center gap-3">
              {/* Hardcoded Target icon — g.icon is a Lucide icon name string
                  (e.g. "Target", "Plane"), not an emoji. Rendering it as text
                  was showing literal "target". */}
              <div
                className="grid place-items-center rounded-full w-[88px] h-[88px]"
                style={{
                  background: 'rgba(255,255,255,.12)',
                  border: '1px solid rgba(255,255,255,.22)',
                }}
              >
                <Target
                  className="w-10 h-10 text-white"
                  strokeWidth={1.6}
                  style={{ color: 'oklch(0.90 0.12 230)' }}
                />
              </div>
              {g.completedThisMonth > 0 && (
                <div className="font-mono text-[11px] tracking-widest uppercase text-white/60">
                  {g.completedThisMonth} completadas
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DesktopSlideWrap>
  )
}

function pickGoalNudge(pct: number, completed: number): string {
  if (completed > 0) return `¡Completaste ${completed} meta${completed > 1 ? 's' : ''}! Nivel: crack.`
  if (pct >= 90) return 'A un paso. Empujá un poquito más.'
  if (pct >= 50) return 'Pasaste la mitad — ya está cuesta abajo.'
  if (pct >= 25) return 'De a poquito se llega. Vas bien.'
  return 'El primer peso es el más pesado. Lo estás juntando.'
}

// ─── Slide 9: Personalidad ───────────────────────────────────────────────────

function DSlide9({ data }: DesktopSlideProps) {
  const p = PERSONALITIES[data.personality]
  return (
    <DesktopSlideWrap colors={[p.g1, p.g2, p.g1]}>
      <div className="col-span-7 flex flex-col justify-center stagger">
        <DesktopEyebrow>Tu personalidad financiera</DesktopEyebrow>
        <ScaledHero fontSize="clamp(80px, 10vw, 170px)" className="mt-6 leading-[0.88]">
          {p.label}
        </ScaledHero>
        <div className="font-serif text-[22px] mt-6 text-white/85 max-w-[560px] pretty">
          {p.desc}
        </div>
        {p.micro && (
          <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm w-max">
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="font-mono text-[13px] tracking-wider">{p.micro}</div>
          </div>
        )}
      </div>
      <div className="col-span-5 relative flex items-center justify-center stagger">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(closest-side, rgba(255,255,255,.25), transparent)',
              filter: 'blur(40px)',
            }}
          />
          <div
            className="relative leading-none drop-shadow-2xl"
            style={{ fontSize: `calc(var(--wrapped-hero-scale, 1) * 320px)` }}
          >
            {p.emoji}
          </div>
        </div>
      </div>
    </DesktopSlideWrap>
  )
}

// ─── Slide 10: Compartir ─────────────────────────────────────────────────────

function DSlide10({ data, onShare, onDownloadWrappedPDF, onRestart, loadingAction }: DesktopSlideProps) {
  const p = PERSONALITIES[data.personality]
  const cardW = 300
  const cardH = 533
  return (
    <DesktopSlideWrap
      colors={['oklch(0.42 0.10 260)', 'oklch(0.48 0.11 220)', 'oklch(0.45 0.10 295)']}
    >
      <div className="col-span-7 flex flex-col justify-center stagger">
        <DesktopEyebrow>Tu {data.month.toLowerCase()} en MFI · terminado</DesktopEyebrow>
        <ScaledHero
          as="h2"
          fontSize="clamp(72px, 8vw, 130px)"
          className="mt-6 leading-[0.92]"
        >
          ¿Lo compartís?
        </ScaledHero>
        <div className="font-serif text-[20px] mt-6 text-white/80 max-w-[540px] pretty">
          Publicalo en Comunidad para comparar con otros, o descargalo como imagen para redes.
        </div>
        <div className="mt-10 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onShare?.()
            }}
            disabled={loadingAction === 'share'}
            className="inline-flex items-center gap-2 h-14 px-7 rounded-full text-white font-serif font-semibold text-[16px] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60"
            style={{
              background: 'linear-gradient(92deg, oklch(0.50 0.10 155) 0%, oklch(0.60 0.10 65) 100%)',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,.4)',
            }}
          >
            {loadingAction === 'share' ? (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            )}
            <span>Publicar en Comunidad</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDownloadWrappedPDF?.()
            }}
            disabled={loadingAction === 'wrapped-pdf'}
            className="inline-flex items-center gap-2 h-14 px-6 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 font-serif font-semibold text-[15px] text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60"
          >
            {loadingAction === 'wrapped-pdf' ? (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            <span>{loadingAction === 'wrapped-pdf' ? 'Generando PDF…' : 'Descargar Wrapped en PDF'}</span>
          </button>
        </div>
        {onRestart && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRestart()
            }}
            className="mt-5 inline-flex items-center gap-2 text-white/80 hover:text-white font-serif text-[14px] w-max transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-full px-1"
          >
            <span aria-hidden>↺</span>
            <span>Volver a ver tu {data.month.toLowerCase()} en MFI</span>
          </button>
        )}
      </div>
      <div className="col-span-5 relative flex items-center justify-center stagger">
        <div
          className="absolute top-[18%] opacity-60 scale-90 rotate-[-6deg]"
          style={{ filter: 'blur(1px)', left: 'calc(50% - 190px)' }}
        >
          <div
            className="rounded-3xl"
            style={{
              width: cardW,
              height: cardH,
              background: `linear-gradient(145deg, ${p.g2}, ${p.g1})`,
              boxShadow: '0 30px 60px -20px rgba(0,0,0,.5)',
            }}
          />
        </div>
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl"
          style={{
            width: cardW,
            height: cardH,
            background: `linear-gradient(145deg, ${p.g1} 0%, ${p.g2} 100%)`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 20%, ${p.g1}, transparent 60%), radial-gradient(ellipse at 70% 80%, ${p.g2}, transparent 60%)`,
            }}
          />
          <div className="relative h-full flex flex-col justify-between p-6 text-white">
            <div>
              <div className="font-mono text-[10px] tracking-widest uppercase text-white/70">
                Tu {data.month.toLowerCase()} en MFI
              </div>
              <div className="font-serif font-semibold text-[28px] leading-tight mt-2">
                {data.user.name}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[100px] leading-none">{p.emoji}</div>
              <div className="font-serif font-semibold text-[30px] mt-3 leading-tight">
                {p.label}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] tracking-widest uppercase text-white/60">
                  Balance
                </div>
                <div className="font-serif font-semibold text-[18px]">
                  {fmtARS(data.balance.ars, true)}
                </div>
              </div>
              <div className="font-mono text-[10px] text-white/50">mfi.app</div>
            </div>
          </div>
        </div>
      </div>
    </DesktopSlideWrap>
  )
}

// ─── Fallback ────────────────────────────────────────────────────────────────

function SlideFallback({
  colors,
  data,
  message,
}: {
  colors: [string, string, string?]
  data: WrappedData
  message: string
}) {
  return (
    <DesktopSlideWrap colors={colors}>
      <div className="col-span-12 flex flex-col items-center justify-center text-center gap-4 px-10">
        <DesktopEyebrow>
          {data.month} · {data.year}
        </DesktopEyebrow>
        <ScaledHero
          fontSize="clamp(40px, 5vw, 72px)"
          className="leading-[1.1] max-w-[720px]"
        >
          {message}
        </ScaledHero>
      </div>
    </DesktopSlideWrap>
  )
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const DESKTOP_SLIDE_COMPONENTS: Array<(p: DesktopSlideProps) => ReactElement> = [
  DSlide1,
  DSlide2,
  DSlide3,
  DSlide4,
  DSlide5,
  DSlide6,
  DSlide7,
  DSlide8,
  DSlide9,
  DSlide10,
]

export const DESKTOP_SLIDE_TITLES = [
  'Portada',
  'Números',
  'Balance',
  'Top categoría',
  'Equivalencias',
  'Día pico',
  'Ahorro',
  'Metas',
  'Personalidad',
  'Compartir',
]

/**
 * Rail uses these as the thumbnail color chip — matches the gradient start
 * of each slide. Slide 3 chooses a color based on balance sign; Slide 9 and
 * Slide 10 pull from the personality palette, both resolved at render time
 * inside WrappedDesktop. Values below are the static, non-personalized
 * defaults.
 */
export const DESKTOP_SLIDE_RAIL_COLORS = [
  'oklch(0.45 0.10 260)', // 1 portada
  'oklch(0.42 0.08 260)', // 2 numeros
  'oklch(0.40 0.11 155)', // 3 balance (positive default)
  'oklch(0.40 0.10 25)',  // 4 top cat
  'oklch(0.45 0.10 55)',  // 5 equivalencias
  'oklch(0.38 0.10 280)', // 6 peak day
  'oklch(0.40 0.11 155)', // 7 ahorro
  'oklch(0.40 0.10 230)', // 8 metas
  '',                     // 9 personalidad — resolved per-user
  'oklch(0.42 0.10 260)', // 10 compartir
] as const
