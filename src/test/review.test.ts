import { describe, it, expect } from 'vitest'
import { fitScoreOf, isAged, summarizeReview, buildScenario, countStatuses, ReviewItem } from '../lib/review'
import { Frame } from '../lib/frame'
import { Candle } from '../lib/market/types'

const item = (p: Partial<ReviewItem>): ReviewItem => ({
  source: 'record', code: '005930', name: '삼성전자', entryPrice: 100, currentPrice: 110,
  returnPct: 10, fit: { ok: 1, violate: 0, na: 0 }, fitScore: 1, aged: true, ...p,
})

describe('fitScoreOf', () => {
  it('ok/(ok+violate), 미지원만이면 null', () => {
    expect(fitScoreOf({ ok: 3, violate: 1, na: 2 })).toBeCloseTo(0.75)
    expect(fitScoreOf({ ok: 0, violate: 0, na: 4 })).toBeNull()
  })
})

describe('isAged', () => {
  const now = Date.parse('2026-08-21T00:00:00Z')
  it('하루 넘게 지난 기록은 aged, 방금 건 아님', () => {
    expect(isAged('2026-08-01T00:00:00Z', now)).toBe(true)
    expect(isAged('2026-08-20T18:00:00Z', now)).toBe(false)
    expect(isAged(undefined, now)).toBe(false)
  })
})

describe('summarizeReview', () => {
  it('부합 우세 매매가 더 나으면 양의 edge와 긍정 verdict', () => {
    const s = summarizeReview([
      item({ fitScore: 1, returnPct: 20, aged: true }),
      item({ fitScore: 0.2, returnPct: 4, aged: true }),
    ])
    expect(s.edge).toBeCloseTo(16)
    expect(s.nFollowed).toBe(1)
    expect(s.nBroke).toBe(1)
    expect(s.verdict).toContain('나았어요')
  })
  it('한쪽 버킷이 비면 표본 부족 폴백', () => {
    const s = summarizeReview([item({ fitScore: 1, returnPct: 20, aged: true })])
    expect(s.edge).toBeNull()
    expect(s.verdict).toContain('표본 부족')
  })
  it('aged=false나 fitScore=null은 집계 제외', () => {
    const s = summarizeReview([
      item({ fitScore: 1, returnPct: 20, aged: false }),
      item({ fitScore: null, returnPct: 5, aged: true }),
    ])
    expect(s.edge).toBeNull()
  })
})

describe('buildScenario', () => {
  const frame: Frame = { updatedAt: '', rules: [{ id: 'r1', kind: 'buy', text: 't', check: { type: 'price_vs_high', window: 60, minPctBelowHigh: 10 } }] }
  const candles: Candle[] = Array.from({ length: 40 }, (_, i) => ({ date: `d${i}`, close: 100 + i }))
  it('lookback 시점을 진입으로 잡고 수익률·fit 계산', () => {
    const sc = buildScenario(candles, frame, '005930', 20)!
    expect(sc.entryPrice).toBe(candles[19].close)
    expect(sc.currentPrice).toBe(candles[39].close)
    expect(sc.returnPct).toBeCloseTo(((139 - 119) / 119) * 100)
    expect(sc.fit.ok + sc.fit.violate + sc.fit.na).toBe(1)
  })
  it('캔들이 2개 미만이면 undefined', () => {
    expect(buildScenario([{ date: 'd', close: 1 }], frame, 'x', 20)).toBeUndefined()
  })
})

describe('countStatuses', () => {
  it('상태별 카운트', () => {
    expect(countStatuses([
      { rule: { id: 'a', kind: 'buy', text: 'x' }, verdict: { status: 'ok', detail: '' } },
      { rule: { id: 'b', kind: 'buy', text: 'y' }, verdict: { status: 'na', detail: '' } },
    ])).toEqual({ ok: 1, violate: 0, na: 1 })
  })
})
