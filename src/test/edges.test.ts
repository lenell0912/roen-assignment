import { describe, it, expect } from 'vitest'
import { scoreRuleEdges } from '../lib/edges'
import { Frame } from '../lib/frame'
import { Candle } from '../lib/market/types'

function series(closes: number[]): Candle[] {
  return closes.map((close, i) => ({ date: `d${i}`, close }))
}

const frame: Frame = {
  updatedAt: '',
  rules: [
    { id: 'r1', kind: 'buy', text: '정배열', check: { type: 'sma_cross', fast: 5, slow: 20 } },
    { id: 'r3', kind: 'risk', text: '쏠림', check: { type: 'sector_concentration', maxPct: 40 } },
    { id: 'r4', kind: 'sell', text: '서술형' },
  ],
}

describe('scoreRuleEdges', () => {
  it('추세 상승 데이터에서 sma_cross 규칙은 채점 가능(scorable)', () => {
    const closes = Array.from({ length: 80 }, (_, i) => 100 + i + Math.sin(i / 3) * 5)
    const edges = scoreRuleEdges(series(closes), frame, 10)
    const r1 = edges.find((e) => e.ruleId === 'r1')!
    expect(r1.scorable).toBe(true)
    expect(r1.nSat + r1.nViol).toBeGreaterThan(0)
  })
  it('sector_concentration과 서술형은 채점 불가(scorable=false)', () => {
    const closes = Array.from({ length: 80 }, (_, i) => 100 + i)
    const edges = scoreRuleEdges(series(closes), frame, 10)
    expect(edges.find((e) => e.ruleId === 'r3')!.scorable).toBe(false)
    expect(edges.find((e) => e.ruleId === 'r4')!.scorable).toBe(false)
  })
})
