'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DEMO_STEPS, DEMO_EVENT, DemoProgress, loadProgress, nextStep, resetDemo } from '@/lib/demo'

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

// 배지는 '실제로 시세를 서빙하는 제공자'(/api/health의 provider)를 정직하게 표기한다.
// provider=toss일 때만 tossLive로 실호출/폴백을 가르고, provider=yahoo면 Yahoo가 서빙 중임을 밝힌다.
function providerBadge(provider: string | null, tossLive: boolean | null): string {
  if (provider === null || tossLive === null) return '시세·차트 — 제공자 연결 확인 중…'
  if (provider === 'yahoo') return '시세·차트 — Yahoo Finance 실호출 중 (토스 연동은 코드·로컬 실호출 검증 완료)'
  return tossLive
    ? '시세·차트 — 토스증권 오픈API 실호출 중'
    : '시세·차트 — 토스는 서버 IP 정책으로 차단 → Yahoo 자동 폴백 중 (토스 연동은 코드·로컬 실호출 검증 완료)'
}

const STATIC_BADGES: { label: string; kind: 'live' | 'mock' }[] = [
  { label: 'Frame 응답·대조·백테스트 — LLM + 실데이터 라이브', kind: 'live' },
  { label: '원칙·판단 기록 — 브라우저 로컬 저장(실동작)', kind: 'live' },
  { label: '홈 화면·주문·커뮤니티 공유 — 목업(연출)', kind: 'mock' },
]

export function DocentPanel() {
  const progress = useDemoProgress()
  const next = nextStep(progress)
  const done = DEMO_STEPS.filter((s) => progress[s.id]).length
  const [health, setHealth] = useState<{ provider: string | null; tossLive: boolean | null }>({ provider: null, tossLive: null })
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j) => setHealth({ provider: j.provider ?? null, tossLive: !!j.tossLive }))
      .catch(() => setHealth({ provider: null, tossLive: false }))
  }, [])
  const BADGES: { label: string; kind: 'live' | 'mock' }[] = [
    { label: providerBadge(health.provider, health.tossLive), kind: 'live' },
    ...STATIC_BADGES,
  ]

  function onReset() {
    if (!confirm('원칙·판단 기록·진행 상태를 모두 초기화할까요?')) return
    resetDemo()
    location.reload()
  }

  const body = (
    <>
      <div>
        <div className="text-xs font-bold text-gray-400 tracking-wide">데모 가이드 · 프로토타입 밖 안내</div>
        <div className="mt-1 text-lg font-bold">이렇게 경험해보세요</div>
        <div className="text-xs text-gray-500">
          정해진 대본은 없습니다 — 아무 종목, 아무 질문으로 벗어나도 동작합니다. ({done}/{DEMO_STEPS.length})
        </div>
      </div>

      <ol className="space-y-1.5">
        {DEMO_STEPS.map((s, i) => {
          const isDone = !!progress[s.id]
          const isNext = next?.id === s.id
          return (
            <li
              key={s.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : isNext ? 'border-yellow-400 bg-yellow-50' : 'text-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs w-4">{isDone ? '✅' : `${i + 1}`}</span>
                <span className={isDone ? 'line-through' : isNext ? 'font-semibold text-gray-800' : ''}>{s.label}</span>
              </div>
              {isNext && <div className="mt-1 ml-6 text-xs text-gray-600">{s.narration}</div>}
            </li>
          )
        })}
      </ol>

      <div>
        <div className="text-xs font-semibold text-gray-500 mb-1.5">무엇이 진짜인가요?</div>
        <div className="space-y-1">
          {BADGES.map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className={`shrink-0 px-1.5 py-0.5 rounded font-semibold ${b.kind === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {b.kind === 'live' ? 'LIVE' : 'MOCK'}
              </span>
              {b.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Link href="/prd" className="text-sm font-semibold bg-[#fee500] px-3 py-1.5 rounded-full">📄 기획서(PRD)</Link>
        <button onClick={onReset} className="text-xs text-gray-400 underline">🔄 데모 초기화</button>
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

function MobileSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-50">
      <button onClick={() => setOpen(!open)} className="w-full bg-black text-white text-sm py-2.5">
        {open ? '▼ 가이드 접기' : '▲ 데모 가이드 보기'}
      </button>
      {open && <div className="bg-white border-t p-4 space-y-4 max-h-[55vh] overflow-y-auto">{children}</div>}
    </div>
  )
}
