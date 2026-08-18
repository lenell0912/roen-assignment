import { describe, it, expect } from 'vitest'
import { backtestSmaCross } from '../lib/backtest'
import { Candle } from '../lib/market/types'

function series(closes: number[]): Candle[] {
  return closes.map((close, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, close }))
}

describe('backtestSmaCross', () => {
  it('V자(하락 후 상승)에서 골든크로스 BUY 이벤트 발생', () => {
    // 크로스가 SMA(20) 정의 이후에 일어나도록 충분히 길게
    const down = Array.from({ length: 25 }, (_, i) => 40 - i) // 40..16
    const up = Array.from({ length: 25 }, (_, i) => 16 + i * 2) // 16..64
    const r = backtestSmaCross(series([...down, ...up]), 5, 20)
    expect(r.events.some((e) => e.type === 'BUY')).toBe(true)
  })

  it('buy&hold 수익률 계산 정확', () => {
    const closes = Array.from({ length: 21 }, (_, i) => 100 + i * 5) // 100..200
    const r = backtestSmaCross(series(closes), 5, 20)
    expect(r.buyHoldReturnPct).toBeCloseTo(100, 5) // (200/100 - 1)*100
  })

  it('데이터 부족 → null 수익률', () => {
    const r = backtestSmaCross(series([1, 2, 3]), 5, 20)
    expect(r.strategyReturnPct).toBeNull()
  })
})
