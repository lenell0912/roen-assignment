import { MachineCheck } from './frame'

// 매매법 등록 보완 — "같이 골라줘" 어시스트가 제시하는 큐레이션 규칙 라이브러리.
// 참고용 예시(투자자문 아님). 수치는 params로 두고 text/check를 params에서 생성 → 사용자가 슬롯에서 조정 가능.
export type Kind = 'buy' | 'sell' | 'risk'
export type Focus = 'trend' | 'value' | 'news'

export interface Adjustable {
  name: string // params 키
  min: number
  max: number
  step: number
  unit: string // 표시 단위(예: '%', '일')
}

export interface LibRule {
  key: string
  kind: Kind
  params: Record<string, number> // 기본 수치(없으면 {})
  adjustable?: Adjustable[] // 조정 가능한 수치들
  text: (p: Record<string, number>) => string
  check?: (p: Record<string, number>) => MachineCheck // 있으면 자동체크 → 실데이터 대조
}

export const RULE_LIBRARY: LibRule[] = [
  {
    key: 'trend-golden', kind: 'buy', params: { fast: 5, slow: 20 },
    adjustable: [{ name: 'fast', min: 3, max: 20, step: 1, unit: '일' }, { name: 'slow', min: 20, max: 120, step: 5, unit: '일' }],
    text: (p) => `상승 추세에서만 산다 (${p.fast}일선이 ${p.slow}일선 위, 정배열)`,
    check: (p) => ({ type: 'sma_cross', fast: p.fast, slow: p.slow }),
  },
  {
    key: 'no-chase', kind: 'buy', params: { window: 60, pct: 10 },
    adjustable: [{ name: 'pct', min: 5, max: 30, step: 5, unit: '%' }],
    text: (p) => `고점 추격은 안 한다 (최근 ${p.window}일 고점 대비 ${p.pct}% 이상 아래에서만)`,
    check: (p) => ({ type: 'price_vs_high', window: p.window, minPctBelowHigh: p.pct }),
  },
  { key: 'fundamentals', kind: 'buy', params: {}, text: () => '실적·근거가 없으면 사지 않는다' },
  { key: 'scale-in', kind: 'buy', params: {}, text: () => '한 번에 다 사지 않고 분할로 들어간다' },
  {
    key: 'take-profit', kind: 'sell', params: { pct: 10 },
    adjustable: [{ name: 'pct', min: 3, max: 50, step: 1, unit: '%' }],
    text: (p) => `수익률 +${p.pct}% 도달 시 익절을 검토한다`,
  },
  {
    key: 'stop-loss', kind: 'sell', params: { pct: 7 },
    adjustable: [{ name: 'pct', min: 2, max: 20, step: 1, unit: '%' }],
    text: (p) => `손실 -${p.pct}% 도달 시 손절한다`,
  },
  { key: 'thesis-broken', kind: 'sell', params: {}, text: () => '살 때의 근거가 깨지면 판다 (감정이 아니라 근거로)' },
  { key: 'no-fomo', kind: 'sell', params: {}, text: () => '뉴스·테마로 급등하면 추격 대신 관망한다' },
  {
    key: 'sector-cap', kind: 'risk', params: { pct: 40 },
    adjustable: [{ name: 'pct', min: 20, max: 60, step: 5, unit: '%' }],
    text: (p) => `한 섹터에 계좌의 ${p.pct}%를 넘기지 않는다`,
    check: (p) => ({ type: 'sector_concentration', maxPct: p.pct }),
  },
  {
    key: 'position-cap', kind: 'risk', params: { pct: 20 },
    adjustable: [{ name: 'pct', min: 5, max: 50, step: 5, unit: '%' }],
    text: (p) => `한 종목에 계좌의 ${p.pct}%를 넘기지 않는다`,
  },
  { key: 'no-leverage', kind: 'risk', params: {}, text: () => '빚(신용·미수)으로 사지 않는다' },
  { key: 'contrarian', kind: 'risk', params: {}, text: () => '다들 사라고 할 때 한 번 의심한다' },
]

export const BY_KEY: Record<string, LibRule> = Object.fromEntries(RULE_LIBRARY.map((r) => [r.key, r]))

const BY_FOCUS: Record<Focus, string[]> = {
  trend: ['trend-golden', 'no-chase', 'no-fomo', 'stop-loss', 'sector-cap'],
  value: ['fundamentals', 'no-chase', 'thesis-broken', 'scale-in', 'position-cap'],
  news: ['no-fomo', 'contrarian', 'stop-loss', 'take-profit', 'sector-cap'],
}
const DEFAULT_KEYS = ['trend-golden', 'no-chase', 'sector-cap', 'stop-loss', 'fundamentals']

/** 성향(focus)에 맞는 참고 규칙 key. focus 없으면 균형 스타터 세트. */
export function suggestKeys(focus?: Focus, limit = 5): string[] {
  const keys = focus && BY_FOCUS[focus] ? BY_FOCUS[focus] : DEFAULT_KEYS
  return keys.slice(0, limit)
}

/** '다른 제안 받기' — 이미 보여준 key를 제외한 라이브러리 규칙. 다 봤으면 처음부터 순환. */
export function moreKeys(exclude: string[], limit = 5): string[] {
  const all = RULE_LIBRARY.map((r) => r.key)
  const ex = new Set(exclude)
  let rest = all.filter((k) => !ex.has(k))
  if (rest.length === 0) rest = all
  return rest.slice(0, limit)
}

/** key + 조정된 params로 프레임에 저장할 Rule을 만든다. */
export function buildRule(key: string, params: Record<string, number> = {}): { id: string; kind: Kind; text: string; check?: MachineCheck } | null {
  const r = BY_KEY[key]
  if (!r) return null
  const p = { ...r.params, ...params }
  return { id: 'lib:' + key, kind: r.kind, text: r.text(p), check: r.check ? r.check(p) : undefined }
}
