'use client'
import { useEffect, useRef, useState } from 'react'
import { Frame } from '@/lib/frame'

interface Msg { role: 'user' | 'assistant'; content: string; tools?: string[] }

export function ChatPage({
  code,
  frame,
  seed,
  onOpenPage,
}: {
  code: string
  frame: Frame
  seed?: string
  onOpenPage: (tab: string) => void
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function send(text: string) {
    const t = text.trim()
    if (!t || loading) return
    const next: Msg[] = [...msgs, { role: 'user', content: t }]
    setMsgs(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: { code, frame },
        }),
      })
      const j = await res.json()
      setMsgs([
        ...next,
        { role: 'assistant', content: j.reply ?? j.error ?? '오류가 났어.', tools: (j.usedTools ?? []).map((x: any) => x.name) },
      ])
    } catch {
      setMsgs([...next, { role: 'assistant', content: '네트워크 오류가 났어. 다시 시도해줘.' }])
    }
    setLoading(false)
  }

  // 시나리오 패널에서 넘어온 seed 자동 전송
  const seenSeed = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (seed && seed !== seenSeed.current) {
      seenSeed.current = seed
      send(seed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [msgs, loading])

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="text-sm text-gray-400 mt-6 text-center">
            종목을 물어보거나, 네 매매 원칙부터 만들어보자.
            <br />예: "삼성전자 지금 사도 될까?" · "내 매매 원칙 만들래"
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap text-left max-w-[85%] ${
                m.role === 'user' ? 'bg-[#fae100]' : 'bg-gray-100'
              }`}
            >
              {m.content}
            </div>
            {m.role === 'assistant' && m.tools && m.tools.length > 0 && (
              <div className="mt-1 flex gap-1 flex-wrap">
                {m.tools.includes('compare_to_frame') && (
                  <button onClick={() => onOpenPage('decision')} className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    🎯 결정 페이지에서 보기
                  </button>
                )}
                {m.tools.includes('run_backtest') && (
                  <button onClick={() => onOpenPage('retro')} className="text-[11px] px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                    🔁 회고 페이지에서 보기
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400">코파일럿이 실데이터로 대조 중…</div>}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          className="flex-1 border rounded-full px-4 py-2 text-sm"
          placeholder="예: 삼성전자 지금 사도 될까? / 내 매매 원칙 만들래"
        />
        <button onClick={() => send(input)} className="px-4 rounded-full bg-black text-white text-sm">
          전송
        </button>
      </div>
    </div>
  )
}
