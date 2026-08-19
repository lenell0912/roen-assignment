'use client'
import { useEffect, useState } from 'react'
import { Frame } from '@/lib/frame'
import { loadFrame, isExample } from '@/lib/frameStore'
import { markStep } from '@/lib/demo'
import { PhoneFrame } from './PhoneFrame'
import { Fab } from './Fab'

export type Screen = { kind: 'home' } | { kind: 'search' } | { kind: 'stock'; code: string; name: string }
export type AgentCtx = { code?: string; name?: string }

export function DemoStage() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [agentCtx, setAgentCtx] = useState<AgentCtx | null>(null) // null = 코파일럿 닫힘
  const [frame, setFrame] = useState<Frame | null>(null) // null = 내 원칙 아직 없음(예시만 존재)

  // SSR 불일치 방지: 마운트 후 localStorage에서 읽는다
  useEffect(() => {
    if (!isExample()) setFrame(loadFrame())
  }, [])

  function openAgent(ctx: AgentCtx) {
    setAgentCtx(ctx)
    markStep('open')
    if (ctx.code) markStep('context') // 종목상세에서 호출 = 맥락 상속(보너스)
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center gap-8 p-6">
      <PhoneFrame>
        {/* 임시 플레이스홀더 — Task 6~8에서 홈/검색/상세/미니앱으로 교체 */}
        <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">
          화면 준비 중 ({screen.kind})
        </div>
        <Fab onClick={() => openAgent(screen.kind === 'stock' ? { code: screen.code, name: screen.name } : {})} />
      </PhoneFrame>
      {/* 도슨트 패널 자리 — Task 9 */}
    </main>
  )
}
