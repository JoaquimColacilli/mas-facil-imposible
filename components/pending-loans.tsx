'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Loan, PublicProfile } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { liveFormatMoney, parseMoneyInput, formatMoneyInput } from '@/components/money-input'
import { FriendPicker } from '@/components/friend-picker'
import { LinkedBadge } from '@/components/linked-badge'
import { UserHoverCard } from '@/components/user-hover-card'
import { SettlePropagateDialog } from '@/components/settle-propagate-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Handshake,
  Plus,
  Check,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  Clock,
  Loader2,
  History,
} from 'lucide-react'
import { toast } from 'sonner'

interface PendingLoansProps {
  initialLoans: Loan[]
  currency: 'ARS' | 'USD'
  onResolved?: () => void
}

function AddLoanForm({
  currency,
  onSave,
  onCancel,
}: {
  currency: 'ARS' | 'USD'
  onSave: (loan: Loan) => void
  onCancel: () => void
}) {
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [curr, setCurr] = useState<'ARS' | 'USD'>(currency)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [friendId, setFriendId] = useState<string | null>(null)
  const [friendName, setFriendName] = useState<string | null>(null)
  const [notifyFriend, setNotifyFriend] = useState(true)

  async function handleSave() {
    const effectiveName = friendId ? (friendName ?? 'amigo') : personName.trim()
    if (!effectiveName || parseMoneyInput(amount) <= 0) {
      setError(friendId ? 'Completá el monto' : 'Completá nombre y monto')
      return
    }
    setSaving(true)
    setError(null)

    const { createLoan } = await import('@/app/(app)/dashboard/actions')
    const { data, error: err } = await createLoan({
      person_name: effectiveName,
      amount: parseMoneyInput(amount),
      currency: curr,
      note: note.trim() || null,
      date,
      friend_id: friendId,
      notify_friend: friendId ? notifyFriend : false,
    })

    setSaving(false)
    if (err && !data) {
      setError(err)
      toast.error('No se pudo registrar. Intentá de nuevo.', { duration: 5000 })
      return
    }
    if (err && data) {
      // Loan guardado, pero la notif falló. Guardamos igual con warning.
      toast.warning(err, { duration: 5000 })
      onSave(data)
      return
    }
    if (data) {
      toast.success(friendId && notifyFriend ? 'Cobro registrado · Solicitud enviada' : 'Cobro registrado')
      // Realtime (Fase 7): notificar al amigo si hubo request.
      if (friendId && notifyFriend) {
        const { broadcastSocialEvent } = await import('@/lib/social/broadcast')
        const supabase = createClient()
        const { data: { user: viewer } } = await supabase.auth.getUser()
        if (viewer) {
          await broadcastSocialEvent(friendId, 'linked_loan_request_received', {
            loan_id: data.id,
            from_user_id: viewer.id,
          })
        }
      }
      onSave(data)
    }
  }

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition-shadow'

  return (
    <div className="p-3 border-t border-border bg-muted/20 flex flex-col gap-2">
      <FriendPicker
        value={friendId}
        onChange={(id, friend) => {
          setFriendId(id)
          setFriendName(friend?.nickname ?? friend?.username ?? null)
        }}
      />
      {!friendId && (
        <input
          className={inputCls}
          placeholder="Nombre (ej. Martín)"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          autoFocus
        />
      )}
      <div className="flex gap-2">
        <input
          className={cn(inputCls, 'flex-1')}
          type="text"
          inputMode="decimal"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(liveFormatMoney(e.target.value))}
          autoFocus={!!friendId}
        />
        <select
          className={cn(inputCls, 'w-20 shrink-0')}
          value={curr}
          onChange={(e) => setCurr(e.target.value as 'ARS' | 'USD')}
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <input
        className={inputCls}
        placeholder="Nota (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <input
        className={inputCls}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      {friendId && (
        <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notifyFriend}
            onChange={(e) => setNotifyFriend(e.target.checked)}
            className="w-3 h-3 cursor-pointer"
          />
          <span>Notificar a @{friendName ?? 'amigo'} para que confirme</span>
        </label>
      )}
      {error && <p className="text-[11px] text-rose-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-7 text-[11px] rounded-lg"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-7 text-[11px] rounded-lg px-2"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

function LoanRow({
  loan,
  onMarkPaid,
  onEdit,
  onDelete,
  loadingId,
  friendMap,
}: {
  loan: Loan
  onMarkPaid: (id: string) => void
  onEdit: (loan: Loan) => void
  onDelete: (id: string) => void
  loadingId: string | null
  friendMap: Map<string, PublicProfile>
}) {
  const [confirming, setConfirming] = useState(false)
  const isLoading = loadingId === loan.id

  return (
    <div className={cn(
      'group flex items-start gap-2.5 px-3 py-2.5 border-b border-border last:border-0 transition-colors duration-100 hover:bg-muted/20',
      loan.paid && 'opacity-50',
      isLoading && 'opacity-60 pointer-events-none',
    )}>
      {/* Status dot / loading */}
      <button
        onClick={() => !loan.paid && !isLoading && onMarkPaid(loan.id)}
        title={loan.paid ? 'Cobrado' : 'Marcar como cobrado'}
        disabled={isLoading}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150',
          isLoading
            ? 'border-amber-500/50 bg-amber-500/10'
            : loan.paid
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-border hover:border-emerald-500 hover:bg-emerald-500/10',
        )}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
        ) : loan.paid ? (
          <Check className="w-3 h-3" />
        ) : null}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {loan.friend_id ? (
          <UserHoverCard
            userId={loan.friend_id}
            username={friendMap.get(loan.friend_id)?.username ?? undefined}
          >
            <p className={cn('text-[12.5px] font-semibold text-foreground leading-none truncate cursor-pointer', loan.paid && 'line-through')}>
              @{friendMap.get(loan.friend_id)?.username ?? loan.person_name}
            </p>
          </UserHoverCard>
        ) : (
          <p className={cn('text-[12.5px] font-semibold text-foreground leading-none truncate', loan.paid && 'line-through')}>
            {loan.person_name}
          </p>
        )}
        {loan.friend_id && (
          <LinkedBadge
            friendId={loan.friend_id}
            linkedId={loan.linked_debt_id}
            paid={loan.paid}
            friendUsername={friendMap.get(loan.friend_id)?.username ?? null}
            className="self-start max-w-full"
          />
        )}
        <p className="text-[10.5px] text-muted-foreground leading-none truncate">
          {loan.note ? `${loan.note} · ` : ''}
          {formatDate(loan.date)}
        </p>
      </div>

      {/* Right column: amount on top, actions below on hover (space reserved) */}
      <div className="flex flex-col items-end gap-1 shrink-0 min-h-[32px]">
        <span className="text-[12px] font-bold font-mono tabular-nums text-amber-500 leading-none">
          {formatCurrency(loan.amount, loan.currency)}
        </span>
        {!isLoading && (
          <div className="h-5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
            {!loan.paid && (
              <button
                onClick={() => onEdit(loan)}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="w-2.5 h-2.5" />
              </button>
            )}
            {confirming ? (
              <>
                <button
                  onClick={() => { onDelete(loan.id); setConfirming(false) }}
                  className="w-5 h-5 rounded flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Check className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function PendingLoans({ initialLoans, currency, onResolved }: PendingLoansProps) {
  const [loans, setLoans] = useState<Loan[]>(initialLoans)
  const [showAdd, setShowAdd] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [friendMap, setFriendMap] = useState<Map<string, PublicProfile>>(new Map())
  const [settleDialog, setSettleDialog] = useState<{ loan: Loan } | null>(null)
  const [settleLoading, setSettleLoading] = useState(false)

  // Sync state when router.refresh() re-hydrates with fresh server data
  // (p.ej. cuando un amigo confirma y llega linked_loan_request_accepted via realtime).
  useEffect(() => {
    setLoans(initialLoans)
  }, [initialLoans])

  // Resolve friend profiles for rows that have friend_id — small, lazy.
  useEffect(() => {
    const ids = Array.from(new Set(loans.map((l) => l.friend_id).filter(Boolean) as string[]))
    const missing = ids.filter((id) => !friendMap.has(id))
    if (missing.length === 0) return
    const supabase = createClient()
    supabase
      .from('friends_visible_profiles')
      .select('id, username, nickname, avatar_url, bio, is_discoverable, last_seen_at, created_at')
      .in('id', missing)
      .then(({ data }) => {
        if (!data) return
        setFriendMap((prev) => {
          const next = new Map(prev)
          for (const p of data as PublicProfile[]) next.set(p.id, p)
          return next
        })
      })
  }, [loans, friendMap])

  const pending = loans.filter((l) => !l.paid)
  const paid    = loans.filter((l) => l.paid)
  const totalPending = pending.reduce((s, l) => l.currency === currency ? s + l.amount : s, 0)

  async function doMarkPaid(loan: Loan, propagate: boolean) {
    setLoadingId(loan.id)
    const { markLoanPaid } = await import('@/app/(app)/dashboard/actions')
    const { data } = await markLoanPaid(loan.id)
    if (data) setLoans((prev) => prev.map((l) => l.id === loan.id ? data : l))

    if (loan.linked_debt_id && propagate) {
      const { propagateSettleToLinked } = await import('@/app/(app)/dashboard/social-actions')
      const res = await propagateSettleToLinked('loan', loan.id)
      if (!res.ok) toast.warning(`Saldado local, pero no se propagó: ${res.error}`)
    }

    setLoadingId(null)
    if (data) {
      toast.success(
        loan.linked_debt_id && propagate
          ? 'Saldado y propagado a tu amigo'
          : 'Cobro registrado como ingreso',
      )
      onResolved?.()
    }
  }

  function handleMarkPaid(id: string) {
    const loan = loans.find((l) => l.id === id)
    if (!loan) return
    // Linked → pedí confirmación del propagate. Legacy (sin linked) → directo.
    if (loan.linked_debt_id) {
      setSettleDialog({ loan })
      return
    }
    doMarkPaid(loan, false)
  }

  async function handleDelete(id: string) {
    const loan = loans.find((l) => l.id === id)
    const { deleteLoan } = await import('@/app/(app)/dashboard/actions')
    const { error } = await deleteLoan(id)
    if (error) { toast.error('No se pudo eliminar. Intentá de nuevo.', { duration: 5000 }); return }
    setLoans((prev) => prev.filter((l) => l.id !== id))
    toast.success('Cobro eliminado')
    if (loan?.paid) onResolved?.()
  }

  function handleAdded(loan: Loan) {
    setLoans((prev) => [loan, ...prev])
    setShowAdd(false)
  }

  function handleEdited(updated: Loan) {
    setLoans((prev) => prev.map((l) => l.id === updated.id ? updated : l))
    setEditingLoan(null)
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden animate-fade-in-up flex flex-col" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Handshake className="w-3.5 h-3.5 text-amber-500" />
            <h2 className="text-[11px] font-bold text-muted-foreground tracking-[0.1em] uppercase">Cobros pendientes</h2>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditingLoan(null) }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-100"
            title="Agregar préstamo"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total */}
        {pending.length > 0 && (
          <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/15 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-500/80">
              <Clock className="w-3 h-3" />
              <span>{pending.length} pendiente{pending.length !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-[12px] font-bold font-mono tabular-nums text-amber-500">
              {formatCurrency(totalPending, currency)}
            </span>
          </div>
        )}

        {/* Rows — only pending */}
        <div className="flex flex-col overflow-y-auto max-h-[220px]">
          {pending.length === 0 && !showAdd ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center px-4">
              <Handshake className="w-7 h-7 text-muted-foreground/30" />
              <p className="text-[12px] text-muted-foreground">Sin cobros pendientes</p>
            </div>
          ) : (
            pending.map((l) =>
              editingLoan?.id === l.id ? (
                <EditLoanInline
                  key={l.id}
                  loan={l}
                  onSave={handleEdited}
                  onCancel={() => setEditingLoan(null)}
                  friendMap={friendMap}
                />
              ) : (
                <LoanRow
                  key={l.id}
                  loan={l}
                  onMarkPaid={handleMarkPaid}
                  onEdit={setEditingLoan}
                  onDelete={handleDelete}
                  loadingId={loadingId}
                  friendMap={friendMap}
                />
              ),
            )
          )}
        </div>

        {/* Ver todos button */}
        {paid.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border-t border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <History className="w-3 h-3" />
            Ver todos ({paid.length} cobrado{paid.length !== 1 ? 's' : ''})
          </button>
        )}

        {/* Add form */}
        {showAdd && (
          <AddLoanForm
            currency={currency}
            onSave={handleAdded}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </div>

      {/* History modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-[14px] font-semibold flex items-center gap-2">
              <Handshake className="w-4 h-4 text-amber-500" />
              Historial de cobros
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col overflow-y-auto border-t border-border">
            {/* Pending section */}
            {pending.length > 0 && (
              <>
                <div className="px-4 py-2 text-[10px] font-semibold text-amber-500/80 uppercase tracking-wider bg-amber-500/5">
                  Pendientes ({pending.length})
                </div>
                {pending.map((l) => (
                  <LoanRow
                    key={l.id}
                    loan={l}
                    onMarkPaid={handleMarkPaid}
                    onEdit={(loan) => { setEditingLoan(loan); setShowHistory(false) }}
                    onDelete={handleDelete}
                    loadingId={loadingId}
                    friendMap={friendMap}
                  />
                ))}
              </>
            )}
            {/* Paid section */}
            {paid.length > 0 && (
              <>
                <div className="px-4 py-2 text-[10px] font-semibold text-emerald-500/80 uppercase tracking-wider bg-emerald-500/5">
                  Cobrados ({paid.length})
                </div>
                {paid.map((l) => (
                  <LoanRow
                    key={l.id}
                    loan={l}
                    onMarkPaid={handleMarkPaid}
                    onEdit={setEditingLoan}
                    onDelete={handleDelete}
                    loadingId={loadingId}
                    friendMap={friendMap}
                  />
                ))}
              </>
            )}
            {loans.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
                <Handshake className="w-7 h-7 text-muted-foreground/30" />
                <p className="text-[12px] text-muted-foreground">Sin cobros registrados</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settle + propagate dialog */}
      {settleDialog && (
        <SettlePropagateDialog
          open
          onOpenChange={(o) => !o && !settleLoading && setSettleDialog(null)}
          kind="loan"
          friendUsername={
            settleDialog.loan.friend_id
              ? friendMap.get(settleDialog.loan.friend_id)?.username ?? null
              : null
          }
          loading={settleLoading}
          onConfirm={async (propagate) => {
            setSettleLoading(true)
            await doMarkPaid(settleDialog.loan, propagate)
            setSettleLoading(false)
            setSettleDialog(null)
          }}
        />
      )}
    </>
  )
}

function EditLoanInline({
  loan,
  onSave,
  onCancel,
  friendMap,
}: {
  loan: Loan
  onSave: (updated: Loan) => void
  onCancel: () => void
  friendMap: Map<string, PublicProfile>
}) {
  const [personName, setPersonName] = useState(loan.person_name)
  const [amount, setAmount] = useState(formatMoneyInput(loan.amount))
  const [curr, setCurr] = useState<'ARS' | 'USD'>(loan.currency)
  const [note, setNote] = useState(loan.note ?? '')
  const [date, setDate] = useState(loan.date)
  const [saving, setSaving] = useState(false)
  const [friendId, setFriendId] = useState<string | null>(loan.friend_id)
  const [notifyFriend, setNotifyFriend] = useState(false)
  const initialFriend = loan.friend_id ? friendMap.get(loan.friend_id) ?? null : null
  const isLinkedConfirmed = !!loan.linked_debt_id
  const friendUsername = friendId ? friendMap.get(friendId)?.username ?? null : null

  async function handleSave() {
    const effectiveName = friendId ? (friendUsername ?? personName.trim() ?? 'amigo') : personName.trim()
    if (!effectiveName || parseMoneyInput(amount) <= 0) return
    setSaving(true)
    const { updateLoan } = await import('@/app/(app)/dashboard/actions')
    const { data, error } = await updateLoan({
      id: loan.id,
      person_name: effectiveName,
      amount: parseMoneyInput(amount),
      currency: curr,
      note: note.trim() || null,
      friend_id: friendId,
      notify_friend: friendId && !loan.linked_debt_id ? notifyFriend : false,
      date,
    })
    setSaving(false)
    if (error && !data) { toast.error(error); return }
    if (data) { toast.success('Cobro actualizado'); onSave(data) }
  }

  const inputCls = 'w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition-shadow'

  return (
    <div className="p-3 border-b border-border bg-muted/20 flex flex-col gap-2">
      <FriendPicker
        value={friendId}
        onChange={(id) => setFriendId(id)}
        disabled={isLinkedConfirmed}
        disabledHint="No podés cambiar el amigo de un cobro ya confirmado. Eliminá y creá uno nuevo."
        initialFriend={initialFriend}
      />
      {!friendId && (
        <input className={inputCls} value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Nombre" autoFocus />
      )}
      <div className="flex gap-2">
        <input className={cn(inputCls, 'flex-1')} type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(liveFormatMoney(e.target.value))} />
        <select className={cn(inputCls, 'w-20 shrink-0')} value={curr} onChange={(e) => setCurr(e.target.value as 'ARS' | 'USD')}>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" />
      <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {friendId && !isLinkedConfirmed && friendId !== loan.friend_id && (
        <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notifyFriend}
            onChange={(e) => setNotifyFriend(e.target.checked)}
            className="w-3 h-3 cursor-pointer"
          />
          <span>Notificar a @{friendUsername ?? 'amigo'} para que confirme</span>
        </label>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 h-7 text-[11px] rounded-lg">
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-[11px] rounded-lg px-2">
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
