'use client'
// 데모(도슨트) 진행 상태 — 프레임 안 제품이 markStep을 쏘고, 프레임 밖 패널이 구독한다.
import { resetFrame } from './frameStore'
import { clearRecords } from './records'
import { clearChat } from './chat'

export type DemoStepId = 'open' | 'frame' | 'compare' | 'retro' | 'wiki' | 'context'

export interface DemoStep {
  id: DemoStepId
  label: string
  narration: string
  bonus?: boolean
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'open',
    label: 'FAB으로 Frame 호출하기',
    narration:
      '폰 오른쪽 아래 노란 "Frame" 버튼을 눌러보세요. Frame은 페이증권 앱 어느 화면에서든 한 번에 부를 수 있는 AI 투자 동반자입니다. 종목을 찍어주는 봇이 아니라, 당신의 판단 기준(프레임)을 함께 만들고 지켜주는 에이전트예요.',
  },
  {
    id: 'frame',
    label: '① 내 매매 원칙(프레임) 만들기',
    narration:
      '칩 [내 매매 원칙 만들기]를 누르거나 평소 매매 습관을 편하게 말해보세요. Frame이 소크라테스식으로 되물어 "왜 사고 언제 파는지" 규칙을 끌어내 저장합니다. 이 원칙이 앞으로 모든 판단의 기준점이 됩니다.',
  },
  {
    id: 'compare',
    label: '② 아무 종목을 내 원칙에 대조 + 반대근거',
    narration:
      '"삼성전자 지금 사도 될까?"처럼 물어보세요. 실시간·실데이터로 그 종목을 당신의 원칙에 대조하고, 일부러 반대 근거(악마의 변호인)까지 보여줍니다. 답은 주지 않아요 — 근거 있는 결정을 늘려 뇌동·추격매수를 막는 게 핵심입니다.',
  },
  {
    id: 'retro',
    label: '③ 회고 — 원칙을 과거에 검증하고 진화',
    narration:
      '"내 원칙으로 과거엔 어땠을까?"라고 물어보세요. 실제 과거 데이터에 원칙을 대입(백테스트-라이트)해 규칙별 성과를 채점하고 개선안을 제안합니다. 운과 실력을 분리해 판단력이 자라는 되먹임 루프입니다. (정답이 아니라 참고)',
  },
  {
    id: 'wiki',
    label: '④ 위키에 쌓이는 내 컨텍스트 확인',
    narration:
      '하단 위키 탭을 열어보세요. 원칙·판단 기록·회고가 쌓이는 LLM 위키입니다. 오래 쓸수록 나에게만 맞춰진 컨텍스트가 되어 개인화와 매매법 개선의 재료가 됩니다 — 경쟁사가 복제할 수 없는 나만의 자산이에요.',
  },
  {
    id: 'context',
    label: '⭐ 종목상세에서 다시 불러 맥락 상속 (보너스)',
    narration:
      'Frame을 닫고 홈에서 종목을 검색해 상세로 간 뒤, FAB을 다시 눌러보세요. 보고 있던 화면(종목)을 알아채고 첫마디를 건넵니다 — "결정 직전, 바로 그 자리"에서 개입하는 것이 Frame의 차별점입니다.',
    bonus: true,
  },
]

export type DemoProgress = Partial<Record<DemoStepId, boolean>>

/** 다음 안내 스텝(전부 완료면 null). bonus 스텝이 배열 마지막이라는 전제(테스트로 고정)에 의존한다. */
export function nextStep(progress: DemoProgress): DemoStep | null {
  return DEMO_STEPS.find((s) => !progress[s.id]) ?? null
}

const KEY = 'demo_v1'
export const DEMO_EVENT = 'demo:update'

export function loadProgress(): DemoProgress {
  if (typeof window === 'undefined') return {}
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as DemoProgress) : {}
  } catch {
    return {}
  }
}

export function markStep(id: DemoStepId): void {
  if (typeof window === 'undefined') return
  const cur = loadProgress()
  if (cur[id]) return
  localStorage.setItem(KEY, JSON.stringify({ ...cur, [id]: true }))
  window.dispatchEvent(new CustomEvent(DEMO_EVENT))
}

/** 데모 초기화 — 원칙·기록·진행 전부 삭제 */
export function resetDemo(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
  resetFrame()
  clearRecords()
  clearChat()
  window.dispatchEvent(new CustomEvent(DEMO_EVENT))
}
