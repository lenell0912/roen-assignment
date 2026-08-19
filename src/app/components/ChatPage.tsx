'use client'
import { useEffect, useRef, useState } from 'react'
import { Frame, rulesFromToolInput } from '@/lib/frame'
import { saveFrame } from '@/lib/frameStore'
import { addRecord } from '@/lib/records'
import { markStep } from '@/lib/demo'
import { CompareCard, BacktestCard, FrameSavedCard, RecordChip } from './cards'

export interface UsedTool { name: string; input: any; output?: any }
interface Msg { role: 'user' | 'assistant'; content: string; tools?: UsedTool[] }

export interface ChatCtx { code?: string; name?: string }

function openingText(hasFrame: boolean, ctx: ChatCtx): string {
  const where = ctx.name ? `지금 ${ctx.name} 화면 보고 있었네? ` : ''
  if (!hasFrame)
    return (
      `${where}반가워! 난 답을 주는 봇이 아니라, 너만의 매매 원칙을 같이 만들고 지키게 돕는 코파일럿이야.\n` +
      `아직 원칙이 없네 — 그것부터 만들어볼까? 5분이면 돼. 평소에 뭘 보고 사고파는지 편하게 말해줘도 좋아.`
    )
  return `${where}네 원칙 기준으로 도와줄게. 종목을 물어보면 실데이터로 원칙에 대조하고, 반대 근거까지 보여줄게.`
}

interface Chip { label: string; text?: string; action?: 'wiki' }

function chipsFor(hasFrame: boolean, ctx: ChatCtx): Chip[] {
  if (!hasFrame)
    return [
      { label: '📋 내 매매 원칙 만들기', text: '내 매매 원칙을 만들고 싶어. 뭐부터 정하면 좋아?' },
      { label: '🎯 종목 대조해보기', text: ctx.name ? `${ctx.name} 지금 사도 될까?` : '삼성전자 지금 사도 될까?' },
      { label: '🗂 위키 보기', action: 'wiki' },
    ]
  return [
    {
      label: ctx.name ? `🎯 ${ctx.name} 내 원칙에 대조` : '🎯 종목 내 원칙에 대조',
      text: ctx.name ? `${ctx.name} 내 원칙에 대조해줘. 지금 사도 될까?` : '삼성전자 내 원칙에 대조해줘. 지금 사도 될까?',
    },
    { label: '🔁 과거 검증(회고)', text: ctx.name ? `내 원칙을 ${ctx.name} 과거 데이터로 검증해줘` : '내 원칙을 삼성전자 과거 데이터로 검증해줘' },
    { label: '📋 원칙 다듬기', text: '내 원칙 중에 다듬거나 추가할 게 있는지 같이 봐줘' },
    { label: '🗂 위키', action: 'wiki' },
  ]
}

export function ChatPage({
  context,
  frame,
  onFrameSaved,
  onOpenDetail,
  onOpenWiki,
  onActivity,
}: {
  context: ChatCtx
  frame: Frame | null // null = 내 원칙 없음
  onFrameSaved: (f: Frame) => void
  onOpenDetail: (d: { kind: 'decision' | 'retro'; code: string }) => void
  onOpenWiki: () => void
  onActivity: () => void
}) {
  const hasFrame = !!frame && frame.rules.length > 0
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: openingText(hasFrame, context) }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function send(text: string) {
    const t = text.trim()
    if (!t || loading) return
    onActivity()
    const next: Msg[] = [...msgs, { role: 'user', content: t }]
    setMsgs(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter((m, i) => !(i === 0 && m.role === 'assistant')).map((m) => ({ role: m.role, content: m.content })),
          context: { code: context.code, name: context.name, frame: hasFrame ? frame : undefined },
        }),
      })
      const j = await res.json()
      const tools: UsedTool[] = j.usedTools ?? []
      handleSideEffects(tools)
      setMsgs([...next, { role: 'assistant', content: j.reply ?? j.error ?? '오류가 났어.', tools }])
    } catch {
      setMsgs([...next, { role: 'assistant', content: '네트워크 오류가 났어. 다시 시도해줘.' }])
    }
    setLoading(false)
  }

  // 도구 사용의 클라이언트 부수효과: 프레임 저장 · 자동 기록 · 데모 스텝 체크
  function handleSideEffects(tools: UsedTool[]) {
    for (const t of tools) {
      if (t.name === 'update_frame') {
        const rules = rulesFromToolInput(t.input)
        if (rules.length) {
          const f: Frame = { rules, updatedAt: new Date().toISOString() }
          saveFrame(f)
          onFrameSaved(f)
          markStep('frame')
        }
      }
      if (t.name === 'compare_to_frame' && t.output?.summary) {
        addRecord({
          code: t.output.code,
          okCount: t.output.summary.ok,
          violateCount: t.output.summary.violate,
          naCount: t.output.summary.na,
          note: '(대화 중 자동 기록)',
        })
        markStep('compare')
      }
      if (t.name === 'run_backtest' && t.output?.supported) markStep('retro')
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [msgs, loading])

  const chips = chipsFor(hasFrame, context)

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap text-left max-w-[88%] ${
                m.role === 'user' ? 'bg-[#fae100]' : 'bg-gray-100'
              }`}
            >
              {m.content}
            </div>
            {m.tools?.map((t, k) => {
              if (t.name === 'compare_to_frame' && t.output?.summary)
                return (
                  <div key={k}>
                    <CompareCard result={t.output} onExpand={() => onOpenDetail({ kind: 'decision', code: t.output.code })} />
                    <RecordChip onOpenWiki={onOpenWiki} />
                  </div>
                )
              if (t.name === 'run_backtest' && t.output?.supported)
                return <BacktestCard key={k} result={t.output} onExpand={() => onOpenDetail({ kind: 'retro', code: t.output.code })} />
              if (t.name === 'update_frame')
                return <FrameSavedCard key={k} rules={rulesFromToolInput(t.input)} onExpand={onOpenWiki} />
              return null
            })}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400">코파일럿이 실데이터로 확인 중…</div>}
      </div>

      {/* 상태 적응 칩 */}
      <div className="px-3 pb-1.5 flex gap-1.5 overflow-x-auto">
        {chips.map((c) => (
          <button
            key={c.label}
            onClick={() => (c.action === 'wiki' ? onOpenWiki() : send(c.text!))}
            className="shrink-0 text-xs px-2.5 py-1.5 rounded-full border bg-white hover:border-yellow-400"
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="px-3 pb-3 pt-1 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          className="flex-1 border rounded-full px-4 py-2 text-sm min-w-0"
          placeholder={hasFrame ? '예: 에코프로비엠 지금 사도 될까?' : '예: 내 매매 원칙 만들래'}
        />
        <button onClick={() => send(input)} className="px-4 rounded-full bg-black text-white text-sm shrink-0">
          전송
        </button>
      </div>
    </div>
  )
}
