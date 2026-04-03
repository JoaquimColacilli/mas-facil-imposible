import { NextRequest, NextResponse } from 'next/server'

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const ALLOWED_TICKERS = new Set([
  '^MERV', 'GGAL.BA', 'YPFD.BA', 'MELI.BA', 'BMA.BA',
  'PAMP.BA', 'TXAR.BA', 'SUPV.BA', 'BBAR.BA', 'LOMA.BA',
])

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')

  if (!ticker || !ALLOWED_TICKERS.has(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(ticker)}?range=1d&interval=5m`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance returned ${res.status}` },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch from Yahoo Finance' }, { status: 502 })
  }
}
