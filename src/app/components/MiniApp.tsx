'use client'
import { useEffect, useState } from 'react'
import { Frame, EXAMPLE_FRAME } from '@/lib/frame'
import { loadRecords } from '@/lib/records'
import { markStep } from '@/lib/demo'
import { ChatPage, ChatCtx } from './ChatPage'
import { WikiPage } from './WikiPage'
import { DecisionPage } from './DecisionPage'
import { RetroPage } from './RetroPage'
import { FramePage } from './FramePage'

type Detail = { kind: 'decision' | 'retro'; code: string } | { kind: 'frame' } | null

export function MiniApp({
  context,
  frame,
  onFrameChange,
  onClose,
}: {
  context: ChatCtx
  frame: Frame | null
  onFrameChange: (f: Frame) => void
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'chat' | 'wiki'>('chat')
  const [detail, setDetail] = useState<Detail>(null)

  // 등장 애니메이션: 마운트 직후 바텀시트로 슬라이드 업
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30)
    return () => clearTimeout(t)
  }, [])

  function openWiki() {
    setDetail(null)
    setTab('wiki')
    setExpanded(true)
    if (loadRecords().length > 0) markStep('wiki')
  }

  return (
    <div className="absolute inset-0 z-30">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className={`absolute inset-x-0 bottom-0 bg-white flex flex-col transition-all duration-300 ${
          expanded ? 'top-0 rounded-none' : 'top-[34%] rounded-t-3xl'
        } ${mounted ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* 헤더 */}
        <div className={`shrink-0 px-3 pb-2 border-b ${expanded ? 'pt-12' : 'pt-2'}`}>
          <button
            aria-label={expanded ? '줄이기' : '펼치기'}
            onClick={() => setExpanded(!expanded)}
            className="block mx-auto w-10 h-1.5 rounded-full bg-gray-300 mb-2"
          />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">🧭 AI 투자 Frame</span>
            {context.name && (
              <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">📍 {context.name}</span>
            )}
            <button onClick={onClose} aria-label="닫기" className="ml-auto w-8 h-8 grid place-items-center text-gray-400">✕</button>
          </div>
        </div>

        {/* 본문 — 채팅은 탭 전환에도 언마운트하지 않는다(대화 유지) */}
        <div className="flex-1 min-h-0 relative">
          <div className={`absolute inset-0 ${tab === 'chat' && !detail ? '' : 'hidden'}`}>
            <ChatPage
              context={context}
              frame={frame}
              onFrameSaved={onFrameChange}
              onOpenDetail={(d) => { setExpanded(true); setDetail(d) }}
              onOpenWiki={openWiki}
              onActivity={() => setExpanded(true)}
            />
          </div>
          {tab === 'wiki' && !detail && <WikiPage frame={frame} onEditFrame={() => setDetail({ kind: 'frame' })} />}

          {/* 상세 뷰 오버레이 — 기존 페이지 재활용 */}
          {detail && (
            <div className="absolute inset-0 bg-white flex flex-col">
              <div className="shrink-0 px-3 py-2 border-b flex items-center gap-2">
                <button onClick={() => setDetail(null)} aria-label="뒤로" className="w-8 h-8 grid place-items-center text-lg">←</button>
                <span className="text-sm font-semibold">
                  {detail.kind === 'decision' ? '🎯 대조 상세' : detail.kind === 'retro' ? '🔁 회고 상세' : '📋 원칙 편집'}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {detail.kind === 'decision' && <DecisionPage code={detail.code} frame={frame ?? EXAMPLE_FRAME} />}
                {detail.kind === 'retro' && <RetroPage code={detail.code} frame={frame ?? EXAMPLE_FRAME} setFrame={onFrameChange} />}
                {detail.kind === 'frame' && <FramePage frame={frame ?? EXAMPLE_FRAME} setFrame={(f) => { onFrameChange(f); markStep('frame') }} />}
              </div>
            </div>
          )}
        </div>

        {/* 하단 네비 */}
        {!detail && (
          <div className="shrink-0 flex border-t bg-white">
            <NavBtn active={tab === 'chat'} label="💬 대화" onClick={() => setTab('chat')} />
            <NavBtn active={tab === 'wiki'} label="🗂 위키" onClick={openWiki} />
          </div>
        )}

        <div className="shrink-0 px-3 py-1 border-t text-[9px] text-gray-400 bg-white">
          투자 참고용이며 투자자문이 아닙니다. 최종 결정은 사용자에게 있습니다.
        </div>
      </div>
    </div>
  )
}

function NavBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex-1 py-2.5 text-sm ${active ? 'font-bold' : 'text-gray-400'}`}>
      {label}
    </button>
  )
}
