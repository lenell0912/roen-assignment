'use client'
import { useEffect, useState } from 'react'
import { Frame } from '@/lib/frame'
import { loadFrame, isExample } from '@/lib/frameStore'
import { markStep } from '@/lib/demo'
import { PhoneFrame } from './PhoneFrame'
import { Fab } from './Fab'
import { HomeScreen } from './HomeScreen'
import { SearchScreen } from './SearchScreen'
import { StockScreen } from './StockScreen'
import { MiniApp } from './MiniApp'

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
        {screen.kind === 'home' && <HomeScreen onSearch={() => setScreen({ kind: 'search' })} />}
        {screen.kind === 'search' && (
          <SearchScreen
            onBack={() => setScreen({ kind: 'home' })}
            onPick={(s) => setScreen({ kind: 'stock', code: s.code, name: s.name })}
          />
        )}
        {screen.kind === 'stock' && (
          <StockScreen code={screen.code} name={screen.name} onBack={() => setScreen({ kind: 'search' })} />
        )}
        {screen.kind !== 'search' && agentCtx === null && (
          <Fab onClick={() => openAgent(screen.kind === 'stock' ? { code: screen.code, name: screen.name } : {})} />
        )}
        {agentCtx !== null && (
          <MiniApp
            context={agentCtx}
            frame={frame}
            onFrameChange={setFrame}
            onClose={() => setAgentCtx(null)}
          />
        )}
      </PhoneFrame>
      {/* 도슨트 패널 자리 — Task 9 */}
    </main>
  )
}
