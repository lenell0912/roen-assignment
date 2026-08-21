// 공유 능력 코어 — 페이지(버튼)와 에이전트(도구)가 같은 함수를 호출한다.
import { getQuote, getDailyCandles, Quote } from './market'
import { Frame, EXAMPLE_FRAME, evaluateFrame, RuleVerdict } from './frame'
import { backtestSmaCross, BtResult } from './backtest'
import { DEMO_PORTFOLIO, sectorWeights, sectorOf } from './portfolio'

export interface CompareResult {
  code: string
  quote: Quote
  sector?: string
  sectorWeights: Record<string, number>
  verdicts: RuleVerdict[]
  summary: { ok: number; violate: number; na: number }
}

/** 결정 순간: 종목을 내 프레임에 대조 (실데이터 기반, 결정론적) */
export async function compareToFrame(code: string, frame: Frame = EXAMPLE_FRAME): Promise<CompareResult> {
  const [quote, candles] = await Promise.all([getQuote(code), getDailyCandles(code, 120)])
  const sector = sectorOf(code)
  const sw = sectorWeights()
  const entryPrice = DEMO_PORTFOLIO.find((h) => h.code === code)?.avgPrice
  const verdicts = evaluateFrame(frame, { code, candles, quote, sector, sectorWeights: sw, entryPrice })
  const summary = { ok: 0, violate: 0, na: 0 }
  for (const v of verdicts) summary[v.verdict.status]++
  return { code, quote, sector, sectorWeights: sw, verdicts, summary }
}

export type BacktestResult =
  | { supported: true; code: string; params: { fast: number; slow: number }; result: BtResult }
  | { supported: false; code: string; note: string }

/** 회고: 내 프레임(이동평균 규칙)을 과거 데이터에 대입 */
export async function runBacktest(code: string, frame: Frame = EXAMPLE_FRAME): Promise<BacktestResult> {
  const rule = frame.rules.find((r) => r.check?.type === 'sma_cross')
  if (!rule || rule.check?.type !== 'sma_cross') {
    return { supported: false, code, note: '이 프레임엔 자동 대입 가능한 이동평균 규칙이 없어. 서술형 규칙은 직접 회고해줘.' }
  }
  const { fast, slow } = rule.check
  const candles = await getDailyCandles(code, 200)
  return { supported: true, code, params: { fast, slow }, result: backtestSmaCross(candles, fast, slow) }
}

export function getPortfolio() {
  return { holdings: DEMO_PORTFOLIO, sectorWeights: sectorWeights() }
}
