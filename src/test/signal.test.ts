import { describe, it, expect } from 'vitest'
import { evaluateSmaCross } from '../lib/signal'

describe('evaluateSmaCross', () => {
  it('지속 상승 → HOLD_LONG', () => {
    const up = Array.from({ length: 21 }, (_, i) => 10 + i)
    expect(evaluateSmaCross(up, 5, 20).signal).toBe('HOLD_LONG')
  })
  it('데이터 부족 → INSUFFICIENT', () => {
    expect(evaluateSmaCross([1, 2, 3], 5, 20).signal).toBe('INSUFFICIENT')
  })
})
