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

export interface RankedStock {
  code: string
  price: number // 최근 종가
  changeRate: number // 전일 대비 %
  volume: number // 최근 거래일 거래량(주)
  value: number // 최근 거래일 거래대금(원) = 종가 × 거래량
}

/** 후보 종목들을 최근 거래일 거래대금(가격×거래량) 기준 내림차순으로 랭킹. 실패한 종목은 조용히 제외. */
export async function getTradingValueRanking(codes: string[], topN = 5, provider?: string): Promise<RankedStock[]> {
  const settled = await Promise.allSettled(
    codes.map(async (code): Promise<RankedStock> => {
      const candles = await getDailyCandles(code, 8, provider)
      const last = candles[candles.length - 1]
      const prev = candles[candles.length - 2]
      if (!last || last.volume == null) throw new Error(`no volume for ${code}`)
      const changeRate = prev && prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0
      return { code, price: last.close, changeRate, volume: last.volume, value: last.close * last.volume }
    }),
  )
  return settled
    .filter((r): r is PromiseFulfilledResult<RankedStock> => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => b.value - a.value)
    .slice(0, topN)
}

export type { Quote, Candle, MarketData } from './types'
