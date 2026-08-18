import { Candle, Quote } from './market/types'
import { evaluateSmaCross } from './signal'

// ── 프레임/규칙 타입 ─────────────────────────────
export type RuleKind = 'buy' | 'sell' | 'risk'

export type MachineCheck =
  | { type: 'sma_cross'; fast: number; slow: number } // 추세: 이동평균 교차
  | { type: 'price_vs_high'; window: number; minPctBelowHigh: number } // 추격매수 방지
  | { type: 'sector_concentration'; maxPct: number } // 쏠림 방지

export interface Rule {
  id: string
  kind: RuleKind
  text: string // 사용자 언어의 규칙
  check?: MachineCheck // 있으면 결정론적으로 평가 가능
}

export interface Frame {
  rules: Rule[]
  updatedAt: string
}

// ── 평가 ────────────────────────────────────────
export type CheckStatus = 'ok' | 'violate' | 'na'
export interface CheckVerdict { status: CheckStatus; detail: string }

export interface EvalContext {
  code: string
  candles: Candle[] // 오래된→최신
  quote?: Quote
  sector?: string
  sectorWeights?: Record<string, number>
}

export function evaluateCheck(check: MachineCheck, ctx: EvalContext): CheckVerdict {
  const closes = ctx.candles.map((c) => c.close)
  const price = ctx.quote?.price ?? closes[closes.length - 1]

  switch (check.type) {
    case 'sma_cross': {
      const r = evaluateSmaCross(closes, check.fast, check.slow)
      if (r.signal === 'INSUFFICIENT') return { status: 'na', detail: '데이터 부족' }
      const bullish = r.signal === 'BUY' || r.signal === 'HOLD_LONG'
      return {
        status: bullish ? 'ok' : 'violate',
        detail: `${check.fast}/${check.slow} ${bullish ? '정배열' : '역배열'} — ${r.reason}`,
      }
    }
    case 'price_vs_high': {
      if (!price || closes.length === 0) return { status: 'na', detail: '데이터 부족' }
      const win = closes.slice(-check.window)
      const high = Math.max(...win)
      const pctBelow = ((high - price) / high) * 100
      const ok = pctBelow >= check.minPctBelowHigh
      return {
        status: ok ? 'ok' : 'violate',
        detail: `최근 ${check.window}일 고점 대비 ${pctBelow.toFixed(1)}% 아래 (기준 ${check.minPctBelowHigh}% 이상)`,
      }
    }
    case 'sector_concentration': {
      if (!ctx.sector || !ctx.sectorWeights) return { status: 'na', detail: '포트폴리오/섹터 정보 없음' }
      const w = ctx.sectorWeights[ctx.sector] ?? 0
      return {
        status: w < check.maxPct ? 'ok' : 'violate',
        detail: `${ctx.sector} 비중 ${w}% (한도 ${check.maxPct}%)`,
      }
    }
  }
}

export interface RuleVerdict { rule: Rule; verdict: CheckVerdict }

/** 프레임 전체를 맥락에 대조. 서술형 규칙(check 없음)은 '스스로 판단'으로 표시 */
export function evaluateFrame(frame: Frame, ctx: EvalContext): RuleVerdict[] {
  return frame.rules.map((rule) => ({
    rule,
    verdict: rule.check ? evaluateCheck(rule.check, ctx) : { status: 'na', detail: '서술형 규칙 — 스스로 판단' },
  }))
}

// ── 예시 프레임 (라벨: 예시, 사용자가 지우고 대체 가능) ──
export const EXAMPLE_FRAME: Frame = {
  rules: [
    { id: 'r1', kind: 'buy', text: '상승 추세에서만 산다 (5일선이 20일선 위, 정배열)', check: { type: 'sma_cross', fast: 5, slow: 20 } },
    { id: 'r2', kind: 'buy', text: '고점 추격은 안 한다 (최근 60일 고점 대비 최소 10% 아래에서만)', check: { type: 'price_vs_high', window: 60, minPctBelowHigh: 10 } },
    { id: 'r3', kind: 'risk', text: '한 섹터에 계좌의 40%를 넘기지 않는다', check: { type: 'sector_concentration', maxPct: 40 } },
    { id: 'r4', kind: 'sell', text: '살 때의 근거가 깨지면 판다 (감정이 아니라 근거로)' },
  ],
  updatedAt: '(예시)',
}
