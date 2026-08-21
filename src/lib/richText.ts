// 에이전트 발화 속 '방향성 숫자'를 색칠하기 위한 순수 로직.
// 한국 증시 관례: 상승(+ / ▲) 빨강, 하락(- / − / ▼) 파랑.
// 부호가 없는 수치(예: "반도체 38%", "298.7만원", "5/20")는 방향성이 아니므로 색칠하지 않는다.

// 부호 % (예: +2.2%, -13%p) 또는 화살표 수치(예: ▲2.2%, ▼6.9%)를 토큰으로 캡처.
// split()에서만 쓴다(전역 플래그의 lastIndex 부작용 회피).
export const SIGNED_SPLIT =
  /((?:[+\-−]\s?\d[\d,]*(?:\.\d+)?\s?%(?:p|pt|포인트)?)|(?:[▲▼]\s?\d[\d,]*(?:\.\d+)?\s?%?))/g

// 토큰 전체가 방향성 수치인지 확인(부호로 시작하는 일반 텍스트 오탐 방지).
const SIGNED_FULL =
  /^(?:[+\-−]\s?\d[\d,]*(?:\.\d+)?\s?%(?:p|pt|포인트)?|[▲▼]\s?\d[\d,]*(?:\.\d+)?\s?%?)$/

export function signDirection(token: string): 'up' | 'down' | null {
  if (!SIGNED_FULL.test(token)) return null
  const c = token.trimStart()[0]
  if (c === '+' || c === '▲') return 'up'
  if (c === '-' || c === '−' || c === '▼') return 'down'
  return null
}
