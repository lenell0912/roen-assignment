import { describe, it, expect } from 'vitest'
import { sma, smaSeries, rsi } from '../lib/indicators'

describe('sma', () => {
  it('마지막 N개의 단순이동평균', () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3)
    expect(sma([2, 4, 6], 2)).toBe(5)
  })
  it('데이터 부족 시 null', () => {
    expect(sma([1, 2], 5)).toBeNull()
  })
})

describe('smaSeries', () => {
  it('정렬을 유지하고 앞부분은 null', () => {
    const r = smaSeries([1, 2, 3, 4], 2)
    expect(r[0]).toBeNull()
    expect(r[1]).toBe(1.5)
    expect(r[3]).toBe(3.5)
  })
})

describe('rsi', () => {
  it('상승만 있으면 100에 근접', () => {
    expect(rsi([1, 2, 3, 4, 5, 6, 7, 8], 5)!).toBeGreaterThan(99)
  })
  it('데이터 부족 시 null', () => {
    expect(rsi([1, 2], 14)).toBeNull()
  })
})
