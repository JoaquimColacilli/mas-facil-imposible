'use client'

/**
 * The 10 slides of "Tu Mes en MFI". Each slide receives WrappedData and renders
 * a 9:16 frame that fills its container. Gradients, blob colors and typography
 * mirror design-refs/wrapped-bundle/wrapped.slides.js 1:1.
 */

import type { ReactElement, ReactNode } from 'react'
import { Target, TrendingUp } from 'lucide-react'
import type { WrappedData } from '@/lib/wrapped/types'
import { PERSONALITIES } from '@/lib/wrapped/personalities'
import { fmtARS, fmtNum, fmtUSD } from '@/lib/wrapped/formatters'
import { SlideWrap, Sparkline } from './slide-primitives'
import { CountUp } from './count-up'
import { ShareCard } from './share-card'

interface SlideProps {
  data: WrappedData
  /** True when the overlay shell advances to this slide — drives count-up resets. */
  active: boolean
}

// ─── Slide 1: Portada ────────────────────────────────────────────────────────

function Slide1Portada({ data, active }: SlideProps) {
  return (
    <SlideWrap
      gradient={{ from: 'oklch(0.45 0.12 155)', to: 'oklch(0.50 0.10 65)' }}
      blobs={['oklch(0.65 0.14 155)', 'oklch(0.70 0.14 65)', 'oklch(0.55 0.14 295)']}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 stagger text-center">
        <div className="relative mb-5">
          <div
            className="w-20 h-20 rounded-full grid place-items-center bg-white/20 backdrop-blur border border-white/30 font-serif font-bold text-2xl text-white"
          >
            {data.user.initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white grid place-items-center text-xl shadow-lg">
            {data.user.mood}
          </div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/75 font-medium mb-2">
          MFI · {data.year}
        </div>
        <h1
          className="font-serif font-bold text-white balance leading-[0.95]"
          style={{ fontSize: 'clamp(36px, 11vw, 44px)' }}
        >
          Tu {data.month} en MFI
        </h1>
        <p className="mt-3 text-white/85 text-base max-w-[280px] pretty">Un recorrido por tu mes.</p>
      </div>
      <div className="shrink-0 pb-12 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur border border-white/30 grid place-items-center pulse-ring">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: '10px solid white',
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              marginLeft: '3px',
            }}
          />
        </div>
        <div className="text-white/80 text-sm font-medium">Tocá para empezar</div>
      </div>
    </SlideWrap>
  )
}

// ─── Slide 2: Los números del mes ────────────────────────────────────────────

function Slide2Numeros({ data, active }: SlideProps) {
  return (
    <SlideWrap
      gradient={{ from: 'oklch(0.45 0.11 230)', to: 'oklch(0.42 0.12 155)' }}
      blobs={['oklch(0.65 0.14 230)', 'oklch(0.60 0.13 155)', 'oklch(0.55 0.12 295)']}
    >
      <div className="pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium">
        El ritmo del mes
      </div>
      <div className="px-6 mt-2 stagger">
        <div className="flex items-baseline gap-2">
          <CountUp
            value={data.totals.movements}
            format={fmtNum}
            trigger={active}
            className="font-serif font-bold text-white leading-none"
            style={{ fontSize: 'clamp(120px, 34vw, 180px)' }}
          />
        </div>
        <div className="text-white font-serif font-semibold text-[22px] -mt-1">movimientos</div>
        <div className="text-white/80 mt-1 pretty max-w-[300px]">
          Entre ingresos, gastos, ahorros e inversiones.
        </div>
      </div>
      <div className="mt-auto px-6 pb-20 grid grid-cols-2 gap-3 stagger">
        <FlowCard label="Pesos" value={fmtARS(data.totals.flowARS)} hint="en tus manos" />
        <FlowCard label="Dólares" value={fmtUSD(data.totals.flowUSD)} hint="en tus manos" />
      </div>
    </SlideWrap>
  )
}

function FlowCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div
      className="rounded-xl p-4 backdrop-blur-sm"
      style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)' }}
    >
      <div className="text-[10px] uppercase tracking-wider text-white/75 font-medium">{label}</div>
      <div className="mt-1 font-mono font-medium text-white text-[20px]">{value}</div>
      <div className="text-white/70 text-[11px] mt-0.5">{hint}</div>
    </div>
  )
}

// ─── Slide 3: Balance ────────────────────────────────────────────────────────

function Slide3Balance({ data, active }: SlideProps) {
  const pos = data.balance.ars >= 0
  const deltaPos = data.balance.deltaVsPrev >= 0
  const deltaCopy = pos
    ? deltaPos
      ? 'Mejor que el mes pasado. Seguí así.'
      : 'Un poquito menos que el mes pasado.'
    : deltaPos
      ? 'Igual mejoraste respecto al mes pasado.'
      : 'Pasa — con plan lo damos vuelta.'

  const g1 = pos ? 'oklch(0.45 0.12 155)' : 'oklch(0.48 0.15 15)'
  const g2 = pos ? 'oklch(0.50 0.11 230)' : 'oklch(0.50 0.12 65)'
  const blobs: [string, string, string] = pos
    ? ['oklch(0.65 0.14 155)', 'oklch(0.65 0.13 230)', 'oklch(0.60 0.11 65)']
    : ['oklch(0.65 0.16 15)', 'oklch(0.65 0.13 65)', 'oklch(0.55 0.12 295)']

  return (
    <SlideWrap gradient={{ from: g1, to: g2 }} blobs={blobs}>
      <div className="pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium">
        Tu balance
      </div>
      <div className="px-6 mt-2 stagger">
        <CountUp
          value={data.balance.ars}
          format={(v) => fmtARS(v, true)}
          trigger={active}
          className="font-serif font-bold text-white leading-[0.92] balance block"
          style={{ fontSize: 'clamp(48px, 13vw, 72px)' }}
        />
        <div className="mt-3 text-white/90 text-[15px] pretty max-w-[320px]">
          {pos
            ? `Ingresaste ${fmtARS(data.balance.income)} y gastaste ${fmtARS(data.balance.expense)}.`
            : `Ingresaste ${fmtARS(data.balance.income)} pero gastaste ${fmtARS(data.balance.expense)}.`}
        </div>
        {data.balance.deltaVsPrev !== 0 && (
          <>
            <div
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: deltaPos ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.22)',
                border: `1px solid ${deltaPos ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)'}`,
              }}
            >
              <span className="font-serif font-semibold text-white">
                {deltaPos ? '↑' : '↓'} {Math.abs(data.balance.deltaVsPrev)}%
              </span>
              <span className="text-white/85 text-sm">vs mes anterior</span>
            </div>
            <div className="mt-2 text-white/85 text-sm">{deltaCopy}</div>
          </>
        )}
      </div>
      {data.balance.usd !== 0 && (
        <div className="mt-auto px-6 pb-20 stagger">
          <div
            className="rounded-xl p-3.5 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.22)' }}
          >
            <div
              className="w-9 h-9 rounded-lg grid place-items-center text-white"
              style={{ background: 'rgba(255,255,255,.18)' }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M5 9h14M5 15h14" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium">En dólares</div>
              <div className="font-mono text-white font-medium">
                {data.balance.usd >= 0 ? '+ ' : '− '}
                {fmtUSD(Math.abs(data.balance.usd))}
              </div>
            </div>
          </div>
        </div>
      )}
    </SlideWrap>
  )
}

// ─── Slide 4: Top categoría ──────────────────────────────────────────────────

function Slide4TopCategory({ data, active }: SlideProps) {
  const c = data.topCategory
  if (!c) return <SlideFallback data={data} message="No registraste gastos este mes." />

  const maxAmt = Math.max(...c.breakdown.map((b) => b.amount), 1)

  return (
    <SlideWrap
      gradient={{ from: 'oklch(0.45 0.14 15)', to: 'oklch(0.50 0.11 65)' }}
      blobs={['oklch(0.65 0.16 15)', 'oklch(0.68 0.13 65)', 'oklch(0.55 0.10 30)']}
    >
      <div className="pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium">
        En {data.month.toLowerCase()} gastaste más en…
      </div>
      <div className="px-6 mt-3 stagger">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl grid place-items-center text-white"
            style={{
              background: `${c.color}33`,
              border: `1px solid ${c.color}66`,
            }}
          >
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white/85 text-[12px] uppercase tracking-wider font-medium">Categoría top</div>
            <div className="font-serif font-bold text-white text-[28px] leading-tight truncate">{c.name}</div>
          </div>
        </div>
        <CountUp
          value={c.amount}
          format={(v) => fmtARS(v)}
          trigger={active}
          className="mt-4 font-serif font-bold text-white leading-none block"
          style={{ fontSize: 'clamp(58px, 16vw, 84px)' }}
        />
        <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25">
          <span className="font-serif font-semibold text-white">{c.pctOfExpenses}%</span>
          <span className="text-white/85 text-sm">de tus gastos</span>
        </div>
      </div>
      <div className="mt-auto px-6 pb-20">
        <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium mb-2">
          Top {Math.min(3, c.breakdown.length)} del mes
        </div>
        <div className="space-y-2">
          {c.breakdown.map((b, i) => (
            <div
              key={b.name}
              className="flex items-center gap-3 slide-enter"
              style={{ animationDelay: `${0.2 + i * 0.12}s` }}
            >
              <div className="w-6 text-[11px] font-mono text-white/75">0{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-white font-medium text-sm truncate">{b.name}</div>
                  <div className="font-mono text-white text-[12px] shrink-0">{fmtARS(b.amount)}</div>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(b.amount / maxAmt) * 100}%`, background: b.color }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideWrap>
  )
}

// ─── Slide 5: Equivalents ────────────────────────────────────────────────────

function Slide5Equivalents({ data, active }: SlideProps) {
  const amt = data.topCategory?.amount ?? 0
  if (!data.topCategory || data.equivalents.length === 0) {
    return <SlideFallback data={data} message="Faltaron datos para hacer comparaciones este mes." />
  }
  return (
    <SlideWrap
      gradient={{ from: 'oklch(0.42 0.14 15)', to: 'oklch(0.55 0.13 65)' }}
      blobs={['oklch(0.68 0.16 15)', 'oklch(0.72 0.14 65)', 'oklch(0.60 0.13 30)']}
      blobOpacity={0.7}
    >
      <div className="pt-14 px-6 stagger">
        <div className="text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium">
          Si no gastabas esos
        </div>
        <div
          className="mt-1 font-serif font-bold text-white leading-[0.9] balance"
          style={{ fontSize: 'clamp(40px, 12vw, 64px)' }}
        >
          {fmtARS(amt)}
        </div>
        <div className="mt-2 text-white/85 text-base pretty max-w-[280px]">te alcanzaba para…</div>
      </div>
      <div className="flex-1 px-6 mt-4 flex flex-col justify-center gap-3 stagger">
        {data.equivalents.map((e, i) => (
          <div
            key={`${e.label}-${i}`}
            className="relative rounded-2xl p-5 flex items-center gap-4 overflow-hidden"
            style={{
              background: 'rgba(255,255,255,.14)',
              border: '1px solid rgba(255,255,255,.28)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <div
              className="shrink-0 w-16 h-16 rounded-xl grid place-items-center text-4xl"
              style={{ background: 'rgba(255,255,255,.22)' }}
            >
              {e.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <CountUp
                  value={e.n}
                  format={fmtNum}
                  trigger={active}
                  className="font-serif font-bold text-white leading-none"
                  style={{ fontSize: 'clamp(36px, 11vw, 54px)' }}
                />
                <div className="font-serif font-medium text-white/90 text-[18px]">{e.label}</div>
              </div>
              <div className="mt-1 font-mono text-[11px] text-white/70">ref. {fmtARS(e.ref)} c/u</div>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 px-6 pb-20">
        <div className="rounded-xl p-3 flex items-start gap-2 bg-white/10 border border-white/20">
          <span className="text-lg leading-none mt-0.5">😉</span>
          <div className="text-white/90 text-[13px] pretty">
            No estamos diciendo que no lo gastes, solo que lo sepas.
          </div>
        </div>
      </div>
    </SlideWrap>
  )
}

// ─── Slide 6: Peak day ───────────────────────────────────────────────────────

function Slide6PeakDay({ data, active }: SlideProps) {
  const d = data.peakDay
  if (!d) return <SlideFallback data={data} message="Sin gastos diarios que destacar este mes." />
  const peakIdx = d.daily.indexOf(Math.max(...d.daily))
  return (
    <SlideWrap
      gradient={{ from: 'oklch(0.40 0.08 260)', to: 'oklch(0.48 0.14 15)' }}
      blobs={['oklch(0.55 0.14 295)', 'oklch(0.65 0.15 15)', 'oklch(0.60 0.10 260)']}
    >
      <div className="pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium">
        Tu día más intenso
      </div>
      <div className="px-6 mt-2 stagger">
        <div className="font-serif font-bold text-white text-[26px] leading-tight">{d.date}</div>
        <CountUp
          value={d.amount}
          format={(v) => fmtARS(v)}
          trigger={active}
          className="mt-2 font-serif font-bold text-white leading-none block"
          style={{ fontSize: 'clamp(56px, 15vw, 80px)' }}
        />
        <div className="mt-1 text-white/80 text-sm">gastados en un solo día</div>
      </div>
      {d.items.length > 0 && (
        <div className="px-6 mt-5 stagger">
          <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium mb-2">
            Lo que pasó ese día
          </div>
          <div className="space-y-1.5">
            {d.items.map((it) => (
              <div
                key={it.cat}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.18)' }}
              >
                <span className="text-white text-sm font-medium">{it.cat}</span>
                <span className="font-mono text-white text-[13px]">{fmtARS(it.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto px-6 pb-20">
        <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium mb-2">
          Gasto por día · {data.month.toLowerCase()}
        </div>
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)' }}
        >
          <Sparkline daily={d.daily} peakIdx={peakIdx} height={64} />
          <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-white/70">
            <span>01</span>
            <span>{String(peakIdx + 1).padStart(2, '0')} · pico</span>
            <span>{String(d.daily.length).padStart(2, '0')}</span>
          </div>
        </div>
      </div>
    </SlideWrap>
  )
}

// ─── Slide 7: Ahorro + Inversión ─────────────────────────────────────────────

function Slide7Savings({ data, active }: SlideProps) {
  const sv = data.savings
  // Defensive: old cached data shape pre-migration could have USD fields
  // undefined. `?? 0` keeps NaN out of the math.
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
  const nudge = pickSavingsNudge(hasSavings, hasInvestment, investGainARS + investGainUSD)

  return (
    <SlideWrap
      gradient={{ from: 'oklch(0.45 0.12 155)', to: 'oklch(0.48 0.14 295)' }}
      blobs={['oklch(0.65 0.14 155)', 'oklch(0.62 0.16 295)', 'oklch(0.58 0.12 230)']}
    >
      <div className="pt-14 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium">
        Apartaste para vos
      </div>
      {nudge && (
        <div className="px-6 mt-2 text-white font-serif font-semibold text-[18px] leading-tight max-w-[320px]">
          {nudge}
        </div>
      )}
      <div className="px-6 mt-4 stagger flex-1 flex flex-col gap-3 overflow-hidden">
        <AhorroCard
          balanceARS={savingsBalARS}
          balanceUSD={savingsBalUSD}
          addedARS={savingsAddedARS}
          addedUSD={savingsAddedUSD}
          trigger={active}
        />
        <InversionCard
          balanceARS={investBalARS}
          balanceUSD={investBalUSD}
          gainARS={investGainARS}
          gainUSD={investGainUSD}
          series={sv.investmentSeries}
          trigger={active}
        />
      </div>
    </SlideWrap>
  )
}

/** Pequeña frase motivacional arriba — cambia según el tipo de mes. */
function pickSavingsNudge(hasSavings: boolean, hasInvestment: boolean, gain: number): string {
  if (!hasSavings && !hasInvestment) {
    return 'Arrancar es la parte más difícil — el que viene lo empezás.'
  }
  if (hasInvestment && gain > 0) return '¡Capo! Plata trabajando, vos descansando.'
  if (hasInvestment && gain < 0) return 'Mes rojo pasa — lo importante es seguir adentro.'
  if (hasSavings && !hasInvestment) return 'Guardaste. Pequeño gran gesto.'
  return 'Dos frentes abiertos este mes — bien ahí.'
}

/**
 * Card "AHORRO": hero = balance total histórico; chip = "+este mes". Así el
 * usuario ve su ahorro total acumulado (lo que efectivamente tiene guardado)
 * y cuánto sumó específicamente en el mes del Wrapped.
 */
function AhorroCard({
  balanceARS,
  balanceUSD,
  addedARS,
  addedUSD,
  trigger,
}: {
  balanceARS: number
  balanceUSD: number
  addedARS: number
  addedUSD: number
  trigger: boolean
}) {
  const hasAny = balanceARS > 0 || balanceUSD > 0
  const addedThisMonth = addedARS !== 0 || addedUSD !== 0
  return (
    <div
      className="rounded-2xl p-4 shrink-0"
      style={{
        background: 'rgba(132, 204, 172, 0.16)',
        border: '1px solid rgba(132, 204, 172, 0.35)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/85 text-[11px] uppercase tracking-[0.18em] font-medium">
          <span className="text-base">🏦</span>
          <span>Ahorro · balance total</span>
        </div>
        {addedThisMonth && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono"
            style={{
              background: 'rgba(16,185,129,.22)',
              color: '#a7f3d0',
            }}
          >
            ↑ +{addedUSD > 0 ? fmtUSD(addedUSD) : fmtARS(addedARS)} este mes
          </span>
        )}
      </div>
      {!hasAny ? (
        <div className="mt-2 text-white/70 text-[14px]">
          Todavía no guardaste nada. Arrancar por poco ya es arrancar.
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-0.5">
          {balanceARS > 0 && (
            <CountUp
              value={balanceARS}
              format={(v) => fmtARS(v)}
              trigger={trigger}
              className="font-serif font-bold text-white leading-none"
              style={{ fontSize: 'clamp(32px, 9vw, 48px)' }}
            />
          )}
          {balanceUSD > 0 && (
            <CountUp
              value={balanceUSD}
              format={fmtUSD}
              trigger={trigger}
              className="font-serif font-bold text-white leading-none"
              style={{ fontSize: 'clamp(32px, 9vw, 48px)' }}
            />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Card "INVERSIÓN": muestra el **balance total** del portfolio (no los
 * aportes del mes) + ganancia/pérdida absoluta del mes + chart de línea
 * estilo bolsa. El balance es lo que el usuario ve en /investments; la
 * ganancia es la suma de los yield logs del mes.
 */
function InversionCard({
  balanceARS,
  balanceUSD,
  gainARS,
  gainUSD,
  series,
  trigger,
}: {
  balanceARS: number
  balanceUSD: number
  gainARS: number
  gainUSD: number
  series: import('@/lib/wrapped/types').WrappedInvestmentSeries | null
  trigger: boolean
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
      className="rounded-2xl p-4 flex-1 flex flex-col min-h-0"
      style={{
        background: 'rgba(132, 168, 232, 0.16)',
        border: '1px solid rgba(132, 168, 232, 0.35)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/85 text-[11px] uppercase tracking-[0.18em] font-medium">
          <span className="text-base">📈</span>
          <span>Inversión</span>
        </div>
        {gainLabel && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono"
            style={{
              background: gain >= 0 ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.22)',
              color: gain >= 0 ? '#a7f3d0' : '#fecaca',
            }}
          >
            {gain >= 0 ? '↑' : '↓'} {gain >= 0 ? '+' : '−'}
            {gainLabel}
          </span>
        )}
      </div>
      {!hasAny ? (
        <div className="mt-2 text-white/70 text-[14px]">
          Todavía no tenés inversiones activas.
        </div>
      ) : (
        <>
          <div className="mt-2">
            <CountUp
              value={balance}
              format={heroFmt}
              trigger={trigger}
              className="font-serif font-bold text-white leading-none"
              style={{ fontSize: 'clamp(32px, 9vw, 48px)' }}
            />
            {secondary && (
              <div className="mt-1 font-mono text-white/80 text-[13px]">+ {secondary}</div>
            )}
            <div className="mt-1 text-[11px] text-white/65 uppercase tracking-wider font-medium">
              balance a fin de mes
            </div>
          </div>
          {series && series.points.length >= 2 && (
            <div className="mt-3 max-h-[130px] flex-1 min-h-[90px]">
              <InvestmentLineChart series={series} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Stock-style line chart. Renders the sparse portfolio_logs points over the
 * month with min/max y-scaling (no zero baseline — we want dips/peaks to
 * read clearly), a filled area, start and end markers, and the current
 * balance as a trailing label near the last point.
 */
function InvestmentLineChart({
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
  // Pad y-range so the line doesn't hug the top/bottom edges.
  const pad = (maxV - minV) * 0.12 || maxV * 0.05 || 1
  const yMin = minV - pad
  const yMax = maxV + pad

  const W = 320
  const H = 120
  const PAD_X = 6
  const PAD_Y = 8

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

  const lastX = x(pts[pts.length - 1].day)
  const lastY = y(pts[pts.length - 1].balance)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mfi-inv-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={areaTop} />
          <stop offset="1" stopColor={areaTop} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#mfi-inv-area)" />
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* start marker */}
      <circle cx={x(pts[0].day)} cy={y(pts[0].balance)} r={3} fill="rgba(255,255,255,.85)" />
      {/* end marker — más prominente */}
      <circle cx={lastX} cy={lastY} r={7} fill={lineColor} opacity="0.35" />
      <circle cx={lastX} cy={lastY} r={4} fill={lineColor} stroke="white" strokeWidth={1.5} />
    </svg>
  )
}

// ─── Slide 8: Metas ──────────────────────────────────────────────────────────

function Slide8Goals({ data, active }: SlideProps) {
  const g = data.goal
  if (!g) return <SlideFallback data={data} message="Todavía no tenés metas activas. Creá una y seguila acá." />
  const nudge =
    g.completedThisMonth > 0
      ? `¡Completaste ${g.completedThisMonth} meta${g.completedThisMonth > 1 ? 's' : ''}! Sos un crack.`
      : g.pct >= 90
        ? 'A un paso. Empujá un poquito más.'
        : g.pct >= 50
          ? 'Pasaste la mitad — ya está cuesta abajo.'
          : g.pct >= 25
            ? 'De a poquito se llega. Vas bien.'
            : 'El primer peso es el más pesado. Lo estás juntando.'
  return (
    <SlideWrap
      gradient={{ from: 'oklch(0.42 0.12 230)', to: 'oklch(0.48 0.10 155)' }}
      blobs={['oklch(0.65 0.13 230)', 'oklch(0.60 0.12 155)', 'oklch(0.58 0.14 260)']}
    >
      <div className="pt-16 px-6 text-white/85 text-[12px] uppercase tracking-[0.22em] font-medium">
        Tus metas este mes
      </div>
      <div className="px-6 mt-2 text-white font-serif font-semibold text-[18px] leading-tight max-w-[320px]">
        {nudge}
      </div>
      <div className="px-6 mt-3 stagger">
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(255,255,255,.14)',
            border: '1px solid rgba(255,255,255,.28)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl grid place-items-center text-white"
              style={{ background: `${g.color}33`, border: `1px solid ${g.color}66` }}
            >
              <Target className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/75 text-[11px] uppercase tracking-wider font-medium">
                Más cerca de completar
              </div>
              <div className="font-serif font-bold text-white text-[22px] truncate leading-tight">{g.name}</div>
            </div>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <CountUp
              value={g.pct}
              format={(v) => `${fmtNum(v)}%`}
              trigger={active}
              className="font-serif font-bold text-white leading-none"
              style={{ fontSize: 'clamp(48px, 15vw, 72px)' }}
            />
            <div className="font-mono text-white/80 text-sm">completada</div>
          </div>
          <div className="mt-3 h-3 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${g.pct}%`, background: `linear-gradient(90deg, #fff, ${g.color})` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[12px] text-white/85">
            <span>{fmtARS(g.current)}</span>
            <span>de {fmtARS(g.target)}</span>
          </div>
        </div>
      </div>
      {g.completedThisMonth > 0 && (
        <div className="mt-auto px-6 pb-20 stagger">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-white/12 border border-white/22">
            <span className="text-2xl">🎯</span>
            <div className="text-white text-[15px]">
              Completaste <span className="font-serif font-bold">{g.completedThisMonth} metas</span> este mes.
            </div>
          </div>
        </div>
      )}
    </SlideWrap>
  )
}

// ─── Slide 9: Personalidad (collectible card) ────────────────────────────────

function Slide9Personality({ data }: SlideProps) {
  const p = PERSONALITIES[data.personality]
  const micro = data.personality === 'ahorrista'
    ? `${Math.round(((data.savings.savings + data.savings.investment) / Math.max(data.balance.income, 1)) * 100)}% ahorrado`
    : data.personality === 'inversor'
      ? `${Math.round((data.savings.investment / Math.max(data.savings.savings + data.savings.investment, 1)) * 100)}% a inversiones`
      : data.personality === 'social'
        ? 'tu mes fue social'
        : data.personality === 'austero'
          ? 'mes de pulso bajo'
          : p.micro
  const badgeNum = (p.id.charCodeAt(0) + p.id.charCodeAt(1)).toString().padStart(3, '0')
  return (
    <SlideWrap
      gradient={{ from: p.g1, to: p.g2 }}
      blobs={[p.g1, p.g2, 'oklch(0.55 0.12 295)']}
      blobOpacity={0.5}
    >
      <div className="pt-14 px-6 text-white/80 text-[12px] uppercase tracking-[0.22em] font-medium text-center">
        Tu personalidad del mes
      </div>
      <div className="flex-1 px-6 flex flex-col items-center justify-center gap-5 stagger">
        {/* Collectible card */}
        <div
          className="relative rounded-[22px] w-[260px] aspect-[3/4] overflow-hidden grain"
          style={{
            background: `linear-gradient(155deg, ${p.g1} 0%, ${p.g2} 100%)`,
            boxShadow:
              '0 30px 80px -30px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.18)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.22), transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div className="relative h-full flex flex-col p-5" style={{ zIndex: 1 }}>
            <div className="flex items-center justify-between text-white/75 text-[10px] uppercase tracking-[0.2em] font-medium">
              <span>MFI · {data.year}</span>
              <span className="font-mono">#{badgeNum}</span>
            </div>
            <div className="flex-1 grid place-items-center">
              <div
                className="leading-none select-none drop-shadow-lg"
                style={{ fontSize: 'clamp(80px, 30vw, 110px)' }}
              >
                {p.emoji}
              </div>
            </div>
            <div>
              <div className="text-white/70 text-[10px] uppercase tracking-[0.22em] font-medium">Sos</div>
              <div
                className="mt-0.5 font-serif font-bold text-white leading-[0.95] balance"
                style={{ fontSize: 'clamp(22px, 7vw, 26px)' }}
              >
                {p.label}
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-[320px] text-center px-2">
          <p className="text-white/90 text-[15px] pretty leading-relaxed">{p.desc}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 font-mono text-[12px] text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>{micro}</span>
          </div>
        </div>
      </div>
      <div className="shrink-0 pb-20" />
    </SlideWrap>
  )
}

// ─── Slide 10: Cierre + compartir ────────────────────────────────────────────

interface Slide10Props extends SlideProps {
  onShare?: () => void
  onDownloadExcel?: () => void
  onDownloadPDF?: () => void
  onDownloadWrappedPDF?: () => void
  onRestart?: () => void
  loadingAction?: 'share' | 'excel' | 'pdf' | 'wrapped-pdf' | null
}

function Slide10Cierre({
  data,
  onShare,
  onDownloadExcel,
  onDownloadPDF,
  onDownloadWrappedPDF,
  onRestart,
  loadingAction,
}: Slide10Props) {
  const p = PERSONALITIES[data.personality]
  return (
    <SlideWrap
      gradient={{ from: p.g1, to: p.g2 }}
      blobs={[p.g1, p.g2, 'oklch(0.55 0.12 65)']}
      blobOpacity={0.5}
    >
      <div className="pt-12 px-6 text-center stagger">
        <div className="text-white/80 text-[12px] uppercase tracking-[0.22em] font-medium">
          {data.month} · {data.year}
        </div>
        <h2 className="mt-1 font-serif font-bold text-white text-[26px] leading-tight balance">Ese fue tu mes.</h2>
      </div>
      <div className="px-6 mt-4 flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-[260px] slide-enter">
          <ShareCard data={data} ratio="feed" flat />
        </div>
      </div>
      <div className="shrink-0 px-6 pb-20 stagger">
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Slide10Button
            variant="primary"
            loading={loadingAction === 'share'}
            onClick={onShare}
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            }
          >
            Compartir
          </Slide10Button>
          <Slide10Button
            variant="secondary"
            loading={loadingAction === 'excel'}
            onClick={onDownloadExcel}
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M8 13l4 4M12 13l-4 4" />
              </svg>
            }
          >
            Excel
          </Slide10Button>
          <Slide10Button
            variant="secondary"
            loading={loadingAction === 'pdf'}
            onClick={onDownloadPDF}
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
          >
            PDF
          </Slide10Button>
        </div>
        {onDownloadWrappedPDF && (
          <button
            type="button"
            onClick={onDownloadWrappedPDF}
            disabled={loadingAction === 'wrapped-pdf'}
            className="mt-2 w-full h-9 rounded-lg text-white/90 text-[12px] font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {loadingAction === 'wrapped-pdf' ? 'Generando PDF…' : 'Descargar Wrapped en PDF'}
          </button>
        )}
        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="mt-1.5 w-full h-9 rounded-lg text-white/85 text-[12px] font-medium hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <span aria-hidden>↺</span>
            <span>Volver a ver tu {data.month.toLowerCase()} en MFI</span>
          </button>
        )}
        <div className="text-center mt-3 text-white/80 text-sm">Nos vemos el mes que viene 👋</div>
      </div>
    </SlideWrap>
  )
}

function Slide10Button({
  children,
  icon,
  onClick,
  loading,
  variant,
}: {
  children: ReactNode
  icon: ReactNode
  onClick?: () => void
  loading?: boolean
  variant: 'primary' | 'secondary'
}) {
  const base =
    'rounded-xl h-11 flex items-center justify-center gap-1.5 font-serif text-[13px] transition-all disabled:opacity-50'
  const cls =
    variant === 'primary'
      ? `${base} bg-white font-semibold shadow-lg`
      : `${base} bg-white/15 border border-white/25 text-white font-medium`
  const style = variant === 'primary' ? { color: 'oklch(0.50 0.10 155)' } : undefined
  return (
    <button type="button" className={cls} style={style} onClick={onClick} disabled={loading}>
      {loading ? (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  )
}

// ─── Fallback for slides that lack data in a given month ─────────────────────

function SlideFallback({ data, message }: { data: WrappedData; message: string }) {
  return (
    <SlideWrap
      gradient={{ from: 'oklch(0.45 0.10 260)', to: 'oklch(0.48 0.10 155)' }}
      blobs={['oklch(0.58 0.12 260)', 'oklch(0.62 0.12 155)', 'oklch(0.58 0.10 230)']}
      blobOpacity={0.45}
    >
      <div className="flex-1 px-8 flex flex-col items-center justify-center text-center gap-3">
        <div className="text-white/80 text-[12px] uppercase tracking-[0.22em] font-medium">
          {data.month} · {data.year}
        </div>
        <div className="font-serif font-bold text-white text-[22px] balance max-w-[260px]">{message}</div>
      </div>
    </SlideWrap>
  )
}

// ─── Registry ────────────────────────────────────────────────────────────────

export interface WrappedSlideProps extends SlideProps {
  onShare?: () => void
  onDownloadExcel?: () => void
  onDownloadPDF?: () => void
  onDownloadWrappedPDF?: () => void
  onRestart?: () => void
  loadingAction?: 'share' | 'excel' | 'pdf' | 'wrapped-pdf' | null
}

export const SLIDE_COMPONENTS: Array<(p: WrappedSlideProps) => ReactElement> = [
  Slide1Portada,
  Slide2Numeros,
  Slide3Balance,
  Slide4TopCategory,
  Slide5Equivalents,
  Slide6PeakDay,
  Slide7Savings,
  Slide8Goals,
  Slide9Personality,
  Slide10Cierre,
]

export const SLIDE_TITLES = [
  'Portada',
  'Números',
  'Balance',
  'Top categoría',
  'Qué podías comprar',
  'Día más caro',
  'Ahorro+Inversión',
  'Metas',
  'Personalidad',
  'Compartir',
]
