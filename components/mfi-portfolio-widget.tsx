'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { TrendingUp, Plus, X, ArrowRight, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput, parseMoneyInput } from '@/components/money-input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Portfolio } from '@/lib/types'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function MfiPortfolioWidget({ profileCurrency }: { profileCurrency: string }) {
  const supabase = createClient()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [needsUpdate, setNeedsUpdate] = useState(false)
  const [saving, setSaving] = useState(false)

  // Creation state
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBalance, setNewBalance] = useState('')

  // Update state (keyed by portfolio id)
  const [updates, setUpdates] = useState<Record<string, { pct: string; final: string }>>({})

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [portfoliosRes, logsRes] = await Promise.all([
      supabase.from('portfolios').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('portfolio_logs').select('*', { count: 'exact', head: true }).eq('date', todayISO())
    ])

    const ports = (portfoliosRes.data || []) as Portfolio[]
    setPortfolios(ports)
    
    // Check if it's after 17:00
    const nowLocal = new Date()
    const isPast17 = nowLocal.getHours() >= 17
    
    // Needs update if there are portfolios, no logs today, and it's past 17:00
    // We can also just show it if there are 0 logs today regardless of time, but specifically pulse after 17:00.
    const hasLogsToday = (logsRes.count || 0) > 0
    if (ports.length > 0 && !hasLogsToday && isPast17) {
      setNeedsUpdate(true)
    } else {
      setNeedsUpdate(false)
    }

    setLoading(false)
  }

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
        currency: profileCurrency,
        balance: parseMoneyInput(newBalance)
      })
      .select()
      .single()

    if (!error && data) {
      setPortfolios([...portfolios, data as Portfolio])
      setIsCreating(false)
      setNewName('')
      setNewBalance('')
    }
    setSaving(false)
  }

  // Handle calculating one field based on the other
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
          const pctVal = Number(value)
          newFinal = (currentBalance * (1 + (pctVal / 100))).toFixed(2)
        } else {
          newFinal = ''
        }
      } else {
        newFinal = value
        if (value && !isNaN(Number(value)) && currentBalance > 0) {
          const finalVal = Number(value)
          newPct = (((finalVal / currentBalance) - 1) * 100).toFixed(2)
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
          new_balance: newBal
        })
      }

      if (logsToInsert.length > 0) {
        await supabase.from('portfolio_logs').insert(logsToInsert)
        
        // Update portfolio balances
        for (const log of logsToInsert) {
          await supabase.from('portfolios').update({ balance: log.new_balance }).eq('id', log.portfolio_id)
        }
      }
      
      setNeedsUpdate(false)
      setIsOpen(false)
      setUpdates({})
      await fetchData() // Refresh
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-colors hover:bg-muted/50 text-muted-foreground hover:text-foreground relative group"
        title="Actualizar Inversiones"
      >
        <TrendingUp className="w-4 h-4" />
        <span className="hidden xs:inline">Inversiones</span>
        
        {/* Blue dot indicator */}
        {needsUpdate && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
        )}
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border/60 shadow-2xl shadow-primary/5 rounded-[2rem] p-6 relative flex flex-col max-h-[90vh]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
            
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6 relative z-10 shrink-0">
              <h2 className="text-[20px] font-bold tracking-tight flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Tus Inversiones
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                Actualizá el rendimiento de tus fondos al cierre del mercado.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 relative z-10 pr-2 -mr-2 space-y-4">
              {portfolios.length === 0 && !isCreating ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-[14px] font-semibold">No tenés inversiones</p>
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
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Saldo Inicial ({profileCurrency})</Label>
                      <MoneyInput
                        value={newBalance}
                        onChange={setNewBalance}
                        placeholder="0,00"
                        className="h-10 text-[13px] rounded-xl bg-background font-mono tabular-nums"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleCreatePortfolio} disabled={saving || !newName} className="flex-1 h-9 rounded-xl text-[12px]">Guardar</Button>
                      <Button onClick={() => setIsCreating(false)} variant="outline" className="h-9 rounded-xl text-[12px]">Cancelar</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {portfolios.map(p => {
                    const update = updates[p.id] || { pct: '', final: '' }
                    return (
                      <div key={p.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-[14px] font-bold">{p.name}</h3>
                          <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                            {p.currency}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-4 text-[13px]">
                          <span className="text-muted-foreground">Saldo actual:</span>
                          <span className="font-mono font-semibold">${Number(p.balance).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground font-semibold pointer-events-none">%</span>
                            <Input
                              type="number"
                              value={update.pct}
                              onChange={e => handleUpdateChange(p.id, 'pct', e.target.value)}
                              placeholder="Variación"
                              className="h-10 rounded-xl bg-muted/30 text-[13px] font-mono font-semibold focus:bg-background pr-6 transition-colors"
                            />
                          </div>
                          
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          
                          <div className="relative flex-[1.5]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground font-semibold pointer-events-none">$</span>
                            <Input
                              type="number"
                              value={update.final}
                              onChange={e => handleUpdateChange(p.id, 'final', e.target.value)}
                              placeholder="Saldo de Hoy"
                              className="h-10 rounded-xl bg-muted/30 text-[13px] font-mono font-semibold focus:bg-background pl-6 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border/50 shrink-0 relative z-10 flex items-center justify-between">
              {portfolios.length > 0 && !isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo
                </button>
              )}
              
              {portfolios.length > 0 && !isCreating && (
                <Button
                  onClick={handleSaveUpdates}
                  disabled={saving || Object.keys(updates).length === 0 || Object.values(updates).every(u => !u.final)}
                  className="h-10 rounded-xl px-8 text-[13px] font-semibold ml-auto"
                >
                  {saving ? 'Guardando…' : 'Finalizar Día'}
                </Button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
