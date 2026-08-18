import { sma } from './indicators'

export type Signal = 'BUY' | 'SELL' | 'HOLD_LONG' | 'HOLD_FLAT' | 'INSUFFICIENT'

export interface SignalResult {
  signal: Signal
  fast: number | null
  slow: number | null
  reason: string
}

/** 단기/장기 이동평균 교차의 현재 상태 평가 */
export function evaluateSmaCross(closes: number[], fastP = 5, slowP = 20): SignalResult {
  if (closes.length < slowP + 1) {
    return { signal: 'INSUFFICIENT', fast: null, slow: null, reason: `데이터 ${slowP + 1}개 이상 필요` }
  }
  const fastNow = sma(closes, fastP)!
  const slowNow = sma(closes, slowP)!
  const prev = closes.slice(0, -1)
  const fastPrev = sma(prev, fastP)!
  const slowPrev = sma(prev, slowP)!

  if (fastPrev <= slowPrev && fastNow > slowNow)
    return { signal: 'BUY', fast: fastNow, slow: slowNow, reason: '골든크로스: 단기선이 장기선을 상향 돌파' }
  if (fastPrev >= slowPrev && fastNow < slowNow)
    return { signal: 'SELL', fast: fastNow, slow: slowNow, reason: '데드크로스: 단기선이 장기선을 하향 이탈' }
  if (fastNow > slowNow)
    return { signal: 'HOLD_LONG', fast: fastNow, slow: slowNow, reason: '정배열 유지(단기선 > 장기선)' }
  return { signal: 'HOLD_FLAT', fast: fastNow, slow: slowNow, reason: '역배열(단기선 < 장기선)' }
}
