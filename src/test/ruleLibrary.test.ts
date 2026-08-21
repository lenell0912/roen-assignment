import { describe, it, expect } from 'vitest'
import { RULE_LIBRARY, BY_KEY, suggestKeys, moreKeys, buildRule } from '../lib/ruleLibrary'

describe('RULE_LIBRARY', () => {
  it('key가 중복되지 않는다', () => {
    const keys = RULE_LIBRARY.map((r) => r.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('check가 있으면 기본 params로 알려진 머신체크 타입을 만든다', () => {
    const known = ['sma_cross', 'price_vs_high', 'sector_concentration']
    for (const r of RULE_LIBRARY) if (r.check) expect(known).toContain(r.check(r.params).type)
  })
  it('adjustable 파라미터는 모두 params에 존재한다', () => {
    for (const r of RULE_LIBRARY) for (const a of r.adjustable ?? []) expect(r.params[a.name]).toBeTypeOf('number')
  })
})

describe('suggestKeys', () => {
  it('focus별 순서', () => {
    expect(suggestKeys('trend')).toEqual(['trend-golden', 'no-chase', 'no-fomo', 'stop-loss', 'sector-cap'])
    expect(suggestKeys('value')[0]).toBe('fundamentals')
    expect(suggestKeys('news')[0]).toBe('no-fomo')
  })
  it('focus 없으면 균형 스타터', () => {
    expect(suggestKeys()).toEqual(['trend-golden', 'no-chase', 'sector-cap', 'stop-loss', 'fundamentals'])
  })
})

describe('moreKeys', () => {
  it('이미 본 key는 제외한다', () => {
    const seen = suggestKeys('trend')
    const next = moreKeys(seen)
    expect(next.every((k) => !seen.includes(k))).toBe(true)
    expect(next.length).toBeGreaterThan(0)
  })
  it('전부 봤으면 처음부터 순환한다', () => {
    const all = RULE_LIBRARY.map((r) => r.key)
    const next = moreKeys(all, 3)
    expect(next).toHaveLength(3)
    expect(next.every((k) => all.includes(k))).toBe(true)
  })
})

describe('buildRule', () => {
  it('조정된 params가 text와 check에 반영된다', () => {
    const r = buildRule('no-chase', { pct: 5 })!
    expect(r.id).toBe('lib:no-chase')
    expect(r.text).toContain('5%')
    expect(r.check).toEqual({ type: 'price_vs_high', window: 60, minPctBelowHigh: 5 })
  })
  it('params 생략 시 기본값을 쓴다', () => {
    const r = buildRule('stop-loss')!
    expect(r.text).toBe('손실 -7% 도달 시 손절한다')
    expect(r.check).toBeUndefined()
  })
  it('없는 key는 null', () => {
    expect(buildRule('nope')).toBeNull()
  })
})

describe('BY_KEY', () => {
  it('모든 규칙을 key로 찾을 수 있다', () => {
    for (const r of RULE_LIBRARY) expect(BY_KEY[r.key]).toBe(r)
  })
})
