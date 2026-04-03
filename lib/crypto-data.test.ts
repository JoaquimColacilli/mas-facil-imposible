import { describe, it, expect } from 'vitest'
import { parseCoinGeckoResponse } from './crypto-data'

const SAMPLE_RESPONSE = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    current_price: 68500.12,
    market_cap: 1345000000000,
    price_change_percentage_24h: 2.35,
    sparkline_in_7d: {
      price: [67000, 67200, null, 67500, 68000, 68500],
    },
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    current_price: 3450.78,
    market_cap: 415000000000,
    price_change_percentage_24h: -1.15,
    sparkline_in_7d: {
      price: [3400, 3420, 3450, 3430, 3450],
    },
  },
  {
    id: 'solana',
    symbol: 'sol',
    name: 'Solana',
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    current_price: 145.3,
    market_cap: 63000000000,
    price_change_percentage_24h: 5.2,
    sparkline_in_7d: {
      price: [138, 140, 142, 145],
    },
  },
]

describe('parseCoinGeckoResponse', () => {
  it('Respuesta válida → extrae hero (Bitcoin) y coins correctamente', () => {
    const result = parseCoinGeckoResponse(SAMPLE_RESPONSE)

    expect(result).not.toBeNull()

    // Hero assertions
    expect(result!.hero.id).toBe('bitcoin')
    expect(result!.hero.symbol).toBe('BTC')
    expect(result!.hero.price).toBe(68500.12)
    expect(result!.hero.changePercent24h).toBe(2.35)
    // Original sparkline has 6 entries with 1 null → 5 after filtering
    expect(result!.hero.sparkline7d).toHaveLength(5)

    // Coins assertions
    expect(result!.coins).toHaveLength(2)
    expect(result!.coins[0].symbol).toBe('ETH')
    expect(result!.coins[1].symbol).toBe('SOL')
  })

  it('Sin Bitcoin → retorna null', () => {
    const withoutBitcoin = SAMPLE_RESPONSE.filter((c) => c.id !== 'bitcoin')
    const result = parseCoinGeckoResponse(withoutBitcoin)

    expect(result).toBeNull()
  })

  it('Array vacío → retorna null', () => {
    const result = parseCoinGeckoResponse([])

    expect(result).toBeNull()
  })

  it('Input no es array → retorna null', () => {
    expect(parseCoinGeckoResponse(null as any)).toBeNull()
    expect(parseCoinGeckoResponse(undefined as any)).toBeNull()
    expect(parseCoinGeckoResponse({} as any)).toBeNull()
    expect(parseCoinGeckoResponse('string' as any)).toBeNull()
    expect(parseCoinGeckoResponse(42 as any)).toBeNull()
  })

  it('Sparkline faltante → array vacío', () => {
    const btcNoSparkline = [
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        current_price: 68500.12,
        market_cap: 1345000000000,
        price_change_percentage_24h: 2.35,
        // no sparkline_in_7d field
      },
    ]

    const result = parseCoinGeckoResponse(btcNoSparkline)

    expect(result).not.toBeNull()
    expect(result!.hero.sparkline7d).toEqual([])
  })

  it('price_change_percentage_24h null → defaults to 0', () => {
    const btcNullChange = [
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        current_price: 68500.12,
        market_cap: 1345000000000,
        price_change_percentage_24h: null,
        sparkline_in_7d: {
          price: [67000, 67200],
        },
      },
    ]

    const result = parseCoinGeckoResponse(btcNullChange)

    expect(result).not.toBeNull()
    expect(result!.hero.changePercent24h).toBe(0)
  })
})
