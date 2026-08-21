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
  entryPrice?: number // 보유 종목의 평균 매입가(있으면 익절·손절 규칙을 실계산)
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

// ── 머신 체크가 없는 규칙의 '소프트' 평가 ──────────────
// 텍스트만 있는 규칙도 성격을 나눠 정직하게 라벨링한다:
//  · 익절/손절처럼 계산 기반 규칙 → 보유 종목(매입가 있음)이면 실계산해 부합/위반,
//    미보유면 '매입가 필요'로 아직 자동판정 불가(na).
//  · 뉴스/여론 같은 정성 규칙, 그 외 → 아직 지원 안 하는 규칙(na).
const PROFIT_RE = /익절|이익\s*실현|목표\s*수익|수익\s*실현/
const STOP_RE = /손절|스탑|스톱|손실\s*(제한|한도|률|폭)/
const NEWS_RE = /뉴스|기사|이슈|호재|악재|공시|루머|커뮤니티|여론|반응|테마|재료|심리|분위기/

function pickPct(text: string): number | undefined {
  const m = text.match(/([-+]?\d+(?:\.\d+)?)\s*%/)
  return m ? Math.abs(Number(m[1])) : undefined
}

export function evaluateSoftRule(rule: Rule, ctx: EvalContext): CheckVerdict {
  const text = rule.text
  const isProfit = PROFIT_RE.test(text)
  const isStop = STOP_RE.test(text)

  if (isProfit || isStop) {
    const pct = pickPct(text)
    const price = ctx.quote?.price ?? ctx.candles[ctx.candles.length - 1]?.close
    if (ctx.entryPrice && price && pct != null) {
      const ret = ((price - ctx.entryPrice) / ctx.entryPrice) * 100
      const sign = ret >= 0 ? '+' : ''
      const base = `매입가 ${ctx.entryPrice.toLocaleString()}원 대비 현재 ${sign}${ret.toFixed(1)}%`
      if (isProfit) {
        const hit = ret >= pct
        return { status: hit ? 'violate' : 'ok', detail: `${base} — 익절 목표 +${pct}% ${hit ? '도달(익절 검토 구간)' : '미도달'}` }
      }
      const hit = ret <= -pct
      return { status: hit ? 'violate' : 'ok', detail: `${base} — 손절선 -${pct}% ${hit ? '이탈(손절 검토 구간)' : '이내'}` }
    }
    return { status: 'na', detail: '계산 기반 규칙 — 매입가가 없어 아직 자동 판정 못 해요 (보유 종목은 자동 계산)' }
  }

  if (NEWS_RE.test(text)) return { status: 'na', detail: '뉴스·여론 자동 분석은 아직 지원하지 않아요 — 직접 확인' }
  return { status: 'na', detail: '아직 자동 판정을 지원하지 않는 규칙 — 직접 확인' }
}

export interface RuleVerdict { rule: Rule; verdict: CheckVerdict }

/** 프레임 전체를 맥락에 대조. 머신 체크가 없는 규칙은 소프트 평가(성격별 정직 라벨)로 처리 */
export function evaluateFrame(frame: Frame, ctx: EvalContext): RuleVerdict[] {
  return frame.rules.map((rule) => ({
    rule,
    verdict: rule.check ? evaluateCheck(rule.check, ctx) : evaluateSoftRule(rule, ctx),
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

// ── 대화(update_frame 도구) 입력 → 안전한 Rule[] 정제 ──
const RULE_KINDS: RuleKind[] = ['buy', 'sell', 'risk']

/** check.type만 보고 통과시키지 않는다 — 필드가 빠진 payload는 평가 시 undefined가 섞여
 *  "위반 — 한도 undefined%" 같은 영구 오검출을 만든다. 변형별로 필요한 필드를 전부 검증한다. */
function parseCheck(raw: any): MachineCheck | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  switch (raw.type) {
    case 'sma_cross':
      return typeof raw.fast === 'number' && typeof raw.slow === 'number'
        ? { type: 'sma_cross', fast: raw.fast, slow: raw.slow }
        : undefined
    case 'price_vs_high':
      return typeof raw.window === 'number' && typeof raw.minPctBelowHigh === 'number'
        ? { type: 'price_vs_high', window: raw.window, minPctBelowHigh: raw.minPctBelowHigh }
        : undefined
    case 'sector_concentration':
      return typeof raw.maxPct === 'number' ? { type: 'sector_concentration', maxPct: raw.maxPct } : undefined
    default:
      return undefined
  }
}

export function rulesFromToolInput(input: any): Rule[] {
  const arr = Array.isArray(input?.rules) ? input.rules : []
  return arr
    .filter((r: any) => r && RULE_KINDS.includes(r.kind) && typeof r.text === 'string' && r.text.trim())
    .map((r: any, i: number) => ({
      id: `r${Date.now()}_${i}`,
      kind: r.kind as RuleKind,
      text: r.text.trim(),
      check: parseCheck(r.check),
    }))
}
