'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DEMO_STEPS, DEMO_EVENT, DemoProgress, DemoStepId, loadProgress, nextStep, resetDemo } from '@/lib/demo'

export function useDemoProgress(): DemoProgress {
  const [p, setP] = useState<DemoProgress>({})
  useEffect(() => {
    setP(loadProgress())
    const h = () => setP(loadProgress())
    window.addEventListener(DEMO_EVENT, h)
    return () => window.removeEventListener(DEMO_EVENT, h)
  }, [])
  return p
}

export function DocentPanel() {
  const progress = useDemoProgress()
  const next = nextStep(progress)
  const done = DEMO_STEPS.filter((s) => progress[s.id]).length
  // 완료된 스텝은 클릭으로 펼쳐볼 수 있다
  const [openDone, setOpenDone] = useState<Set<DemoStepId>>(() => new Set())
  function toggleDone(id: DemoStepId) {
    setOpenDone((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function onReset() {
    if (!confirm('프로토타입 입력 정보(내 원칙·판단 기록·진행 상태)를 모두 초기화할까요?')) return
    resetDemo()
    location.reload()
  }

  const body = (
    <>
      {/* 상단 액션: 기획서 */}
      <div className="flex items-center gap-3">
        <Link href="/prd" className="text-sm font-semibold bg-[#FFEC47] px-3 py-1.5 rounded-full">
          📄 기획서(PRD)
        </Link>
      </div>

      <div>
        <div className="text-xs font-bold text-gray-400 tracking-wide">과제 프로토타입 가이드</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-lg font-bold">이렇게 경험해보세요</span>
          <span className="text-[11px] font-semibold text-gray-400">
            {done}/{DEMO_STEPS.length}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-gray-500 leading-relaxed">
          정해진 시나리오는 없지만, 루프 형태의 서비스다 보니 정석적인 플로우 경험을 제안드립니다.
        </div>
      </div>

      <ol className="space-y-1.5">
        {DEMO_STEPS.map((s, i) => {
          const isDone = !!progress[s.id]
          const isNext = next?.id === s.id
          const expanded = isNext || (isDone && openDone.has(s.id))
          const Row = isDone ? 'button' : 'div'
          return (
            <li
              key={s.id}
              className={`rounded-xl border px-3 py-2.5 ${
                isDone
                  ? 'bg-emerald-50 border-emerald-200'
                  : isNext
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-100'
              }`}
            >
              <Row
                {...(isDone ? { onClick: () => toggleDone(s.id), 'aria-expanded': expanded } : {})}
                className={`w-full flex items-center gap-2 text-sm text-left ${isDone ? 'cursor-pointer' : ''}`}
              >
                <span className="text-xs w-4 shrink-0">{isDone ? '✅' : `${i + 1}`}</span>
                <span
                  className={`font-semibold ${
                    isDone ? 'text-emerald-700' : isNext ? 'text-gray-900' : 'text-gray-700'
                  }`}
                >
                  {s.label}
                </span>
                {isDone && <Chevron className={`ml-auto shrink-0 text-emerald-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
              </Row>
              {expanded && <div className="mt-1 ml-6 text-xs leading-relaxed text-gray-700">{s.narration}</div>}
            </li>
          )
        })}
      </ol>

      <div className="text-[11px] text-gray-400 leading-relaxed">
        ※ Frame은 투자·내 프레임 관련 질문에만 답해요 — 그 외 요청은 정중히 사양합니다.
      </div>

      {/* 하단 액션: 입력 정보 초기화 */}
      <div className="pt-1">
        <button onClick={onReset} className="text-xs text-gray-400 underline">
          🔄 프로토타입 입력 정보 초기화
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* 데스크톱: 사이드 패널 */}
      <aside className="hidden lg:flex flex-col gap-4 w-[340px] shrink-0">{body}</aside>
      {/* 모바일: 접히는 하단 시트 */}
      <MobileSheet>{body}</MobileSheet>
    </>
  )
}

function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MobileSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-50">
      <button onClick={() => setOpen(!open)} className="w-full bg-black text-white text-sm py-2.5">
        {open ? '▼ 가이드 접기' : '▲ 과제 프로토타입 가이드 보기'}
      </button>
      {open && <div className="bg-white border-t p-4 space-y-4 max-h-[55vh] overflow-y-auto">{children}</div>}
    </div>
  )
}
