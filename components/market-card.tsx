'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { AreaChart, Area, YAxis, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { usePolling } from '@/hooks/use-polling'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  type MarketData,
  type TickerQuote,
  fetchMarketData,
  getMarketStatus,
  flashDirection,
  DEFAULT_VISIBLE_TICKERS,
} from '@/lib/market-data'
import {
  type CryptoData,
  type CryptoQuote,
  fetchCryptoData,
  DEFAULT_VISIBLE_CRYPTO,
} from '@/lib/crypto-data'
import { isNonTradingDay, getHolidayName } from '@/lib/ar-holidays'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MarketTab = 'acciones' | 'crypto'

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const fmtLarge = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const fmtPrice = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtUsd = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatLargeNumber(n: number) { return fmtLarge.format(n) }
function formatTickerPrice(n: number) { return `$${fmtPrice.format(n)}` }
function formatUsd(n: number) { return `$${fmtUsd.format(n)}` }

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function readLs(key: string, defaultValue: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return defaultValue
    return v === '1'
  } catch { return defaultValue }
}

function writeLs(key: string, value: boolean) {
  try { localStorage.setItem(key, value ? '1' : '0') } catch { /* */ }
}

function readLsString(key: string, defaultValue: string): string {
  try { return localStorage.getItem(key) ?? defaultValue } catch { return defaultValue }
}

function writeLsString(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* */ }
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

function Sparkline({
  prices, isPositive, height, gradientId, strokeWidth = 1.5, gradientOpacity = 0.3,
}: {
  prices: number[]
  isPositive: boolean
  height: number
  gradientId: string
  strokeWidth?: number
  gradientOpacity?: number
}) {
  if (prices.length < 2) return null
  const color = isPositive ? '#10b981' : '#f43f5e'
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={prices.map((p, i) => ({ i, p }))}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={gradientOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area type="monotone" dataKey="p" stroke={color} strokeWidth={strokeWidth} fill={`url(#${gradientId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function VariationBadge({ pct, size = 'normal' }: { pct: number; size?: 'normal' | 'small' }) {
  const isPositive = pct >= 0
  return (
    <span className={cn(
      'font-semibold font-mono tabular-nums rounded-md border',
      size === 'normal' ? 'text-xs px-1.5 py-0.5' : 'text-[11px] px-1.5 py-0.5 min-w-[52px] text-center',
      isPositive
        ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
        : 'text-rose-400 bg-rose-500/20 border-rose-500/30',
    )}>
      {isPositive ? '+' : ''}{pct.toFixed(2)}%
    </span>
  )
}

// ---------------------------------------------------------------------------
// Acciones sub-components
// ---------------------------------------------------------------------------

function MervalHero({ quote, flash, mounted, chartHeight }: {
  quote: TickerQuote; flash: 'up' | 'down' | null | undefined; mounted: boolean; chartHeight: number
}) {
  const isPositive = quote.changePercent >= 0
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1" style={{ animationFillMode: 'both' }}>
      <p className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-1">MERVAL</p>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-lg font-mono font-bold tabular-nums text-foreground transition-colors duration-400', flash === 'up' && 'text-emerald-400', flash === 'down' && 'text-rose-400')}>
          {formatLargeNumber(quote.price)}
        </span>
        <VariationBadge pct={quote.changePercent} />
      </div>
      {mounted && quote.intradayPrices.length > 1 && (
        <div className="mt-2">
          <Sparkline prices={quote.intradayPrices} isPositive={isPositive} height={chartHeight} gradientId="mervalGradient" strokeWidth={2} gradientOpacity={0.3} />
        </div>
      )}
    </div>
  )
}

function StockRow({ quote, flash, index, isLast, mounted }: {
  quote: TickerQuote; flash: 'up' | 'down' | null | undefined; index: number; isLast: boolean; mounted: boolean
}) {
  const isPositive = quote.changePercent >= 0
  const yahooUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(quote.ticker)}`
  return (
    <a href={yahooUrl} target="_blank" rel="noopener noreferrer"
      className={cn('flex items-center justify-between px-1 py-2 -mx-1 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer animate-in fade-in slide-in-from-bottom-1', !isLast && 'border-b border-white/[0.04]')}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}>
      <span className="text-sm text-foreground/70">{quote.name}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-mono font-medium tabular-nums text-foreground transition-colors duration-400', flash === 'up' && 'text-emerald-400', flash === 'down' && 'text-rose-400')}>
          {formatTickerPrice(quote.price)}
        </span>
        {mounted && quote.intradayPrices.length > 1 && (
          <div className="w-10 shrink-0">
            <Sparkline prices={quote.intradayPrices} isPositive={isPositive} height={16} gradientId={`spark-${quote.ticker.replace(/[^a-zA-Z0-9]/g, '')}`} strokeWidth={1} gradientOpacity={0.2} />
          </div>
        )}
        <VariationBadge pct={quote.changePercent} size="small" />
      </div>
    </a>
  )
}

// ---------------------------------------------------------------------------
// Crypto sub-components
// ---------------------------------------------------------------------------

function CryptoHero({ quote, flash, mounted, chartHeight }: {
  quote: CryptoQuote; flash: 'up' | 'down' | null | undefined; mounted: boolean; chartHeight: number
}) {
  const isPositive = quote.changePercent24h >= 0
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1" style={{ animationFillMode: 'both' }}>
      <p className="text-[10px] font-bold text-muted-foreground tracking-[0.08em] uppercase mb-1">BITCOIN</p>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-lg font-mono font-bold tabular-nums text-foreground transition-colors duration-400', flash === 'up' && 'text-emerald-400', flash === 'down' && 'text-rose-400')}>
          {formatUsd(quote.price)}
        </span>
        <VariationBadge pct={quote.changePercent24h} />
      </div>
      {mounted && quote.sparkline7d.length > 1 && (
        <div className="mt-2">
          <Sparkline prices={quote.sparkline7d} isPositive={isPositive} height={chartHeight} gradientId="btcGradient" strokeWidth={2} gradientOpacity={0.3} />
        </div>
      )}
    </div>
  )
}

function CryptoRow({ quote, flash, index, isLast, mounted }: {
  quote: CryptoQuote; flash: 'up' | 'down' | null | undefined; index: number; isLast: boolean; mounted: boolean
}) {
  const isPositive = quote.changePercent24h >= 0
  const geckoUrl = `https://www.coingecko.com/en/coins/${quote.id}`
  return (
    <a href={geckoUrl} target="_blank" rel="noopener noreferrer"
      className={cn('flex items-center justify-between px-1 py-2 -mx-1 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer animate-in fade-in slide-in-from-bottom-1', !isLast && 'border-b border-white/[0.04]')}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}>
      <span className="text-sm text-foreground/70">{quote.symbol}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-mono font-medium tabular-nums text-foreground transition-colors duration-400', flash === 'up' && 'text-emerald-400', flash === 'down' && 'text-rose-400')}>
          {formatUsd(quote.price)}
        </span>
        {mounted && quote.sparkline7d.length > 1 && (
          <div className="w-10 shrink-0">
            <Sparkline prices={quote.sparkline7d} isPositive={isPositive} height={16} gradientId={`spark-crypto-${quote.id}`} strokeWidth={1} gradientOpacity={0.2} />
          </div>
        )}
        <VariationBadge pct={quote.changePercent24h} size="small" />
      </div>
    </a>
  )
}

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

function MarketCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border"><div className="h-3 w-16 bg-muted rounded animate-pulse" /></div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="h-2.5 w-14 bg-muted rounded animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-8 w-full bg-muted/50 rounded animate-pulse" />
        </div>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex justify-between items-center py-2">
            <div className="h-4 w-12 bg-muted rounded animate-pulse" />
            <div className="flex gap-2"><div className="h-4 w-20 bg-muted rounded animate-pulse" /><div className="h-4 w-14 bg-muted rounded animate-pulse" /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabContentError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="p-6 text-center">
      <p className="text-sm text-muted-foreground mb-3">Sin datos disponibles</p>
      <button onClick={onRetry} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Reintentar</button>
    </div>
  )
}

function ExpandToggle({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
      {expanded ? <>Ver menos <ChevronUp className="w-3 h-3" /></> : <>Ver más <ChevronDown className="w-3 h-3" /></>}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface MarketCardProps {
  defaultExpanded?: boolean
  chartHeight?: number
}

export function MarketCard({ defaultExpanded = false, chartHeight = 32 }: MarketCardProps = {}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Tab state — persisted
  const [tab, setTab] = useState<MarketTab>(() => readLsString('mfi-market-tab', 'acciones') as MarketTab)
  function switchTab(t: MarketTab) {
    setTab(t)
    writeLsString('mfi-market-tab', t)
  }

  // Expand states — independent per tab
  const [stocksExpanded, setStocksExpanded] = useState(() => readLs('mfi-market-expanded', defaultExpanded))
  const [cryptoExpanded, setCryptoExpanded] = useState(() => readLs('mfi-crypto-expanded', defaultExpanded))

  function toggleStocksExpanded() {
    setStocksExpanded(prev => { const n = !prev; writeLs('mfi-market-expanded', n); return n })
  }
  function toggleCryptoExpanded() {
    setCryptoExpanded(prev => { const n = !prev; writeLs('mfi-crypto-expanded', n); return n })
  }

  // --- Stocks polling (always active) ---
  const stocks = usePolling<MarketData>({
    key: 'mfi-market-data',
    fetcher: fetchMarketData,
    intervalMs: 5 * 60 * 1000,
    cacheKey: 'mfi-market-cache',
  })

  // --- Crypto polling (lazy: only starts after first tab switch) ---
  const [cryptoActivated, setCryptoActivated] = useState(false)
  useEffect(() => {
    if (tab === 'crypto' && !cryptoActivated) setCryptoActivated(true)
  }, [tab, cryptoActivated])

  // We always call usePolling (hooks can't be conditional), but use a null key to skip
  const cryptoNullFetcher = useCallback(async (): Promise<CryptoData> => {
    throw new Error('not activated')
  }, [])
  const crypto = usePolling<CryptoData>({
    key: cryptoActivated ? 'mfi-crypto-data' : null as any,
    fetcher: cryptoActivated ? fetchCryptoData : cryptoNullFetcher,
    intervalMs: 5 * 60 * 1000,
    cacheKey: cryptoActivated ? 'mfi-crypto-cache' : null,
  })

  // Market status (only for stocks tab)
  const { status, nextOpenLabel } = getMarketStatus(new Date(), isNonTradingDay, getHolidayName)
  const isOpen = status === 'open'

  // Flash tracking — unified for both tabs
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'down' | null>>({})
  const prevPricesRef = useRef<Record<string, number>>({})

  // Flash for stocks
  useEffect(() => {
    if (!stocks.data) return
    const all = [stocks.data.merval, ...stocks.data.tickers]
    const nf: Record<string, 'up' | 'down' | null> = {}
    let has = false
    for (const q of all) {
      const p = prevPricesRef.current[q.ticker]
      if (p !== undefined && p !== q.price) { nf[q.ticker] = flashDirection(p, q.price); has = true }
    }
    for (const q of all) prevPricesRef.current[q.ticker] = q.price
    if (has) { setFlashes(prev => ({ ...prev, ...nf })); const t = setTimeout(() => setFlashes(prev => { const next = { ...prev }; for (const k of Object.keys(nf)) next[k] = null; return next }), 400); return () => clearTimeout(t) }
  }, [stocks.data])

  // Flash for crypto
  useEffect(() => {
    if (!crypto.data) return
    const all = [crypto.data.hero, ...crypto.data.coins]
    const nf: Record<string, 'up' | 'down' | null> = {}
    let has = false
    for (const q of all) {
      const p = prevPricesRef.current[q.id]
      if (p !== undefined && p !== q.price) { nf[q.id] = flashDirection(p, q.price); has = true }
    }
    for (const q of all) prevPricesRef.current[q.id] = q.price
    if (has) { setFlashes(prev => ({ ...prev, ...nf })); const t = setTimeout(() => setFlashes(prev => { const next = { ...prev }; for (const k of Object.keys(nf)) next[k] = null; return next }), 400); return () => clearTimeout(t) }
  }, [crypto.data])

  // Refresh — targets active tab
  const [spinning, setSpinning] = useState(false)
  const activePolling = tab === 'acciones' ? stocks : crypto
  const handleRefresh = useCallback(async () => {
    if (activePolling.onCooldown) return
    setSpinning(true)
    await activePolling.refetch()
    setTimeout(() => setSpinning(false), 500)
  }, [activePolling])

  const lastUpdatedStr = activePolling.lastUpdated
    ? activePolling.lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null

  // --- Hydration guard ---
  // Server renderiza con defaults (sin localStorage) y con stocks.isLoading=true → skeleton.
  // El primer render del client lee localStorage en los useState iniciales y puede diferir
  // (tab persistido, data ya cacheada en SWR/sessionStorage). Mientras !mounted, forzamos
  // skeleton para matchear el server y evitar el mismatch.
  if (!mounted) return <MarketCardSkeleton />

  // --- Loading state (only for initial load of stocks) ---
  if (tab === 'acciones' && stocks.isLoading) return <MarketCardSkeleton />

  return (
    <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-blue-500/[0.02] pointer-events-none" />

      {/* Header */}
      <div className="relative px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold text-muted-foreground tracking-[0.1em] uppercase">Mercado</h2>
          {/* Market status dot — only for acciones tab */}
          {tab === 'acciones' && (
            isOpen ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground">{nextOpenLabel}</span>
              </span>
            )
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleRefresh} disabled={activePolling.onCooldown}
              className={cn('p-1 rounded-md transition-colors', activePolling.onCooldown ? 'opacity-30 cursor-not-allowed' : 'text-muted-foreground/50 hover:text-muted-foreground cursor-pointer')}>
              <RefreshCw className="w-3.5 h-3.5" style={{ transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)', transition: spinning ? 'transform 0.5s ease-out' : 'none' }} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{activePolling.onCooldown ? `Esperá ${activePolling.cooldownRemaining}s` : 'Actualizar ahora'}</TooltipContent>
        </Tooltip>
      </div>

      {/* Tab switcher */}
      <div className="relative flex gap-1 px-4 py-2 border-b border-border/50">
        {(['acciones', 'crypto'] as const).map(t => (
          <button key={t} onClick={() => switchTab(t)}
            className={cn('flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150',
              tab === t ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'acciones' ? 'Acciones' : 'Crypto'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="relative">
        {tab === 'acciones' ? (
          <AccionesContent
            data={stocks.data}
            flashes={flashes}
            mounted={mounted}
            chartHeight={chartHeight}
            expanded={stocksExpanded}
            onToggleExpanded={toggleStocksExpanded}
            onRetry={stocks.refetch}
          />
        ) : (
          <CryptoContent
            data={crypto.data}
            isLoading={crypto.isLoading}
            flashes={flashes}
            mounted={mounted}
            chartHeight={chartHeight}
            expanded={cryptoExpanded}
            onToggleExpanded={toggleCryptoExpanded}
            onRetry={crypto.refetch}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground/40 text-center">
          {tab === 'acciones' ? 'Yahoo Finance · ~15 min delay' : 'CoinGecko'}
          {lastUpdatedStr && ` · Última act: ${lastUpdatedStr}`}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------

function AccionesContent({ data, flashes, mounted, chartHeight, expanded, onToggleExpanded, onRetry }: {
  data: MarketData | null
  flashes: Record<string, 'up' | 'down' | null>
  mounted: boolean
  chartHeight: number
  expanded: boolean
  onToggleExpanded: () => void
  onRetry: () => Promise<void>
}) {
  if (!data) return <TabContentError label="acciones" onRetry={onRetry} />

  const visibleTickers = expanded ? data.tickers : data.tickers.slice(0, DEFAULT_VISIBLE_TICKERS)
  const hasMore = data.tickers.length > DEFAULT_VISIBLE_TICKERS

  return (
    <div className="p-4 space-y-3 animate-in fade-in duration-200">
      <MervalHero quote={data.merval} flash={flashes[data.merval.ticker]} mounted={mounted} chartHeight={chartHeight} />
      {visibleTickers.map((ticker, i) => (
        <StockRow key={ticker.ticker} quote={ticker} flash={flashes[ticker.ticker]} index={i + 1} isLast={!hasMore && !expanded && i === visibleTickers.length - 1} mounted={mounted} />
      ))}
      {hasMore && <ExpandToggle expanded={expanded} onClick={onToggleExpanded} />}
    </div>
  )
}

function CryptoContent({ data, isLoading, flashes, mounted, chartHeight, expanded, onToggleExpanded, onRetry }: {
  data: CryptoData | null
  isLoading: boolean
  flashes: Record<string, 'up' | 'down' | null>
  mounted: boolean
  chartHeight: number
  expanded: boolean
  onToggleExpanded: () => void
  onRetry: () => Promise<void>
}) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4 animate-in fade-in duration-200">
        <div className="space-y-2">
          <div className="h-2.5 w-14 bg-muted rounded animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-8 w-full bg-muted/50 rounded animate-pulse" />
        </div>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex justify-between items-center py-2">
            <div className="h-4 w-12 bg-muted rounded animate-pulse" />
            <div className="flex gap-2"><div className="h-4 w-20 bg-muted rounded animate-pulse" /><div className="h-4 w-14 bg-muted rounded animate-pulse" /></div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) return <TabContentError label="crypto" onRetry={onRetry} />

  const visibleCoins = expanded ? data.coins : data.coins.slice(0, DEFAULT_VISIBLE_CRYPTO)
  const hasMore = data.coins.length > DEFAULT_VISIBLE_CRYPTO

  return (
    <div className="p-4 space-y-3 animate-in fade-in duration-200">
      <CryptoHero quote={data.hero} flash={flashes[data.hero.id]} mounted={mounted} chartHeight={chartHeight} />
      {visibleCoins.map((coin, i) => (
        <CryptoRow key={coin.id} quote={coin} flash={flashes[coin.id]} index={i + 1} isLast={!hasMore && !expanded && i === visibleCoins.length - 1} mounted={mounted} />
      ))}
      {hasMore && <ExpandToggle expanded={expanded} onClick={onToggleExpanded} />}
    </div>
  )
}
