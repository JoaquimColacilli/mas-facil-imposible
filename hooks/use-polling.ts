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
  /** True if manual refresh is on cooldown (30s) */
  onCooldown: boolean
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
  const [onCooldown, setOnCooldown] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const cooldownTimer = useRef<ReturnType<typeof setTimeout>>()

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

  const refetch = useCallback(async () => {
    if (onCooldown) return
    setOnCooldown(true)
    cooldownTimer.current = setTimeout(() => setOnCooldown(false), COOLDOWN_MS)
    await mutate()
  }, [onCooldown, mutate])

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
    }
  }, [])

  return {
    data: data ?? null,
    isLoading: isLoading && !data,
    isStale,
    lastUpdated,
    refetch,
    onCooldown,
  }
}
