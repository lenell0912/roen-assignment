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

type Detail = { kind: 'decision' | 'retro'; code: string } | { kind: 'frame' } | { kind: 'wiki' } | null

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
  const [detail, setDetail] = useState<Detail>(null)

  // 등장 애니메이션: 마운트 직후 바텀시트로 슬라이드 업
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30)
    return () => clearTimeout(t)
  }, [])

  function openWiki() {
    setExpanded(true)
    setDetail({ kind: 'wiki' })
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
        {/* 헤더 — 상세에선 뒤로가기만(타이틀·X 제거), 채팅에선 타이틀+X */}
        <div className={`shrink-0 px-3 pb-2 border-b ${expanded ? 'pt-12' : 'pt-2'}`}>
          <button
            aria-label={expanded ? '줄이기' : '펼치기'}
            onClick={() => setExpanded(!expanded)}
            className="block mx-auto w-10 h-1.5 rounded-full bg-gray-300 mb-2"
          />
          {detail ? (
            <div className="flex items-center">
              <button
                onClick={() => setDetail(detail.kind === 'frame' ? { kind: 'wiki' } : null)}
                aria-label="뒤로"
                className="-ml-1 flex items-center gap-1 h-9 pr-2 text-gray-700"
              >
                <span className="text-xl leading-none">←</span>
                <span className="text-sm font-semibold">{detail.kind === 'frame' ? '위키로 돌아가기' : '대화로 돌아가기'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">AI 투자 Frame</span>
              {context.name && (
                <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">📍 {context.name}</span>
              )}
              <button onClick={onClose} aria-label="닫기" className="ml-auto w-8 h-8 grid place-items-center text-gray-400">✕</button>
            </div>
          )}
        </div>

        {/* 본문 — 채팅은 상세 오버레이에도 언마운트하지 않는다(대화 유지) */}
        <div className="flex-1 min-h-0 relative">
          <div className={`absolute inset-0 ${!detail ? '' : 'hidden'}`}>
            <ChatPage
              context={context}
              frame={frame}
              onFrameSaved={onFrameChange}
              onOpenDetail={(d) => { setExpanded(true); setDetail(d) }}
              onOpenWiki={openWiki}
              onEditFrame={() => { setExpanded(true); setDetail({ kind: 'frame' }) }}
              onActivity={() => setExpanded(true)}
            />
          </div>

          {/* 상세 뷰 오버레이 — 위키·대조·회고·원칙 편집 (헤더 뒤로가기로 대화 복귀) */}
          {detail && (
            <div className="absolute inset-0 bg-white overflow-y-auto ios-scroll">
              {detail.kind === 'decision' && <DecisionPage code={detail.code} frame={frame ?? EXAMPLE_FRAME} />}
              {detail.kind === 'retro' && <RetroPage code={detail.code} frame={frame ?? EXAMPLE_FRAME} setFrame={onFrameChange} />}
              {detail.kind === 'frame' && <FramePage frame={frame ?? EXAMPLE_FRAME} setFrame={(f) => { onFrameChange(f); markStep('frame') }} />}
              {detail.kind === 'wiki' && <WikiPage frame={frame} onEditFrame={() => setDetail({ kind: 'frame' })} />}
            </div>
          )}
        </div>

        {/* iOS 홈 인디케이터 — 입력창 아래 여백을 목적 있는 세이프에어리어로.
            틴티드 상세 페이지(위키·원칙편집) 아래에선 배경을 맞춰 흰 이음새 제거 */}
        <div
          className={`shrink-0 flex justify-center pt-1 pb-2 ${
            detail && (detail.kind === 'wiki' || detail.kind === 'frame') ? 'bg-[#F1F3F5]' : ''
          }`}
        >
          <div className="w-[120px] h-[5px] rounded-full bg-[#191919]" />
        </div>
      </div>
    </div>
  )
}
