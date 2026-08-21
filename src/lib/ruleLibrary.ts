import { MachineCheck } from './frame'

// 매매법 등록 보완 — "같이 골라줘" 어시스트가 제시하는 큐레이션 규칙 라이브러리.
// 참고용 예시(투자자문 아님). 자동체크 가능한 규칙엔 check를 붙여 바로 실데이터 대조가 되게 한다.
export interface LibRule {
  key: string
  kind: 'buy' | 'sell' | 'risk'
  text: string
  check?: MachineCheck
}

export type Focus = 'trend' | 'value' | 'news'

export const RULE_LIBRARY: LibRule[] = [
  { key: 'trend-golden', kind: 'buy', text: '상승 추세에서만 산다 (5일선이 20일선 위, 정배열)', check: { type: 'sma_cross', fast: 5, slow: 20 } },
  { key: 'no-chase', kind: 'buy', text: '고점 추격은 안 한다 (최근 60일 고점 대비 10% 이상 아래에서만)', check: { type: 'price_vs_high', window: 60, minPctBelowHigh: 10 } },
  { key: 'fundamentals', kind: 'buy', text: '실적·근거가 없으면 사지 않는다' },
  { key: 'scale-in', kind: 'buy', text: '한 번에 다 사지 않고 분할로 들어간다' },
  { key: 'take-profit', kind: 'sell', text: '수익률 +10% 도달 시 익절을 검토한다' },
  { key: 'stop-loss', kind: 'sell', text: '손실 -7% 도달 시 손절한다' },
  { key: 'thesis-broken', kind: 'sell', text: '살 때의 근거가 깨지면 판다 (감정이 아니라 근거로)' },
  { key: 'no-fomo', kind: 'sell', text: '뉴스·테마로 급등하면 추격 대신 관망한다' },
  { key: 'sector-cap', kind: 'risk', text: '한 섹터에 계좌의 40%를 넘기지 않는다', check: { type: 'sector_concentration', maxPct: 40 } },
  { key: 'position-cap', kind: 'risk', text: '한 종목에 계좌의 20%를 넘기지 않는다' },
  { key: 'no-leverage', kind: 'risk', text: '빚(신용·미수)으로 사지 않는다' },
  { key: 'contrarian', kind: 'risk', text: '다들 사라고 할 때 한 번 의심한다' },
]

const BY_FOCUS: Record<Focus, string[]> = {
  trend: ['trend-golden', 'no-chase', 'no-fomo', 'stop-loss', 'sector-cap'],
  value: ['fundamentals', 'no-chase', 'thesis-broken', 'scale-in', 'position-cap'],
  news: ['no-fomo', 'contrarian', 'stop-loss', 'take-profit', 'sector-cap'],
}
const DEFAULT_KEYS = ['trend-golden', 'no-chase', 'sector-cap', 'stop-loss', 'fundamentals']

/** 성향(focus)에 맞는 참고 규칙 후보. focus 없으면 균형 잡힌 스타터 세트. */
export function suggestRules(focus?: Focus, limit = 5): LibRule[] {
  const keys = focus && BY_FOCUS[focus] ? BY_FOCUS[focus] : DEFAULT_KEYS
  const byKey = new Map(RULE_LIBRARY.map((r) => [r.key, r]))
  return keys
    .map((k) => byKey.get(k))
    .filter((r): r is LibRule => r != null)
    .slice(0, limit)
}
