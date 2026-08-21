import YahooFinance from 'yahoo-finance2'
import { MarketData, Quote, Candle } from './types'

// yahoo-finance2 v4: 인스턴스 생성 필요
const yahooFinance = new YahooFinance()

// KRX 6자리 코드 → Yahoo 심볼 후보. 코스피(.KS) 먼저, 실패/빈 결과면 코스닥(.KQ)으로 재시도.
function symbolCandidates(code: string): string[] {
  return code.includes('.') ? [code] : [`${code}.KS`, `${code}.KQ`]
}

export const yahooProvider: MarketData = {
  async getQuote(code: string): Promise<Quote> {
    let lastErr: unknown
    for (const symbol of symbolCandidates(code)) {
      try {
        const q: any = await yahooFinance.quote(symbol)
        const price = Number(q?.regularMarketPrice)
        if (!Number.isFinite(price) || price <= 0) throw new Error('Yahoo quote invalid')
        const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : undefined)
        return {
          code,
          name: q.shortName ?? q.longName,
          price,
          changeRate: Number(q.regularMarketChangePercent),
          change: num(q.regularMarketChange),
          prevClose: num(q.regularMarketPreviousClose),
          open: num(q.regularMarketOpen),
          dayHigh: num(q.regularMarketDayHigh),
          dayLow: num(q.regularMarketDayLow),
          volume: num(q.regularMarketVolume),
          marketCap: num(q.marketCap),
          week52High: num(q.fiftyTwoWeekHigh),
          week52Low: num(q.fiftyTwoWeekLow),
          per: num(q.trailingPE),
        }
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Yahoo quote invalid')
  },

  async getDailyCandles(code: string, days = 120): Promise<Candle[]> {
    let lastErr: unknown
    for (const symbol of symbolCandidates(code)) {
      try {
        const period1 = new Date(Date.now() - days * 2 * 864e5)
        const c: any = await yahooFinance.chart(symbol, { period1, interval: '1d' })
        const out = (c.quotes ?? [])
          .filter((r: any) => r.close != null)
          .map((r: any) => ({
            date: new Date(r.date).toISOString().slice(0, 10),
            close: Number(r.close),
            volume: r.volume != null ? Number(r.volume) : undefined,
          }))
        if (out.length === 0) throw new Error('Yahoo candles empty')
        return out.slice(-days)
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Yahoo candles empty')
  },
}
