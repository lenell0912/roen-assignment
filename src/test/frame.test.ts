import { describe, it, expect } from 'vitest'
import { evaluateCheck, EvalContext } from '../lib/frame'
import { Candle } from '../lib/market/types'

function candles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, close }))
}

describe('evaluateCheck · sma_cross', () => {
  it('상승추세 → ok', () => {
    const up = candles(Array.from({ length: 21 }, (_, i) => 10 + i))
    const v = evaluateCheck({ type: 'sma_cross', fast: 5, slow: 20 }, { code: 'X', candles: up })
    expect(v.status).toBe('ok')
  })
  it('하락추세 → violate', () => {
    const down = candles(Array.from({ length: 21 }, (_, i) => 40 - i))
    const v = evaluateCheck({ type: 'sma_cross', fast: 5, slow: 20 }, { code: 'X', candles: down })
    expect(v.status).toBe('violate')
  })
})

describe('evaluateCheck · price_vs_high', () => {
  const cs = candles([100, 90, 80, 120, 110]) // 고점 120
  it('고점 근처면 violate', () => {
    const v = evaluateCheck({ type: 'price_vs_high', window: 60, minPctBelowHigh: 10 }, {
      code: 'X', candles: cs, quote: { code: 'X', price: 118, changeRate: 0 },
    })
    expect(v.status).toBe('violate') // 120 대비 1.7% 아래 < 10%
  })
  it('충분히 낮으면 ok', () => {
    const v = evaluateCheck({ type: 'price_vs_high', window: 60, minPctBelowHigh: 10 }, {
      code: 'X', candles: cs, quote: { code: 'X', price: 100, changeRate: 0 },
    })
    expect(v.status).toBe('ok') // 120 대비 16.7% 아래 >= 10%
  })
})

describe('evaluateCheck · sector_concentration', () => {
  it('한도 초과면 violate', () => {
    const v = evaluateCheck({ type: 'sector_concentration', maxPct: 40 }, {
      code: 'X', candles: candles([1, 2]), sector: '2차전지', sectorWeights: { '2차전지': 62 },
    })
    expect(v.status).toBe('violate')
  })
})
