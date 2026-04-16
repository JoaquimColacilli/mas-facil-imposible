'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TrendingUp, Plus, X, ArrowRight, BarChart2, List, ArrowDownToLine, ArrowUpToLine } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput, parseMoneyInput } from '@/components/money-input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { isNonTradingDay } from '@/lib/ar-holidays'
import { formatCurrency } from '@/lib/types'
import type { Portfolio, PortfolioLog, PortfolioLogType, Transaction } from '@/lib/types'

type PortfolioLogWithPortfolio = PortfolioLog & {
  portfolio: { name: string; currency: string }
}

// Backwards-compat: rows inserted before the `type` column was added have type = null.
// Fall back to the old heuristic so the UI stays correct until the migration runs.
function resolveLogType(log: Pick<PortfolioLog, 'type' | 'percentage_change' | 'absolute_change'>): PortfolioLogType {
  if (log.type) return log.type
  if (log.percentage_change < -5 && log.absolute_change < 0) return 'rescue'
  if (log.percentage_change > 8 && log.absolute_change > 0) return 'deposit'
  return 'yield'
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function startOfCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function endOfCurrentMonth() {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

function getPeriodRange(period: 'month' | 'year') {
  if (period === 'year') {
    const y = new Date().getFullYear()
    return { start: `${y}-01-01`, end: `${y}-12-31` }
  }
  return { start: startOfCurrentMonth(), end: endOfCurrentMonth() }
}

type Tab = 'portfolios' | 'movimientos'
type Period = 'month' | 'year'

export function MfiPortfolioWidget({ profileCurrency }: { profileCurrency: string }) {
  const supabase = createClient()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [portfolioLogs, setPortfolioLogs] = useState<PortfolioLogWithPortfolio[]>([])
  const [investTx, setInvestTx] = useState<Transaction[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [needsUpdate, setNeedsUpdate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('portfolios')
  const [period, setPeriod] = useState<Period>('month')
  const [didInitialLoad, setDidInitialLoad] = useState(false)
  const [loadingPeriod, setLoadingPeriod] = useState(false)
  const periodCacheRef = useRef<Partial<Record<Period, {
    logs: PortfolioLogWithPortfolio[]
    investTx: Transaction[]
  }>>>({})

  // Creation state
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBalance, setNewBalance] = useState('')
  const [newCurrency, setNewCurrency] = useState<'ARS' | 'USD'>(profileCurrency as 'ARS' | 'USD')

  // Update state (keyed by portfolio id)
  const [updates, setUpdates] = useState<Record<string, { pct: string; final: string }>>({})

  // Rescue state
  const [rescuePortfolioId, setRescuePortfolioId] = useState<string | null>(null)
  const [rescueAmount, setRescueAmount] = useState('')
  const [rescueSaving, setRescueSaving] = useState(false)

  // Listen for external open event (from dashboard KPI card)
  useEffect(() => {
    const handler = () => setIsOpen(true)
    window.addEventListener('open-portfolio-widget', handler)
    return () => window.removeEventListener('open-portfolio-widget', handler)
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchPeriodData(ports: Portfolio[], currentPeriod: Period, opts: { useCache?: boolean } = {}) {
    const useCache = opts.useCache !== false
    const cached = periodCacheRef.current[currentPeriod]
    if (useCache && cached) {
      setInvestTx(cached.investTx)
      setPortfolioLogs(cached.logs)
      setLoadingPeriod(false)
      return
    }

    setLoadingPeriod(true)
    const { start, end } = getPeriodRange(currentPeriod)
    const { fetchInvestmentTransactions } = await import('@/app/(app)/transactions/actions')
    const investTxData = await fetchInvestmentTransactions(start, end)

    let logs: PortfolioLogWithPortfolio[] = []
    if (ports.length > 0) {
      const { data: logsData } = await supabase
        .from('portfolio_logs')
        .select('*, portfolio:portfolios(name, currency)')
        .in('portfolio_id', ports.map(p => p.id))
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
      logs = (logsData || []) as PortfolioLogWithPortfolio[]
    }

    periodCacheRef.current[currentPeriod] = { logs, investTx: investTxData }
    setInvestTx(investTxData)
    setPortfolioLogs(logs)
    setLoadingPeriod(false)
  }

  async function fetchData() {
    setLoading(true)
    periodCacheRef.current = {}
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [portfoliosRes, logsRes] = await Promise.all([
      supabase.from('portfolios').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('portfolio_logs').select('*', { count: 'exact', head: true }).eq('date', todayISO()),
    ])

    const ports = (portfoliosRes.data || []) as Portfolio[]
    setPortfolios(ports)

    await fetchPeriodData(ports, period, { useCache: false })

    const nowLocal = new Date()
    const isPast17 = nowLocal.getHours() >= 17
    const hasLogsToday = (logsRes.count || 0) > 0

    if (ports.length > 0 && !hasLogsToday && isPast17 && !isNonTradingDay(nowLocal)) {
      setNeedsUpdate(true)
      // Create daily reminder notification if not already sent today
      const startOfToday = `${todayISO()}T00:00:00`
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('title', 'Actualizá tus inversiones')
        .gte('created_at', startOfToday)

      if ((notifCount || 0) === 0) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'info',
          title: 'Actualizá tus inversiones',
          message: 'Cerraron los mercados. Ingresá el rendimiento del día para mantener tu portfolio al día.',
          data: { type: 'portfolio_reminder', date: todayISO() },
        })
      }
    } else {
      setNeedsUpdate(false)
    }

    setDidInitialLoad(true)
    setLoading(false)
  }

  useEffect(() => {
    if (!didInitialLoad) return
    fetchPeriodData(portfolios, period)
  }, [period])

  async function handleCreatePortfolio() {
    if (!newName.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        user_id: user.id,
        name: newName.trim(),
        currency: newCurrency,
        balance: parseMoneyInput(newBalance),
      })
      .select()
      .single()

    if (!error && data) {
      setPortfolios([...portfolios, data as Portfolio])
      setIsCreating(false)
      setNewName('')
      setNewBalance('')
      setNewCurrency(profileCurrency as 'ARS' | 'USD')
      toast.success('Portfolio creado')
    } else if (error) {
      toast.error('No se pudo crear el portfolio. Intentá de nuevo', { duration: 5000 })
    }
    setSaving(false)
  }

  function handleUpdateChange(id: string, field: 'pct' | 'final', value: string) {
    const port = portfolios.find(p => p.id === id)
    if (!port) return
    const currentBalance = Number(port.balance) || 0

    setUpdates(prev => {
      const current = prev[id] || { pct: '', final: '' }
      let newPct = current.pct
      let newFinal = current.final

      if (field === 'pct') {
        newPct = value
        if (value && !isNaN(Number(value))) {
          newFinal = (currentBalance * (1 + Number(value) / 100)).toFixed(2)
        } else {
          newFinal = ''
        }
      } else {
        newFinal = value
        if (value && !isNaN(Number(value)) && currentBalance > 0) {
          newPct = (((Number(value) / currentBalance) - 1) * 100).toFixed(2)
        } else {
          newPct = ''
        }
      }

      return { ...prev, [id]: { pct: newPct, final: newFinal } }
    })
  }

  async function handleSaveUpdates() {
    setSaving(true)
    try {
      const logsToInsert = []
      for (const p of portfolios) {
        const update = updates[p.id]
        if (!update || !update.final || isNaN(Number(update.final))) continue

        const newBal = Number(update.final)
        const oldBal = Number(p.balance)
        const pct = update.pct ? Number(update.pct) : (((newBal / oldBal) - 1) * 100)
        const absChange = newBal - oldBal

        logsToInsert.push({
          portfolio_id: p.id,
          date: todayISO(),
          percentage_change: pct,
          absolute_change: absChange,
          new_balance: newBal,
          type: 'yield' as const,
        })
      }

      if (logsToInsert.length > 0) {
        const { error: logsError } = await supabase.from('portfolio_logs').insert(logsToInsert)
        if (logsError) {
          toast.error('No se pudo registrar la variación. Intentá de nuevo', { duration: 5000 })
          return
        }
        for (const log of logsToInsert) {
          await supabase.from('portfolios').update({ balance: log.new_balance }).eq('id', log.portfolio_id)
        }
        toast.success('Variación registrada')
      }

      setNeedsUpdate(false)
      setUpdates({})
      await fetchData()
      setIsOpen(false)
    } catch (e) {
      console.error(e)
      toast.error('No se pudo registrar la variación. Intentá de nuevo', { duration: 5000 })
    } finally {
      setSaving(false)
    }
  }

  async function handleRescue() {
    if (!rescuePortfolioId) return
    const port = portfolios.find(p => p.id === rescuePortfolioId)
    if (!port) return

    const amount = parseMoneyInput(rescueAmount)
    if (!amount || amount <= 0 || amount > Number(port.balance)) return

    setRescueSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const oldBalance = Number(port.balance)
      const newBalance = oldBalance - amount
      const pct = oldBalance > 0 ? ((newBalance / oldBalance) - 1) * 100 : 0

      // Create portfolio log for the rescue
      const { error: rescueLogError } = await supabase.from('portfolio_logs').insert({
        portfolio_id: port.id,
        date: todayISO(),
        percentage_change: pct,
        absolute_change: -amount,
        new_balance: newBalance,
        type: 'rescue' as const,
      })

      if (rescueLogError) {
        toast.error('No se pudo registrar el rescate. Intentá de nuevo', { duration: 5000 })
        return
      }

      // Update portfolio balance
      const { error: rescueUpdateError } = await supabase.from('portfolios').update({ balance: newBalance }).eq('id', port.id)

      if (rescueUpdateError) {
        toast.error('No se pudo registrar el rescate. Intentá de nuevo', { duration: 5000 })
        return
      }

      toast.success('Rescate registrado')

      // Reset and refresh
      setRescuePortfolioId(null)
      setRescueAmount('')
      await fetchData()
    } catch (e) {
      console.error(e)
      toast.error('No se pudo registrar el rescate. Intentá de nuevo', { duration: 5000 })
    } finally {
      setRescueSaving(false)
    }
  }

  if (loading) return null

  const monthLabel = currentMonthLabel()
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
  const currentYear = new Date().getFullYear()
  const periodLabel = period === 'year' ? `Año ${currentYear}` : capitalizedMonth
  const periodLabelLower = period === 'year' ? 'año' : 'mes'

  // Net rendimientos for the selected period (solo tipo yield, no aportes ni rescates)
  const rendimientosByCurrency = portfolioLogs.reduce((acc, log) => {
    if (resolveLogType(log) !== 'yield') return acc
    const cur = log.portfolio.currency
    acc[cur] = (acc[cur] || 0) + log.absolute_change
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer relative shrink-0"
        title="Actualizar Inversiones"
      >
        <TrendingUp className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Inversiones</span>

        {needsUpdate && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
        )}
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border/60 shadow-2xl shadow-primary/5 rounded-[2rem] p-6 relative flex flex-col max-h-[85vh]">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent opacity-60 pointer-events-none rounded-[2rem]" />

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="mb-5 relative z-10 shrink-0">
              <h2 className="text-[20px] font-bold tracking-tight flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                </div>
                Inversiones
                <span className="text-[13px] font-normal text-muted-foreground ml-1">— {periodLabel}</span>
              </h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                Actualizá tus portfolios y revisá los movimientos del {periodLabelLower}.
              </p>
            </div>

            {/* Tabs */}
            {!isCreating && (
              <div className="flex gap-1 p-1 bg-muted/40 rounded-xl mb-4 shrink-0 relative z-10">
                <button
                  onClick={() => setTab('portfolios')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150',
                    tab === 'portfolios'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Portfolios
                  {needsUpdate && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </button>
                <button
                  onClick={() => setTab('movimientos')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150',
                    tab === 'movimientos'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                  Movimientos
                  {(investTx.length + portfolioLogs.length) > 0 && (
                    <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">
                      {investTx.length + portfolioLogs.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 relative z-10 pr-2 -mr-2 space-y-4">

              {/* ── TAB: PORTFOLIOS ── */}
              {tab === 'portfolios' && (
                <>
                  {portfolios.length === 0 && !isCreating ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                        <TrendingUp className="w-5 h-5 text-muted-foreground/60" />
                      </div>
                      <p className="text-[14px] font-semibold">No tenés portfolios</p>
                      <p className="text-[12px] text-muted-foreground mb-4">Comenzá agregando tu primer broker o fondo.</p>
                      <Button onClick={() => setIsCreating(true)} className="h-9 rounded-xl text-[12px] px-6">
                        Crear Portfolio
                      </Button>
                    </div>
                  ) : isCreating ? (
                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-4">
                      <h3 className="text-[13px] font-semibold">Nuevo Portfolio</h3>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Nombre del Broker / Fondo</Label>
                          <Input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Ej. Balanz, Binance..."
                            className="h-10 text-[13px] rounded-xl bg-background"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Moneda</Label>
                          <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
                            {(['ARS', 'USD'] as const).map(cur => (
                              <button
                                key={cur}
                                type="button"
                                onClick={() => setNewCurrency(cur)}
                                className={cn(
                                  'flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150',
                                  newCurrency === cur
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {cur === 'ARS' ? '$ ARS' : 'U$S USD'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Saldo Inicial ({newCurrency === 'USD' ? 'U$S' : '$'})</Label>
                          <MoneyInput
                            value={newBalance}
                            onChange={setNewBalance}
                            placeholder="0,00"
                            className="h-10 text-[13px] rounded-xl bg-background font-mono tabular-nums"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button onClick={handleCreatePortfolio} disabled={saving || !newName} className="flex-1 h-9 rounded-xl text-[12px]">Guardar</Button>
                          <Button onClick={() => { setIsCreating(false); setNewCurrency(profileCurrency as 'ARS' | 'USD') }} variant="outline" className="h-9 rounded-xl text-[12px]">Cancelar</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {portfolios.map(p => {
                        const update = updates[p.id] || { pct: '', final: '' }
                        const pctNum = update.pct ? Number(update.pct) : null
                        const isPositive = pctNum !== null && pctNum > 0
                        const isNegative = pctNum !== null && pctNum < 0

                        return (
                          <div key={p.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/3 to-transparent pointer-events-none" />
                            <div className="flex justify-between items-center mb-3 relative">
                              <h3 className="text-[14px] font-bold">{p.name}</h3>
                              <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                                {p.currency}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mb-4 text-[13px] relative">
                              <span className="text-muted-foreground">Saldo actual:</span>
                              <span className="font-mono font-semibold">
                                {p.currency === 'USD' ? 'U$S' : '$'} {Number(p.balance).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            {rescuePortfolioId === p.id ? (
                              /* Rescue form */
                              <div className="space-y-3 relative">
                                <div className="space-y-1.5">
                                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Monto a rescatar ({p.currency === 'USD' ? 'U$S' : '$'})</Label>
                                  <MoneyInput
                                    value={rescueAmount}
                                    onChange={setRescueAmount}
                                    placeholder="0,00"
                                    className="h-10 text-[13px] rounded-xl bg-muted/30 font-mono tabular-nums"
                                  />
                                  {rescueAmount && parseMoneyInput(rescueAmount) > Number(p.balance) && (
                                    <p className="text-[11px] text-rose-400">No podés rescatar más del saldo actual.</p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground">Se reduce el saldo del portfolio.</p>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    onClick={handleRescue}
                                    disabled={rescueSaving || !rescueAmount || parseMoneyInput(rescueAmount) <= 0 || parseMoneyInput(rescueAmount) > Number(p.balance)}
                                    className="flex-1 h-9 rounded-xl text-[12px]"
                                  >
                                    {rescueSaving ? 'Rescatando…' : 'Confirmar rescate'}
                                  </Button>
                                  <Button
                                    onClick={() => { setRescuePortfolioId(null); setRescueAmount('') }}
                                    variant="outline"
                                    className="h-9 rounded-xl text-[12px]"
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* Normal variation inputs + rescue button */
                              <>
                                <div className="flex items-center gap-2 relative">
                                  <div className="relative flex-1">
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground font-semibold pointer-events-none">%</span>
                                    <Input
                                      type="number"
                                      value={update.pct}
                                      onChange={e => handleUpdateChange(p.id, 'pct', e.target.value)}
                                      placeholder="Variación"
                                      className={cn(
                                        'h-10 rounded-xl bg-muted/30 text-[13px] font-mono font-semibold focus:bg-background pr-6 transition-colors',
                                        isPositive && 'text-emerald-400 focus:text-emerald-400',
                                        isNegative && 'text-rose-400 focus:text-rose-400',
                                      )}
                                    />
                                  </div>

                                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />

                                  <div className="relative flex-[1.5]">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground font-semibold pointer-events-none">
                                      {p.currency === 'USD' ? 'U$S' : '$'}
                                    </span>
                                    <Input
                                      type="number"
                                      value={update.final}
                                      onChange={e => handleUpdateChange(p.id, 'final', e.target.value)}
                                      placeholder="Saldo de Hoy"
                                      className={cn(
                                        'h-10 rounded-xl bg-muted/30 text-[13px] font-mono font-semibold focus:bg-background transition-colors',
                                        p.currency === 'USD' ? 'pl-11' : 'pl-8'
                                      )}
                                    />
                                  </div>
                                </div>

                                <button
                                  onClick={() => setRescuePortfolioId(p.id)}
                                  className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-orange-400 transition-colors relative"
                                >
                                  <ArrowDownToLine className="w-3 h-3" />
                                  Rescatar
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ── TAB: MOVIMIENTOS ── */}
              {tab === 'movimientos' && (
                <div className="space-y-4">
                  {/* Period selector */}
                  <div className="flex items-center justify-end gap-0.5 p-0.5 bg-muted/40 rounded-lg w-fit ml-auto">
                    {(['month', 'year'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-150',
                          period === p
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {p === 'month' ? 'Mes' : 'Año'}
                      </button>
                    ))}
                  </div>

                  {loadingPeriod && (
                    <div className="space-y-1 animate-in fade-in duration-150">
                      <Skeleton className="h-2.5 w-36 mx-1 mb-2" />
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                          <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <Skeleton className="h-3 w-2/3" />
                            <Skeleton className="h-2.5 w-1/3" />
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Skeleton className="h-3.5 w-16" />
                            <Skeleton className="h-2.5 w-12" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Portfolio logs (daily % updates) */}
                  {!loadingPeriod && portfolioLogs.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Rendimientos del {periodLabelLower}</p>
                      {portfolioLogs.map(log => {
                        const logType = resolveLogType(log)
                        const isRescue = logType === 'rescue'
                        const isDeposit = logType === 'deposit'
                        const isYield = logType === 'yield'
                        const isPos = log.percentage_change > 0
                        const isNeg = log.percentage_change < 0
                        const pctStr = (isPos ? '+' : '') + log.percentage_change.toFixed(2) + '%'
                        const curr = log.portfolio.currency
                        const sym = curr === 'USD' ? 'U$S' : '$'
                        const absSign = log.absolute_change >= 0 ? '+' : '-'
                        const absStr = absSign + sym + ' ' + Math.abs(log.absolute_change).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        const newBalStr = sym + ' ' + Number(log.new_balance).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        const dateStr = new Date(log.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })

                        return (
                          <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                            <div className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                              isRescue && 'bg-orange-500/10',
                              isDeposit && 'bg-sky-500/10',
                              isYield && 'bg-violet-500/10',
                            )}>
                              {isRescue ? (
                                <ArrowDownToLine className="w-3.5 h-3.5 text-orange-400" />
                              ) : isDeposit ? (
                                <ArrowUpToLine className="w-3.5 h-3.5 text-sky-400" />
                              ) : (
                                <span className="text-violet-400 font-bold text-[12px]">
                                  {log.portfolio.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[13px] font-semibold truncate">{log.portfolio.name}</p>
                                {isRescue && (
                                  <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                    RESCATE
                                  </span>
                                )}
                                {isDeposit && (
                                  <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                    APORTE
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">{dateStr} · {newBalStr}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={cn(
                                'text-[13px] font-mono font-bold',
                                isRescue && 'text-orange-400',
                                isDeposit && 'text-sky-400',
                                isYield && isPos && 'text-emerald-400',
                                isYield && isNeg && 'text-rose-400',
                                isYield && !isPos && !isNeg && 'text-muted-foreground',
                              )}>
                                {isYield ? pctStr : absStr}
                              </p>
                              {isYield && (
                                <p className={cn('text-[11px] font-mono', isPos && 'text-emerald-400/70', isNeg && 'text-rose-400/70', !isPos && !isNeg && 'text-muted-foreground')}>
                                  {absStr}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Investment transactions */}
                  {!loadingPeriod && investTx.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Inversiones registradas</p>
                      {investTx.map(tx => {
                        const catColor = tx.category?.color ?? '#8b5cf6'
                        const catName = tx.category?.name ?? 'Inversión'
                        const dateStr = new Date(tx.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
                        const amountStr = formatCurrency(tx.amount, tx.currency)

                        return (
                          <div key={tx.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: catColor + '20' }}
                            >
                              <span style={{ color: catColor }} className="font-bold text-[12px]">
                                {catName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold truncate">{tx.note || catName}</p>
                              <p className="text-[11px] text-muted-foreground">{catName} · {dateStr}</p>
                            </div>
                            <span className="text-[13px] font-mono font-semibold text-violet-400 shrink-0">
                              +{amountStr}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {!loadingPeriod && portfolioLogs.length === 0 && investTx.length === 0 && (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                        <List className="w-5 h-5 text-muted-foreground/60" />
                      </div>
                      <p className="text-[14px] font-semibold">Sin movimientos</p>
                      <p className="text-[12px] text-muted-foreground">No hay inversiones registradas este {periodLabelLower}.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rendimientos summary (movimientos tab) */}
            {tab === 'movimientos' && !loadingPeriod && portfolioLogs.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/40 shrink-0 relative z-10 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Neto del {periodLabelLower}
                </span>
                <div className="flex items-center gap-2.5 flex-wrap justify-end">
                  {(['ARS', 'USD'] as const).map(cur => {
                    const val = rendimientosByCurrency[cur]
                    if (!val) return null
                    const isPos = val >= 0
                    const sym = cur === 'USD' ? 'U$S' : '$'
                    return (
                      <span
                        key={cur}
                        className={cn(
                          'font-mono text-[12px] font-bold tabular-nums',
                          isPos ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {isPos ? '+' : '-'}{sym} {Math.abs(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )
                  })}
                  {!rendimientosByCurrency.ARS && !rendimientosByCurrency.USD && (
                    <span className="font-mono text-[12px] font-bold tabular-nums text-muted-foreground">
                      $ 0,00
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-border/50 shrink-0 relative z-10 flex items-center justify-between">
              {tab === 'portfolios' && portfolios.length > 0 && !isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo
                </button>
              )}

              {tab === 'portfolios' && portfolios.length > 0 && !isCreating && (
                <Button
                  onClick={handleSaveUpdates}
                  disabled={saving || Object.keys(updates).length === 0 || Object.values(updates).every(u => !u.final)}
                  className="h-10 rounded-xl px-8 text-[13px] font-semibold ml-auto"
                >
                  {saving ? 'Guardando…' : 'Finalizar Día'}
                </Button>
              )}

              {tab === 'movimientos' && (
                <button
                  onClick={() => {
                    setIsOpen(false)
                    window.dispatchEvent(new CustomEvent('open-quick-add'))
                  }}
                  className="text-[12px] font-semibold text-muted-foreground hover:text-violet-400 transition-colors flex items-center gap-1 ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar inversión
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
