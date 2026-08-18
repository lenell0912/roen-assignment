import YahooFinance from 'yahoo-finance2'
import { MarketData, Quote, Candle } from './types'

// yahoo-finance2 v4: 인스턴스 생성 필요
const yahooFinance = new YahooFinance()

// KRX 6자리 코드 → Yahoo 심볼. 기본 .KS(코스피). 코스닥은 .KQ 필요 시 확장.
function sym(code: string) {
  return code.includes('.') ? code : `${code}.KS`
}

export const yahooProvider: MarketData = {
  async getQuote(code: string): Promise<Quote> {
    const q: any = await yahooFinance.quote(sym(code))
    return {
      code,
      name: q.shortName ?? q.longName,
      price: Number(q.regularMarketPrice),
      changeRate: Number(q.regularMarketChangePercent),
    }
  },

  async getDailyCandles(code: string, days = 120): Promise<Candle[]> {
    const period1 = new Date(Date.now() - days * 2 * 864e5)
    const c: any = await yahooFinance.chart(sym(code), { period1, interval: '1d' })
    return (c.quotes ?? [])
      .filter((r: any) => r.close != null)
      .map((r: any) => ({ date: new Date(r.date).toISOString().slice(0, 10), close: Number(r.close) }))
  },
}
