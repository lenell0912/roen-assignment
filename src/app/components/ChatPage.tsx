'use client'
import { useEffect, useRef, useState } from 'react'
import type { WheelEvent as RWheelEvent, PointerEvent as RPointerEvent } from 'react'
import { Frame, rulesFromToolInput } from '@/lib/frame'
import { saveFrame } from '@/lib/frameStore'
import { addRecord } from '@/lib/records'
import { markStep } from '@/lib/demo'
import { loadChat, saveChat } from '@/lib/chat'
import { CompareCard, BacktestCard, FrameSavedCard, RecordChip } from './cards'

export interface UsedTool { name: string; input: any; output?: any }
interface Msg { role: 'user' | 'assistant'; content: string; tools?: UsedTool[] }

export interface ChatCtx { code?: string; name?: string }

function openingText(hasFrame: boolean, ctx: ChatCtx): string {
  const where = ctx.name ? `지금 ${ctx.name} 보고 계셨네요! ` : ''
  if (!hasFrame)
    return (
      `${where}안녕하세요, 곁에서 함께 판단을 다듬는 투자 동반자 Frame이에요. ` +
      `아직 매매 원칙이 없으시네요 — 5분이면 같이 만들 수 있어요. 평소 뭘 보고 사고파는지 편하게 말해주셔도 좋아요!`
    )
  return `${where}안녕하세요, 투자 동반자 Frame이에요. 세워둔 원칙 기준으로 도와드릴게요 — 종목을 말씀하시면 실데이터로 원칙에 대조하고 반대 근거까지 짚어드려요.`
}

interface Chip { label: string; text?: string; action?: 'wiki' }

function chipsFor(hasFrame: boolean, ctx: ChatCtx): Chip[] {
  if (!hasFrame)
    return [
      { label: '내 매매 원칙 만들기', text: '내 매매 원칙을 만들고 싶어. 뭐부터 정하면 좋아?' },
      { label: '종목 대조해보기', text: ctx.name ? `${ctx.name} 지금 사도 될까?` : '삼성전자 지금 사도 될까?' },
      { label: '위키 보기', action: 'wiki' },
    ]
  return [
    {
      label: ctx.name ? `${ctx.name} 내 원칙에 대조` : '종목 내 원칙에 대조',
      text: ctx.name ? `${ctx.name} 내 원칙에 대조해줘. 지금 사도 될까?` : '삼성전자 내 원칙에 대조해줘. 지금 사도 될까?',
    },
    { label: '과거 검증(회고)', text: ctx.name ? `내 원칙을 ${ctx.name} 과거 데이터로 검증해줘` : '내 원칙을 삼성전자 과거 데이터로 검증해줘' },
    { label: '원칙 다듬기', text: '내 원칙 중에 다듬거나 추가할 게 있는지 같이 봐줘' },
    { label: '위키', action: 'wiki' },
  ]
}

// 에이전트 발화용 경량 마크다운 — **볼드**, 불릿(-/•), 번호목록, 줄바꿈만 처리
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(p)
    return m ? <strong key={i} className="font-bold">{m[1]}</strong> : <span key={i}>{p}</span>
  })
}

function MessageText({ content }: { content: string }) {
  return (
    <>
      {content.split('\n').map((line, i) => {
        const bullet = /^\s*[-•]\s+(.*)$/.exec(line)
        if (bullet)
          return (
            <div key={i} className="flex gap-1.5">
              <span className="shrink-0">•</span>
              <span>{renderInline(bullet[1])}</span>
            </div>
          )
        const num = /^\s*(\d+)\.\s+(.*)$/.exec(line)
        if (num)
          return (
            <div key={i} className="flex gap-1.5">
              <span className="shrink-0">{num[1]}.</span>
              <span>{renderInline(num[2])}</span>
            </div>
          )
        return line.trim() ? <div key={i}>{renderInline(line)}</div> : <div key={i} className="h-2" />
      })}
    </>
  )
}

export function ChatPage({
  context,
  frame,
  onFrameSaved,
  onOpenDetail,
  onOpenWiki,
  onEditFrame,
  onActivity,
}: {
  context: ChatCtx
  frame: Frame | null // null = 내 원칙 없음
  onFrameSaved: (f: Frame) => void
  onOpenDetail: (d: { kind: 'decision' | 'retro'; code: string }) => void
  onOpenWiki: () => void
  onEditFrame: () => void
  onActivity: () => void
}) {
  const hasFrame = !!frame && frame.rules.length > 0
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: openingText(hasFrame, context) }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [barH, setBarH] = useState(96)

  // 입력창 자동 높이(최대 120px) + 하단 바 높이 측정 → 채팅 하단 여백에 반영
  useEffect(() => {
    const ta = taRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
    if (barRef.current) setBarH(barRef.current.offsetHeight)
  }, [input])

  // 하단 바 높이가 바뀌면(입력창 커짐 등) 마지막 말풍선이 가리지 않게 하단으로 스크롤
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [barH])

  // 칩 가로 스크롤 — 마우스 휠(세로→가로) + 드래그(마우스). 터치는 네이티브 스와이프.
  const chipRowRef = useRef<HTMLDivElement>(null)
  const chipDrag = useRef({ x: 0, left: 0, active: false, moved: false })
  function chipWheel(e: RWheelEvent) {
    const el = chipRowRef.current
    if (el && e.deltaY) el.scrollLeft += e.deltaY
  }
  function chipDown(e: RPointerEvent) {
    if (e.pointerType !== 'mouse') return
    const el = chipRowRef.current
    if (!el) return
    chipDrag.current = { x: e.clientX, left: el.scrollLeft, active: true, moved: false }
  }
  function chipMove(e: RPointerEvent) {
    const d = chipDrag.current
    const el = chipRowRef.current
    if (!d.active || !el) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 4) d.moved = true
    el.scrollLeft = d.left - dx
  }
  function chipUp() {
    chipDrag.current.active = false
  }

  // 저장된 대화 복원(있으면). SSR 하이드레이션 미스매치 방지 위해 마운트 후에만.
  useEffect(() => {
    const saved = loadChat()
    if (saved.length) setMsgs(saved as Msg[])
    setHydrated(true)
  }, [])

  // 대화가 바뀔 때마다 저장 (복원 완료 후에만 — 초기 오프닝이 저장분을 덮지 않도록)
  useEffect(() => {
    if (hydrated) saveChat(msgs)
  }, [msgs, hydrated])

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
    <div className="relative h-full">
      <div ref={scrollRef} style={{ paddingBottom: barH + 8 }} className="absolute inset-0 overflow-y-auto ios-scroll px-3 pt-3 space-y-3 bg-[#F1F3F5]">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block px-3 py-2 rounded-2xl text-sm text-left max-w-[88%] ${
                m.role === 'user' ? 'bg-[#FFEC47]' : 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              }`}
            >
              {m.role === 'assistant' ? <MessageText content={m.content} /> : <span className="whitespace-pre-wrap">{m.content}</span>}
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
                return <FrameSavedCard key={k} rules={rulesFromToolInput(t.input)} onExpand={onOpenWiki} onEdit={onEditFrame} />
              return null
            })}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400">Frame이 실데이터로 확인 중…</div>}
      </div>

      {/* 하단 바 — 반투명 디바이더 + 칩 + 입력. 채팅이 이 아래로 스크롤된다. */}
      <div ref={barRef} className="absolute inset-x-0 bottom-0 border-t border-black/10 bg-white/70 backdrop-blur-md">
        {/* 상태 적응 칩 — 스크롤바 숨김 + 드래그·휠 가로 스크롤 */}
        <div
          ref={chipRowRef}
          onWheel={chipWheel}
          onPointerDown={chipDown}
          onPointerMove={chipMove}
          onPointerUp={chipUp}
          onPointerLeave={chipUp}
          className="px-3 pt-2 pb-1.5 flex gap-1.5 overflow-x-auto ios-scroll select-none cursor-grab active:cursor-grabbing"
        >
          {chips.map((c) => (
          <button
            key={c.label}
            onClick={() => {
              if (chipDrag.current.moved) {
                chipDrag.current.moved = false
                return
              }
              c.action === 'wiki' ? onOpenWiki() : send(c.text!)
            }}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-[#FFF3BF] text-[#191919] hover:bg-[#FFEA8A] transition-colors"
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="px-3 pb-2 pt-1 flex gap-2 items-end">
        <textarea
          ref={taRef}
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // 한글 IME 조합 중(Enter로 조합 확정)에는 전송하지 않는다 — 조합 잔여 글자 버그 방지
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send(input)
            }
          }}
          className="flex-1 border rounded-2xl px-4 py-2 text-sm min-w-0 resize-none overflow-y-auto leading-relaxed ios-scroll"
          placeholder={hasFrame ? '예: 삼성전자 지금 사도 될까?' : '예: 내 매매 원칙 만들래'}
        />
        <button onClick={() => send(input)} className="px-4 h-9 rounded-full bg-black text-white text-sm shrink-0">
          전송
        </button>
        </div>
      </div>
    </div>
  )
}
