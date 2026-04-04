'use client'

import useSWR from 'swr'
import { useState, useCallback, useRef, useEffect } from 'react'

interface UsePollingOptions<T> {
  /** Unique key for SWR cache and sessionStorage */
  key: string
  /** The fetch function — returns data or throws */
  fetcher: () => Promise<T>
  /** Polling interval in ms (default 5min) */
  intervalMs?: number
  /** sessionStorage cache key (null = no sessionStorage) */
  cacheKey?: string | null
  /** sessionStorage TTL in ms (default = intervalMs) */
  cacheTtlMs?: number
}

interface UsePollingResult<T> {
  data: T | null
  isLoading: boolean
  isStale: boolean
  lastUpdated: Date | null
  /** Manual refetch — returns a promise. Respects cooldown. */
  refetch: () => Promise<void>
  /** True if manual refresh is on cooldown */
  onCooldown: boolean
  /** Seconds remaining on cooldown (0 when not on cooldown) */
  cooldownRemaining: number
}

const COOLDOWN_MS = 30_000

function readSessionCache<T>(key: string): { data: T; timestamp: number } | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeSessionCache<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // quota exceeded
  }
}

export function usePolling<T>({
  key,
  fetcher,
  intervalMs = 5 * 60 * 1000,
  cacheKey = null,
  cacheTtlMs,
}: UsePollingOptions<T>): UsePollingResult<T> {
  const ttl = cacheTtlMs ?? intervalMs
  const [cooldownEnd, setCooldownEnd] = useState<number>(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const tickTimer = useRef<ReturnType<typeof setInterval>>(null)

  // Wrapped fetcher: try network, fallback to sessionStorage
  const wrappedFetcher = useCallback(async () => {
    try {
      const result = await fetcher()
      if (cacheKey) writeSessionCache(cacheKey, result)
      setLastUpdated(new Date())
      return result
    } catch (err) {
      // Fallback to session cache
      if (cacheKey) {
        const cached = readSessionCache<T>(cacheKey)
        if (cached && Date.now() - cached.timestamp < ttl * 3) {
          setLastUpdated(new Date(cached.timestamp))
          return cached.data
        }
      }
      throw err
    }
  }, [fetcher, cacheKey, ttl])

  const { data, isLoading, isValidating, mutate } = useSWR<T>(
    key,
    wrappedFetcher,
    {
      refreshInterval: intervalMs,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10_000,
      errorRetryCount: 2,
      // SWR natively pauses refreshInterval when tab is hidden
    },
  )

  const isStale = !!(data && !isValidating && lastUpdated && Date.now() - lastUpdated.getTime() > ttl)

  const onCooldown = cooldownRemaining > 0

  const refetch = useCallback(async () => {
    if (cooldownEnd > Date.now()) return
    const end = Date.now() + COOLDOWN_MS
    setCooldownEnd(end)
    setCooldownRemaining(Math.ceil(COOLDOWN_MS / 1000))
    await mutate()
  }, [cooldownEnd, mutate])

  // Tick the countdown every second while on cooldown
  useEffect(() => {
    if (cooldownEnd <= Date.now()) return
    tickTimer.current = setInterval(() => {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000)
      if (remaining <= 0) {
        setCooldownRemaining(0)
        setCooldownEnd(0)
        if (tickTimer.current) clearInterval(tickTimer.current)
      } else {
        setCooldownRemaining(remaining)
      }
    }, 1000)
    return () => { if (tickTimer.current) clearInterval(tickTimer.current) }
  }, [cooldownEnd])

  return {
    data: data ?? null,
    isLoading: isLoading && !data,
    isStale,
    lastUpdated,
    refetch,
    onCooldown,
    cooldownRemaining,
  }
}
