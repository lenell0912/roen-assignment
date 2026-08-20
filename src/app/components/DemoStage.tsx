'use client'
import { useEffect, useState } from 'react'
import { Frame } from '@/lib/frame'
import { loadFrame, isExample } from '@/lib/frameStore'
import { markStep, nextStep } from '@/lib/demo'
import { PhoneFrame } from './PhoneFrame'
import { Fab } from './Fab'
import { HomeScreen } from './HomeScreen'
import { SearchScreen } from './SearchScreen'
import { StockScreen } from './StockScreen'
import { MiniApp } from './MiniApp'
import { DocentPanel, useDemoProgress } from './DocentPanel'

export type Screen = { kind: 'home' } | { kind: 'search' } | { kind: 'stock'; code: string; name: string }
export type AgentCtx = { code?: string; name?: string }

export function DemoStage() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [agentCtx, setAgentCtx] = useState<AgentCtx | null>(null)
  const [frame, setFrame] = useState<Frame | null>(null)
  const progress = useDemoProgress()
  const next = nextStep(progress)

  useEffect(() => {
    if (!isExample()) setFrame(loadFrame())
  }, [])

  function openAgent(ctx: AgentCtx) {
    setAgentCtx(ctx)
    markStep('open')
    if (ctx.code) markStep('context')
  }

  // FAB 펄스는 제거 — 유도는 도슨트 텍스트가 담당한다 (정적 FAB)
  const searchPulse = next?.id === 'context' && screen.kind === 'home'

  return (
    <main className="min-h-screen bg-white flex items-center justify-center gap-10 p-6">
      <PhoneFrame>
        {screen.kind === 'home' && <HomeScreen onSearch={() => setScreen({ kind: 'search' })} pulseSearch={searchPulse} />}
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
          <MiniApp context={agentCtx} frame={frame} onFrameChange={setFrame} onClose={() => setAgentCtx(null)} />
        )}
      </PhoneFrame>
      <DocentPanel />
    </main>
  )
}
