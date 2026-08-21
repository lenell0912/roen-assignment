import { describe, it, expect } from 'vitest'
import { RULE_LIBRARY, suggestRules } from '../lib/ruleLibrary'

describe('RULE_LIBRARY', () => {
  it('key가 중복되지 않는다', () => {
    const keys = RULE_LIBRARY.map((r) => r.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('check가 있으면 알려진 머신체크 타입이다', () => {
    const known = ['sma_cross', 'price_vs_high', 'sector_concentration']
    for (const r of RULE_LIBRARY) if (r.check) expect(known).toContain(r.check.type)
  })
})

describe('suggestRules', () => {
  it('focus별로 그 성향의 규칙을 순서대로 준다', () => {
    expect(suggestRules('trend').map((r) => r.key)).toEqual(['trend-golden', 'no-chase', 'no-fomo', 'stop-loss', 'sector-cap'])
    expect(suggestRules('value')[0].key).toBe('fundamentals')
    expect(suggestRules('news')[0].key).toBe('no-fomo')
  })
  it('focus 없으면 균형 스타터 세트', () => {
    expect(suggestRules().map((r) => r.key)).toEqual(['trend-golden', 'no-chase', 'sector-cap', 'stop-loss', 'fundamentals'])
  })
  it('limit을 넘지 않고, 모두 실제 라이브러리 규칙이다', () => {
    const out = suggestRules('trend', 3)
    expect(out).toHaveLength(3)
    const keys = new Set(RULE_LIBRARY.map((r) => r.key))
    for (const r of out) expect(keys.has(r.key)).toBe(true)
  })
})
