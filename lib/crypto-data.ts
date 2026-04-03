// ---------------------------------------------------------------------------
// crypto-data.ts — CoinGecko fetch & parse logic (pure TS, no React)
// ---------------------------------------------------------------------------

// ---- Types ----------------------------------------------------------------

export interface CryptoQuote {
  id: string
  symbol: string
  name: string
  price: number
  changePercent24h: number
  sparkline7d: number[]
  marketCap: number
  image: string
}

export interface CryptoData {
  hero: CryptoQuote
  coins: CryptoQuote[]
}

// ---- Constants ------------------------------------------------------------

export const CRYPTO_IDS = [
  'bitcoin',
  'ethereum',
  'solana',
  'ripple',
  'cardano',
  'dogecoin',
  'polkadot',
  'chainlink',
] as const

export const CRYPTO_SYMBOLS: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  ripple: 'XRP',
  cardano: 'ADA',
  dogecoin: 'DOGE',
  polkadot: 'DOT',
  chainlink: 'LINK',
}

export const DEFAULT_VISIBLE_CRYPTO = 4

// ---- Parsing --------------------------------------------------------------

export function parseCoinGeckoResponse(data: any[]): CryptoData | null {
  if (!Array.isArray(data)) return null

  const quotes: CryptoQuote[] = data.map((item) => ({
    id: item.id,
    symbol: CRYPTO_SYMBOLS[item.id] ?? item.symbol?.toUpperCase() ?? '',
    name: item.name,
    price: item.current_price,
    changePercent24h: item.price_change_percentage_24h ?? 0,
    sparkline7d: Array.isArray(item.sparkline_in_7d?.price)
      ? (item.sparkline_in_7d.price as any[]).filter(
          (v: unknown) => v !== null && v !== undefined,
        )
      : [],
    marketCap: item.market_cap ?? 0,
    image: item.image ?? '',
  }))

  const heroIndex = quotes.findIndex((q) => q.id === 'bitcoin')
  if (heroIndex === -1) return null

  const hero = quotes[heroIndex]
  const coins = quotes.filter((_, i) => i !== heroIndex)

  return { hero, coins }
}

// ---- Fetching -------------------------------------------------------------

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/coins/markets'

export async function fetchCryptoData(): Promise<CryptoData | null> {
  try {
    const params = new URLSearchParams({
      vs_currency: 'usd',
      ids: CRYPTO_IDS.join(','),
      order: 'market_cap_desc',
      sparkline: 'true',
      price_change_percentage: '24h',
    })

    const res = await fetch(`${COINGECKO_URL}?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    return parseCoinGeckoResponse(json)
  } catch {
    return null
  }
}
