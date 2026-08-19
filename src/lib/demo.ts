// 데모(도슨트) 진행 상태 — 프레임 안 제품이 markStep을 쏘고, 프레임 밖 패널이 구독한다.
import { resetFrame } from './frameStore'
import { clearRecords } from './records'

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
    label: 'FAB으로 코파일럿 호출',
    narration: '폰 화면 오른쪽 아래 노란 버튼(FAB)을 눌러 코파일럿을 불러보세요. 실서비스에선 페이증권 앱 어느 화면에나 떠 있습니다.',
  },
  {
    id: 'frame',
    label: '대화로 내 매매 원칙 만들기',
    narration: '칩 [내 매매 원칙 만들기]를 누르거나, 평소 매매 습관을 편하게 말해보세요. 대화에서 합의된 원칙은 자동으로 저장됩니다.',
  },
  {
    id: 'compare',
    label: '아무 종목이나 내 원칙에 대조',
    narration: '"삼성전자 지금 사도 될까?"처럼 물어보세요. 어떤 종목이든 실시간 데이터로 내 원칙에 대조하고 반대 근거까지 보여줍니다. 답은 주지 않습니다 — 판단은 당신 몫.',
  },
  {
    id: 'retro',
    label: '회고 — 원칙을 과거에 검증',
    narration: '"이 원칙으로 과거엔 어땠을까?"라고 물어보세요. 실제 과거 데이터에 원칙을 대입해 되먹입니다(정답이 아니라 참고).',
  },
  {
    id: 'wiki',
    label: '위키에서 쌓인 기록 확인',
    narration: '하단 위키 탭을 열어보세요. 원칙과 판단 기록이 쌓입니다 — 판단력이 자라는 물리적 실체입니다.',
  },
  {
    id: 'context',
    label: '⭐ 종목상세에서 다시 불러보기',
    narration: '코파일럿을 닫고, 홈에서 종목을 검색해 상세 화면으로 간 뒤 FAB을 다시 눌러보세요 — 보고 있던 화면의 맥락을 알고 옵니다.',
    bonus: true,
  },
]

export type DemoProgress = Partial<Record<DemoStepId, boolean>>

/** 다음 안내 스텝: 본 스텝 먼저, 다 되면 보너스, 전부 완료면 null */
export function nextStep(progress: DemoProgress): DemoStep | null {
  return DEMO_STEPS.find((s) => !progress[s.id]) ?? null
}

const KEY = 'demo_v1'
export const DEMO_EVENT = 'demo:update'

export function loadProgress(): DemoProgress {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as DemoProgress
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
  window.dispatchEvent(new CustomEvent(DEMO_EVENT))
}
