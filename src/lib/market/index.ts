import { MarketData } from './types'
import { tossProvider } from './toss'
import { yahooProvider } from './yahoo'

/** 기본 제공자는 env(MARKET_PROVIDER), name 인자로 요청별 오버라이드 가능(데모/비교용) */
function pick(name?: string): MarketData {
  const p = name ?? process.env.MARKET_PROVIDER
  return p === 'yahoo' ? yahooProvider : tossProvider
}

/** 주 제공자 실패 시 Yahoo로 자동 폴백 — 서버리스 배포에서 토스 IP 정책 등으로 죽지 않게 */
async function withFallback<T>(primary: MarketData, fn: (p: MarketData) => Promise<T>): Promise<T> {
  try {
    return await fn(primary)
  } catch (e) {
    if (primary === yahooProvider) throw e
    return await fn(yahooProvider)
  }
}

export const getQuote = (code: string, provider?: string) =>
  withFallback(pick(provider), (p) => p.getQuote(code))
export const getDailyCandles = (code: string, days?: number, provider?: string) =>
  withFallback(pick(provider), (p) => p.getDailyCandles(code, days))
export const getDailyCloses = async (code: string, days?: number, provider?: string) =>
  (await getDailyCandles(code, days, provider)).map((c) => c.close)

export type { Quote, Candle, MarketData } from './types'
