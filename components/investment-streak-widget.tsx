'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { isNonTradingDay } from '@/lib/ar-holidays'
import { computeStreak, toISO } from '@/lib/investment-streak'

export default function InvestmentStreakWidget() {
  const [streak, setStreak] = useState(0)
  const [pendingToday, setPendingToday] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchStreak() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoaded(true)
        return
      }

      const since = new Date()
      since.setDate(since.getDate() - 90)

      const { data } = await supabase
        .from('portfolio_logs')
        .select('date')
        .gte('date', toISO(since))
        .order('date', { ascending: false })

      const dateSet = new Set<string>()
      if (data) {
        for (const row of data) {
          dateSet.add(row.date)
        }
      }

      const result = computeStreak(dateSet, new Date(), isNonTradingDay)
      setStreak(result.streak)
      setPendingToday(result.pendingToday)
      setLoaded(true)
    }

    fetchStreak()
  }, [])

  if (!loaded) return null
  if (streak === 0 && !pendingToday) return null

  const isEpic = streak >= 30
  const isHot = streak >= 5
  const emoji = isEpic ? '✨' : '🔥'

  const tooltip = pendingToday
    ? `${streak} días — ¡Cargá el día de hoy para mantener la racha!`
    : `${streak} días consecutivos cargando inversiones`

  function handleClick() {
    window.dispatchEvent(new CustomEvent('open-portfolio-widget'))
  }

  return (
    <div
      role="button"
      tabIndex={0}
      title={tooltip}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={cn(
        'hidden md:flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-xs font-semibold shrink-0 select-none cursor-pointer transition-all duration-150 hover:bg-muted',
        pendingToday && 'border border-amber-500/50 animate-pulse',
        isEpic && 'shadow-[0_0_8px_rgba(251,191,36,0.3)]'
      )}
    >
      <span>{emoji}</span>
      <span className={cn(isHot && 'text-amber-400')}>
        {streak}
      </span>
    </div>
  )
}
