import { MarketData, Quote, Candle } from './types'

// 토스증권 Open API — 엔드포인트/필드 실호출 검증 완료(2026-08-18)
const BASE = 'https://openapi.tossinvest.com'
let cached: { token: string; exp: number } | null = null

async function token(): Promise<string> {
  if (cached && Date.now() < cached.exp) return cached.token
  const basic = Buffer.from(
    `${process.env.TOSS_CLIENT_ID}:${process.env.TOSS_CLIENT_SECRET}`,
  ).toString('base64')
  const res = await fetch(`${BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(3500),
  })
  if (!res.ok) throw new Error(`Toss token failed: ${res.status} ${await res.text()}`)
  const j = await res.json()
  cached = { token: j.access_token, exp: Date.now() + (Number(j.expires_in ?? 3600) - 60) * 1000 }
  return cached.token
}

async function authGet(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { authorization: `Bearer ${await token()}` },
    signal: AbortSignal.timeout(3500),
  })
  if (!res.ok) throw new Error(`Toss GET ${path} failed: ${res.status}`)
  return res.json()
}

export const tossProvider: MarketData = {
  async getQuote(code: string): Promise<Quote> {
    const sym = encodeURIComponent(code)
    const j = await authGet(`/api/v1/prices?symbols=${sym}`)
    const price = Number(j.result?.[0]?.lastPrice)
    if (!Number.isFinite(price) || price <= 0) throw new Error('Toss quote invalid')
    // prices 응답엔 등락률이 없어 최근 2 일봉으로 계산
    let changeRate = 0
    try {
      const c = await authGet(`/api/v1/candles?symbol=${sym}&interval=1d&count=2`)
      const cs = (c.result?.candles ?? []).map((r: any) => Number(r.closePrice)) // 최신→과거
      if (cs.length >= 2 && cs[1]) changeRate = ((cs[0] - cs[1]) / cs[1]) * 100
    } catch {}
    return { code, price, changeRate }
  },

  async getDailyCandles(code: string, days = 120): Promise<Candle[]> {
    const count = Math.min(Math.max(days, 30), 200)
    const j = await authGet(`/api/v1/candles?symbol=${encodeURIComponent(code)}&interval=1d&count=${count}`)
    const rows: any[] = j.result?.candles ?? []
    // 응답은 최신→과거 → 과거→최신으로 뒤집음
    const out = rows
      .map((r) => {
        const v = Number(r.volume ?? r.tradingVolume ?? r.accumulatedTradingVolume)
        return { date: String(r.timestamp).slice(0, 10), close: Number(r.closePrice), volume: Number.isFinite(v) ? v : undefined }
      })
      .filter((c) => !isNaN(c.close))
      .reverse()
    if (out.length === 0) throw new Error('Toss candles empty')
    return out
  },
}
