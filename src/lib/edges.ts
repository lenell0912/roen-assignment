import { Candle } from './market/types'
import { Frame, evaluateCheck } from './frame'

export interface RuleEdge {
  ruleId: string
  text: string
  scorable: boolean // 과거 데이터로 채점 가능한가(sma_cross·price_vs_high)
  satisfiedAvg: number | null // 규칙 지킨 날들의 이후 수익률 평균(%)
  violatedAvg: number | null // 규칙 어긴 날들의 이후 수익률 평균(%)
  edge: number | null // satisfiedAvg - violatedAvg (%p)
  nSat: number
  nViol: number
}

/**
 * 규칙별 엣지: 각 규칙을 지킨 날 vs 어긴 날의 "이후 horizon일 수익률"을 비교.
 * 프레임을 "내 데이터로 채점"해 진화의 근거를 만든다. (sector_concentration은 과거 시계열이 없어 제외)
 */
export function scoreRuleEdges(candles: Candle[], frame: Frame, horizon = 20): RuleEdge[] {
  const closes = candles.map((c) => c.close)
  return frame.rules.map((rule) => {
    const base: RuleEdge = {
      ruleId: rule.id,
      text: rule.text,
      scorable: false,
      satisfiedAvg: null,
      violatedAvg: null,
      edge: null,
      nSat: 0,
      nViol: 0,
    }
    if (!rule.check || rule.check.type === 'sector_concentration') return base

    const sat: number[] = []
    const viol: number[] = []
    // 충분한 히스토리가 쌓인 시점부터, 이후 horizon일 수익률을 볼 수 있는 지점까지
    for (let i = 25; i < candles.length - horizon; i++) {
      const ctx = { code: '', candles: candles.slice(0, i + 1) }
      const v = evaluateCheck(rule.check, ctx)
      if (v.status === 'na') continue
      const fwd = ((closes[i + horizon] - closes[i]) / closes[i]) * 100
      ;(v.status === 'ok' ? sat : viol).push(fwd)
    }
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
    const satAvg = avg(sat)
    const violAvg = avg(viol)
    return {
      ...base,
      scorable: true,
      satisfiedAvg: satAvg,
      violatedAvg: violAvg,
      edge: satAvg != null && violAvg != null ? satAvg - violAvg : null,
      nSat: sat.length,
      nViol: viol.length,
    }
  })
}
