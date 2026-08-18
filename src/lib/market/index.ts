import { MarketData } from './types'
import { tossProvider } from './toss'
import { yahooProvider } from './yahoo'

/** 기본 제공자는 env(MARKET_PROVIDER), name 인자로 요청별 오버라이드 가능(데모/비교용) */
function pick(name?: string): MarketData {
  const p = name ?? process.env.MARKET_PROVIDER
  return p === 'yahoo' ? yahooProvider : tossProvider
}

export const getQuote = (code: string, provider?: string) => pick(provider).getQuote(code)
export const getDailyCandles = (code: string, days?: number, provider?: string) =>
  pick(provider).getDailyCandles(code, days)
export const getDailyCloses = async (code: string, days?: number, provider?: string) =>
  (await getDailyCandles(code, days, provider)).map((c) => c.close)

export type { Quote, Candle, MarketData } from './types'
