import { describe, it, expect } from 'vitest'
import { evaluateCheck, EvalContext, rulesFromToolInput, MachineCheck } from '../lib/frame'
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

describe('rulesFromToolInput', () => {
  it('유효한 규칙을 Rule[]로 변환하고 id를 부여한다', () => {
    const rules = rulesFromToolInput({
      rules: [
        { kind: 'buy', text: '정배열에서만 산다', check: { type: 'sma_cross', fast: 5, slow: 20 } },
        { kind: 'sell', text: '근거가 깨지면 판다' },
      ],
    })
    expect(rules).toHaveLength(2)
    expect(rules[0].id).toBeTruthy()
    expect(rules[0].id).not.toBe(rules[1].id)
    expect(rules[0].check).toMatchObject({ type: 'sma_cross' })
    expect(rules[1].check).toBeUndefined()
  })
  it('모르는 kind는 버리고, 모르는 check.type은 check만 제거한다', () => {
    const rules = rulesFromToolInput({
      rules: [
        { kind: 'hold', text: '이상한 종류' },
        { kind: 'risk', text: '쏠림 방지', check: { type: 'magic', x: 1 } },
        { kind: 'buy', text: '   ' },
      ],
    })
    expect(rules).toHaveLength(1)
    expect(rules[0].text).toBe('쏠림 방지')
    expect(rules[0].check).toBeUndefined()
  })
  it('check 페이로드에 필드가 빠지면 check만 제거하고(서술형으로), 필드가 온전하면 통과시킨다', () => {
    const rules = rulesFromToolInput({
      rules: [
        { kind: 'buy', text: 'x', check: { type: 'price_vs_high' } }, // 필드 누락 → check 제거
        { kind: 'buy', text: 'y', check: { type: 'price_vs_high', window: 60, minPctBelowHigh: 10 } },
        { kind: 'sell', text: 'z', check: { type: 'sma_cross', fast: 5, slow: 20 } },
        { kind: 'risk', text: 'w', check: { type: 'sector_concentration', maxPct: 40 } },
      ],
    })
    expect(rules).toHaveLength(4)
    expect(rules[0].check).toBeUndefined()
    expect(rules[1].check).toEqual<MachineCheck>({ type: 'price_vs_high', window: 60, minPctBelowHigh: 10 })
    expect(rules[2].check).toEqual<MachineCheck>({ type: 'sma_cross', fast: 5, slow: 20 })
    expect(rules[3].check).toEqual<MachineCheck>({ type: 'sector_concentration', maxPct: 40 })
  })
  it('입력이 이상하면 빈 배열', () => {
    expect(rulesFromToolInput(null)).toEqual([])
    expect(rulesFromToolInput({ rules: 'x' })).toEqual([])
  })
})
