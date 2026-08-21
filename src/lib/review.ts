import { Frame, RuleVerdict, EvalContext, evaluateFrame } from './frame'
import { stockName } from './stocks'
import type { Candle } from './market/types'

export interface FitCount { ok: number; violate: number; na: number }

export interface ReviewItem {
  source: 'holding' | 'record'
  code: string
  name: string
  entryPrice: number | null
  currentPrice: number | null
  returnPct: number | null
  fit: FitCount
  fitScore: number | null // ok/(ok+violate); 자동판정 규칙이 없으면 null
  aged: boolean // 성과가 유의미할 만큼 경과했나(요약 집계 포함 여부)
  at?: string
  note?: string
}

export interface ScenarioCard {
  code: string
  name: string
  lookbackDays: number
  entryDate: string
  entryPrice: number
  currentPrice: number
  returnPct: number
  fit: FitCount // '그때' 프레임 부합도
}

export interface ReviewSummary {
  followedAvg: number | null
  brokeAvg: number | null
  edge: number | null
  verdict: string
  nFollowed: number
  nBroke: number
}

export interface TradeReview {
  items: ReviewItem[]
  summary: ReviewSummary
  scenario?: ScenarioCard
  smaBonus?: { params: { fast: number; slow: number }; result: { strategyReturnPct: number | null; buyHoldReturnPct: number | null; trades: number } }
}

/** 클라가 /api/review로 넘기는 판단기록 최소 형태 */
export interface DecisionRecordInput {
  code: string
  at: string
  okCount: number
  violateCount: number
  naCount: number
  priceAtDecision?: number
  note?: string
}

export function countStatuses(verdicts: RuleVerdict[]): FitCount {
  const c: FitCount = { ok: 0, violate: 0, na: 0 }
  for (const v of verdicts) c[v.verdict.status]++
  return c
}

export function fitScoreOf(fit: FitCount): number | null {
  const denom = fit.ok + fit.violate
  return denom > 0 ? fit.ok / denom : null
}

export function isAged(at: string | undefined, nowMs: number, thresholdMs = 86_400_000): boolean {
  if (!at) return false
  const t = Date.parse(at)
  return Number.isFinite(t) ? nowMs - t > thresholdMs : false
}

export function summarizeReview(items: ReviewItem[]): ReviewSummary {
  const usable = items.filter((i) => i.aged && i.fitScore != null && i.returnPct != null)
  const followed = usable.filter((i) => (i.fitScore as number) >= 0.5).map((i) => i.returnPct as number)
  const broke = usable.filter((i) => (i.fitScore as number) < 0.5).map((i) => i.returnPct as number)
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
  const followedAvg = avg(followed)
  const brokeAvg = avg(broke)
  const edge = followedAvg != null && brokeAvg != null ? followedAvg - brokeAvg : null
  let verdict: string
  if (edge == null) verdict = '아직 판단하기 일러요 — 원칙을 지킨 매매와 어긴 매매가 둘 다 쌓여야 비교돼요. (표본 부족)'
  else if (edge >= 0) verdict = `원칙을 지킨 매매가 평균 +${edge.toFixed(1)}%p 나았어요 — 규칙이 도움이 된 신호예요. (표본 적음, 참고만)`
  else verdict = `원칙을 지킨 매매가 평균 ${edge.toFixed(1)}%p 낮았어요 — 규칙을 의심해볼 신호예요. (표본 적음, 참고만)`
  return { followedAvg, brokeAvg, edge, verdict, nFollowed: followed.length, nBroke: broke.length }
}

/** 가상 시나리오: lookbackDays 거래일 전을 진입으로 잡아, 실제 캔들로 수익률·그때 부합도를 계산 */
export function buildScenario(candles: Candle[], frame: Frame, code: string, lookbackDays = 20): ScenarioCard | undefined {
  if (candles.length < 2) return undefined
  const lastIdx = candles.length - 1
  const entryIdx = Math.max(0, lastIdx - lookbackDays)
  if (entryIdx >= lastIdx) return undefined
  const entry = candles[entryIdx]
  const last = candles[lastIdx]
  const ctx: EvalContext = { code, candles: candles.slice(0, entryIdx + 1) }
  const fit = countStatuses(evaluateFrame(frame, ctx))
  return {
    code,
    name: stockName(code),
    lookbackDays,
    entryDate: entry.date,
    entryPrice: entry.close,
    currentPrice: last.close,
    returnPct: ((last.close - entry.close) / entry.close) * 100,
    fit,
  }
}
