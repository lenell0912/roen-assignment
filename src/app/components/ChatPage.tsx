'use client'
import { useEffect, useRef, useState } from 'react'
import type { WheelEvent as RWheelEvent, PointerEvent as RPointerEvent } from 'react'
import { Frame, rulesFromToolInput } from '@/lib/frame'
import { saveFrame } from '@/lib/frameStore'
import { addRecord } from '@/lib/records'
import { markStep } from '@/lib/demo'
import { loadChat, saveChat } from '@/lib/chat'
import { BY_KEY, moreKeys, buildRule, RULE_LIBRARY } from '@/lib/ruleLibrary'
import { CompareCard, ReviewCard, FrameSavedCard, RecordChip } from './cards'

export interface UsedTool { name: string; input: any; output?: any }
export interface StockPick { code: string; name: string; price: number; changeRate: number; volume: number; value: number }
interface Msg { role: 'user' | 'assistant'; content: string; tools?: UsedTool[]; picks?: StockPick[]; ctxGreetCode?: string; divider?: string; frameRules?: { text: string }[] }

export interface ChatCtx { code?: string; name?: string }

function openingText(hasFrame: boolean, ctx: ChatCtx): string {
  // 종목 상세에서 Frame을 부르면, 그 종목을 콕 집어 선제적으로 말을 건다(맥락 상속).
  if (ctx.name) {
    if (!hasFrame)
      return `${ctx.name} 보고 계시네요! 저는 종목을 찍어드리진 않지만, 먼저 ‘내 매매 원칙’을 만들면 이 종목이 그 원칙에 맞는지 같이 볼 수 있어요. 원칙부터 만들어볼까요?`
    return `${ctx.name} 보고 계시네요! 지금 이 종목, 세워둔 원칙에 맞는지 실데이터로 대조해볼까요? 반대 근거까지 같이 짚어드릴게요 — 아래 “${ctx.name}에 내 원칙을 대조”를 눌러도 돼요.`
  }
  if (!hasFrame)
    return (
      `안녕하세요, 곁에서 판단을 다듬는 투자 동반자 Frame이에요. ` +
      `평소 어떻게 사고파세요? 종목 고르는 기준이든 파는 타이밍이든 편하게 한두 줄로요 — 딱 안 떠오르면 제가 같이 골라드릴게요.`
    )
  return `안녕하세요, 투자 동반자 Frame이에요. 세워둔 원칙 기준으로 도와드릴게요 — 종목을 말씀하시면 실데이터로 원칙에 대조하고 반대 근거까지 짚어드려요.`
}

interface Chip { label: string; text?: string; action?: 'wiki' | 'pickStock'; emphasis?: boolean }

const KIND_BADGE: Record<string, string> = { buy: 'bg-red-50 text-red-600', sell: 'bg-blue-50 text-blue-600', risk: 'bg-amber-50 text-amber-700' }
const KIND_LABEL: Record<string, string> = { buy: '매수', sell: '매도', risk: '리스크' }

type BuiltRule = { id: string; kind: 'buy' | 'sell' | 'risk'; text: string; check?: any }

function chipsFor(hasFrame: boolean, ctx: ChatCtx): Chip[] {
  if (!hasFrame)
    return [
      { label: '막막해요 · 같이 골라줘', text: '원칙 만들기가 막막해요 — 같이 골라주세요.', emphasis: true },
      ctx.name
        ? { label: '종목 대조해보기', text: `${ctx.name} 지금 사도 될까?` }
        : { label: '종목 대조해보기', action: 'pickStock' },
      { label: '위키 보기', action: 'wiki' },
    ]
  return [
    ctx.name
      ? { label: `${ctx.name}에 내 원칙을 대조`, text: `${ctx.name} 내 원칙에 대조해줘. 지금 사도 될까?`, emphasis: true }
      : { label: '종목에 내 원칙을 대조', action: 'pickStock' },
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

// 조합 규칙 제안 슬롯 — 한 카드에서 고르고(스테이징) 숫자 조정, '다른 제안 받기'로 후보 교체, '적용하기'로 반영.
function RuleSuggestSlot({
  initialKeys,
  frame,
  onApply,
}: {
  initialKeys: string[]
  frame: Frame | null
  onApply: (shownKeys: string[], selectedRules: BuiltRule[]) => void
}) {
  const inFrame = (key: string) => !!frame?.rules.some((r) => r.id === 'lib:' + key)
  const [shown, setShown] = useState<string[]>(initialKeys)
  const [seen, setSeen] = useState<Set<string>>(() => new Set(initialKeys))
  const [params, setParams] = useState<Record<string, Record<string, number>>>({})
  const [sel, setSel] = useState<Set<string>>(() => new Set(initialKeys.filter(inFrame)))
  const [applied, setApplied] = useState(false)

  const paramsOf = (key: string) => ({ ...BY_KEY[key].params, ...(params[key] ?? {}) })

  function toggle(key: string) {
    setApplied(false)
    setSel((prev) => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }
  function adjust(key: string, name: string, dir: 1 | -1) {
    const a = BY_KEY[key].adjustable?.find((x) => x.name === name)
    if (!a) return
    setApplied(false)
    setParams((prev) => {
      const cur = { ...BY_KEY[key].params, ...(prev[key] ?? {}) }
      const next = Math.max(a.min, Math.min(a.max, (cur[name] ?? a.min) + dir * a.step))
      return { ...prev, [key]: { ...(prev[key] ?? {}), [name]: next } }
    })
  }
  function getMore() {
    const next = moreKeys([...seen], 5)
    setShown(next)
    setSeen((prev) => {
      const m = new Set([...prev, ...next])
      return m.size >= RULE_LIBRARY.length ? new Set(next) : m
    })
    setSel(new Set(next.filter(inFrame)))
    setParams({})
    setApplied(false)
  }
  function apply() {
    const selected = shown.filter((k) => sel.has(k)).map((k) => buildRule(k, params[k] ?? {})).filter(Boolean) as BuiltRule[]
    onApply(shown, selected)
    setApplied(true)
  }
  const count = sel.size

  return (
    <div className="mt-1.5 max-w-[92%] rounded-2xl bg-white border border-black/10 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="px-3.5 pt-3 pb-1.5 text-xs font-bold text-[#191919]">
        이런 규칙은 어때요? <span className="font-medium text-gray-400">눌러서 고르고, 숫자는 조정할 수 있어요</span>
      </div>
      <div className="px-1.5 pb-1">
        {shown.map((key) => {
          const rule = BY_KEY[key]
          if (!rule) return null
          const on = sel.has(key)
          const p = paramsOf(key)
          return (
            <div key={key} className="px-2 py-1.5">
              <button onClick={() => toggle(key)} className="w-full flex items-center gap-2.5 text-left">
                <span className={`shrink-0 w-4 h-4 grid place-items-center rounded-[5px] text-[10px] font-bold ${on ? 'bg-[#191919] text-white' : 'border border-gray-300 text-transparent'}`}>✓</span>
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold ${KIND_BADGE[rule.kind]}`}>{KIND_LABEL[rule.kind]}</span>
                <span className="flex-1 text-xs leading-snug text-gray-800">{rule.text(p)}</span>
              </button>
              {on && rule.adjustable && (
                <div className="mt-1.5 ml-6 flex flex-wrap gap-1.5">
                  {rule.adjustable.map((a) => (
                    <div key={a.name} className="flex items-center gap-1 rounded-full bg-gray-100 pl-0.5 pr-0.5 py-0.5">
                      <button onClick={() => adjust(key, a.name, -1)} aria-label="줄이기" className="w-5 h-5 grid place-items-center rounded-full text-gray-600 hover:bg-white text-sm leading-none">−</button>
                      <span className="min-w-[34px] text-center text-[11px] font-semibold text-[#191919]">{p[a.name]}{a.unit}</span>
                      <button onClick={() => adjust(key, a.name, 1)} aria-label="늘리기" className="w-5 h-5 grid place-items-center rounded-full text-gray-600 hover:bg-white text-sm leading-none">+</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="px-2.5 pt-1.5 pb-2 border-t border-gray-100 flex gap-2">
        <button onClick={getMore} className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-600 active:bg-gray-50">
          다른 제안 받기
        </button>
        <button
          onClick={apply}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${applied ? 'bg-emerald-50 text-emerald-700' : 'bg-[#191919] text-white active:bg-black'}`}
        >
          {applied ? `✓ 적용됨 · ${count}개 담김` : `적용하기${count ? ` (${count}개)` : ''}`}
        </button>
      </div>
      <div className="px-3.5 pb-2 text-center text-[10px] text-gray-400">참고용 예시예요 · 적용 후에도 대화로 다듬을 수 있어요</div>
    </div>
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
  onOpenDetail: (d: { kind: 'decision' | 'retro'; code?: string }) => void
  onOpenWiki: () => void
  onEditFrame: () => void
  onActivity: () => void
}) {
  const hasFrame = !!frame && frame.rules.length > 0
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: openingText(hasFrame, context), ctxGreetCode: context.code }])
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
  // 종목 상세에서 열었으면, 복원된 대화 끝에 그 종목 선제 인사를 덧붙여 '먼저 말 거는' 순간을 보장(코드 기준 중복 방지).
  useEffect(() => {
    const saved = loadChat() as Msg[]
    if (saved.length) {
      const last = saved[saved.length - 1]
      if (context.code && last?.ctxGreetCode !== context.code) {
        saved.push({ role: 'assistant', content: '', divider: '여기까지 읽었어요' })
        saved.push({ role: 'assistant', content: openingText(hasFrame, context), ctxGreetCode: context.code })
      }
      setMsgs(saved)
    }
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
          messages: next.filter((m, i) => !m.divider && !(i === 0 && m.role === 'assistant')).map((m) => ({ role: m.role, content: m.content })),
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

  // '종목에 내 원칙을 대조' 칩 — 바로 특정 종목으로 가지 않고 "어떤 종목?"을 되물으며
  // 지금 거래량 많은 종목 top5(실데이터)를 대화 안에서 선택지로 제시한다.
  async function askWhichStock() {
    if (loading) return
    onActivity()
    setLoading(true)
    let picks: StockPick[] = []
    try {
      const j = await (await fetch('/api/hot')).json()
      if (Array.isArray(j.stocks)) picks = j.stocks
    } catch {}
    setLoading(false)
    const content = picks.length
      ? '어떤 종목을 대조해볼까요? 지금 거래대금이 많은 종목이에요 — 눌러서 고르거나, 다른 종목명을 입력해도 돼요.'
      : '어떤 종목을 대조해볼까요? 종목명을 입력해 주세요. (예: 삼성전자)'
    setMsgs((m) => [...m, { role: 'assistant', content, picks }])
  }

  // 'suggest_rules' 슬롯의 '적용하기' — 슬롯에 표시된 규칙들만 선택 상태로 동기화(고른 건 담고 뺀 건 제거).
  // 슬롯에 없는 다른 규칙은 그대로 둔다.
  function applyLibSelection(shownKeys: string[], selectedRules: BuiltRule[]) {
    const wasEmpty = !(frame && frame.rules.length)
    const shownIds = new Set(shownKeys.map((k) => 'lib:' + k))
    const kept = (frame?.rules ?? []).filter((r) => !shownIds.has(r.id))
    const rules = [...kept, ...selectedRules]
    const f: Frame = { rules, updatedAt: new Date().toISOString() }
    saveFrame(f)
    onFrameSaved(f)
    if (rules.length) markStep('frame')
    onActivity()
    // 적용 후 에이전트가 정리 카드 + (첫 생성이면) 종목 대조 제안을 선제적으로 띄운다
    if (!rules.length) return
    const added: Msg[] = [
      {
        role: 'assistant',
        content: wasEmpty ? '좋아요, 매매 원칙을 이렇게 정리했어요! 언제든 위키에서 다듬을 수 있어요.' : '원칙을 업데이트했어요. 지금은 이렇게예요.',
        frameRules: rules.map((r) => ({ text: r.text })),
      },
    ]
    if (wasEmpty)
      added.push({
        role: 'assistant',
        content: '이제 종목을 말해주시면 이 원칙에 실데이터로 대조해드릴게요 — 예: “삼성전자 지금 사도 될까?” 아래 “종목에 내 원칙을 대조” 칩으로도 바로 눌러볼 수 있어요.',
      })
    setMsgs((m) => [...m, ...added])
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
          priceAtDecision: t.output.quote?.price,
          note: '(대화 중 자동 기록)',
        })
        markStep('compare')
      }
      if (t.name === 'review_trades' && t.output?.summary) markStep('retro')
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [msgs, loading])

  const chips = chipsFor(hasFrame, context)

  return (
    <div className="relative h-full">
      <div ref={scrollRef} style={{ paddingBottom: barH + 8 }} className="absolute inset-0 overflow-y-auto ios-scroll px-3 pt-3 space-y-3 bg-[#F1F3F5]">
        {msgs.map((m, i) =>
          m.divider ? (
            <div key={i} className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-black/10" />
              <span className="shrink-0 text-[10px] font-medium text-gray-400 whitespace-nowrap">{m.divider}</span>
              <div className="flex-1 h-px bg-black/10" />
            </div>
          ) : (
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
              if (t.name === 'review_trades' && t.output?.summary)
                return <ReviewCard key={k} result={t.output} onExpand={() => onOpenDetail({ kind: 'retro', code: t.input?.code })} />
              if (t.name === 'update_frame')
                return <FrameSavedCard key={k} rules={rulesFromToolInput(t.input)} onExpand={onOpenWiki} onEdit={onEditFrame} />
              if (t.name === 'suggest_rules' && t.output?.rules?.length)
                return <RuleSuggestSlot key={k} initialKeys={t.output.rules.map((r: any) => r.key)} frame={frame} onApply={applyLibSelection} />
              return null
            })}
            {m.frameRules?.length ? <FrameSavedCard rules={m.frameRules} onExpand={onOpenWiki} onEdit={onEditFrame} /> : null}
            {m.picks?.length ? (
              <div className="mt-1.5 flex flex-col gap-1.5 max-w-[88%]">
                {m.picks.map((p, k) => {
                  const up = p.changeRate >= 0
                  return (
                    <button
                      key={p.code}
                      onClick={() => send(hasFrame ? `${p.name} 내 원칙에 대조해줘. 지금 사도 될까?` : `${p.name} 지금 사도 될까?`)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-black/10 hover:border-black/25 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors"
                    >
                      <span className="w-4 shrink-0 text-[11px] font-semibold text-gray-400">{k + 1}</span>
                      <span className="font-semibold text-sm">{p.name}</span>
                      <span className="ml-auto text-right leading-tight">
                        <span className="block text-sm">{p.price.toLocaleString()}원</span>
                        <span className={`block text-[11px] ${up ? 'text-red-500' : 'text-blue-500'}`}>
                          {up ? '▲' : '▼'} {Math.abs(p.changeRate).toFixed(2)}%
                        </span>
                      </span>
                    </button>
                  )
                })}
                <span className="px-1 text-[10px] text-gray-400">거래대금 상위 · 실데이터(전 거래일 기준)</span>
              </div>
            ) : null}
          </div>
          )
        )}
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
              if (c.action === 'wiki') return onOpenWiki()
              if (c.action === 'pickStock') return askWhichStock()
              send(c.text!)
            }}
            className={
              c.emphasis
                ? 'shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-[#FFEC47] text-[#191919] hover:bg-[#FFE01A] transition-colors'
                : 'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-[#FFF3BF] text-[#191919] hover:bg-[#FFEA8A] transition-colors'
            }
          >
            {c.emphasis ? `✦ ${c.label}` : c.label}
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
