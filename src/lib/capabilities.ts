// 공유 능력 코어 — 페이지(버튼)와 에이전트(도구)가 같은 함수를 호출한다.
import { getQuote, getDailyCandles, Quote } from './market'
import { Frame, EXAMPLE_FRAME, evaluateFrame, RuleVerdict } from './frame'
import { backtestSmaCross, BtResult } from './backtest'
import { DEMO_PORTFOLIO, sectorWeights, sectorOf } from './portfolio'
import { stockName } from './stocks'
import {
  countStatuses, fitScoreOf, isAged, summarizeReview, buildScenario,
  ReviewItem, TradeReview, DecisionRecordInput,
} from './review'

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

/** 계정 전체 회고 — 보유내역 + 판단기록을 내 프레임으로 돌아보고 운/실력을 요약.
 *  records는 클라(localStorage)에서 넘겨받는다. opts.code가 있으면 가상 시나리오도 만든다. */
export async function reviewTrades(
  frame: Frame = EXAMPLE_FRAME,
  opts: { code?: string; records?: DecisionRecordInput[]; now?: number } = {},
): Promise<TradeReview> {
  const nowMs = opts.now ?? Date.now()
  const sw = sectorWeights()

  const holdingItems = (
    await Promise.all(
      DEMO_PORTFOLIO.map(async (h): Promise<ReviewItem | null> => {
        try {
          const [quote, candles] = await Promise.all([getQuote(h.code), getDailyCandles(h.code, 120)])
          const fit = countStatuses(
            evaluateFrame(frame, { code: h.code, candles, quote, sector: sectorOf(h.code), sectorWeights: sw, entryPrice: h.avgPrice }),
          )
          return {
            source: 'holding', code: h.code, name: h.name, entryPrice: h.avgPrice, currentPrice: quote.price,
            returnPct: ((quote.price - h.avgPrice) / h.avgPrice) * 100, fit, fitScore: fitScoreOf(fit), aged: true,
          }
        } catch {
          return null
        }
      }),
    )
  ).filter((x): x is ReviewItem => x != null)

  const recordItems = (
    await Promise.all(
      (opts.records ?? []).map(async (r): Promise<ReviewItem> => {
        const fit = { ok: r.okCount, violate: r.violateCount, na: r.naCount }
        let currentPrice: number | null = null
        let returnPct: number | null = null
        if (r.priceAtDecision) {
          try {
            const q = await getQuote(r.code)
            currentPrice = q.price
            returnPct = ((q.price - r.priceAtDecision) / r.priceAtDecision) * 100
          } catch {}
        }
        return {
          source: 'record', code: r.code, name: stockName(r.code), entryPrice: r.priceAtDecision ?? null,
          currentPrice, returnPct, fit, fitScore: fitScoreOf(fit), aged: isAged(r.at, nowMs), at: r.at, note: r.note,
        }
      }),
    )
  )

  const items = [...holdingItems, ...recordItems]
  const summary = summarizeReview(items)

  let scenario
  if (opts.code) {
    try {
      scenario = buildScenario(await getDailyCandles(opts.code, 40), frame, opts.code)
    } catch {}
  }

  let smaBonus: TradeReview['smaBonus']
  if (opts.code && frame.rules.some((r) => r.check?.type === 'sma_cross')) {
    const bt = await runBacktest(opts.code, frame)
    if (bt.supported) smaBonus = { params: bt.params, result: { strategyReturnPct: bt.result.strategyReturnPct, buyHoldReturnPct: bt.result.buyHoldReturnPct, trades: bt.result.trades } }
  }

  return { items, summary, scenario, smaBonus }
}
