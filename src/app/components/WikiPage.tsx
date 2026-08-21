'use client'
import { useState } from 'react'
import { Frame, EXAMPLE_FRAME } from '@/lib/frame'
import { loadRecords, clearRecords, DecisionRecord } from '@/lib/records'
import { stockName } from '@/lib/stocks'

export function WikiPage({ frame, onEditFrame }: { frame: Frame | null; onEditFrame: () => void }) {
  const [records, setRecords] = useState<DecisionRecord[]>(() => loadRecords())
  const [toast, setToast] = useState('')
  const shown = frame ?? EXAMPLE_FRAME
  const isEx = !frame

  function share() {
    setToast('shown')
    setTimeout(() => setToast(''), 2600)
  }

  return (
    <div className="relative h-full overflow-y-auto ios-scroll bg-[#F1F3F5] text-sm">
      {/* 페이지 헤더 */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-lg font-extrabold text-[#191919]">🗂 내 위키</div>
        <div className="text-xs text-gray-500 mt-0.5">쓸수록 쌓이는 나의 원칙과 판단. 결과와 대조하면 운·실력이 갈립니다.</div>
      </div>

      {/* 내 매매 원칙 카드 */}
      <div className="mx-4 mt-2 rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-black/5 overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-bold text-[#191919]">📋 내 매매 원칙</span>
          <span className="ml-1.5 text-xs font-semibold text-gray-400">{shown.rules.length}개</span>
          {isEx && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">예시</span>}
          <button onClick={onEditFrame} className="ml-auto text-xs font-bold text-emerald-700">편집</button>
        </div>
        <ul className="px-4 py-3 space-y-2">
          {shown.rules.map((r, i) => (
            <li key={r.id} className="flex gap-2.5 text-xs text-gray-800">
              <span className="shrink-0 w-5 h-5 grid place-items-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-snug">{r.text}</span>
            </li>
          ))}
        </ul>
        {isEx && (
          <div className="px-4 pb-3 -mt-1 text-[11px] text-amber-700">아직 내 원칙이 없어요 — 대화로 만들면 여기 저장됩니다.</div>
        )}
      </div>

      {/* 판단 기록 */}
      <div className="px-4 mt-5 mb-1.5 flex items-center">
        <span className="text-sm font-bold text-[#191919]">판단 기록</span>
        <span className="ml-1.5 text-xs font-semibold text-gray-400">{records.length}</span>
        {records.length > 0 && (
          <button
            onClick={() => {
              clearRecords()
              setRecords([])
            }}
            className="ml-auto text-xs text-gray-400 underline"
          >
            비우기
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="mx-4 rounded-2xl bg-white border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
          아직 기록이 없어요 — 대화에서 종목을 대조하면 자동으로 쌓여요.
        </div>
      ) : (
        <div className="mx-4 space-y-2 pb-4">
          {records.map((r) => (
            <RecordCard key={r.id} r={r} onShare={share} />
          ))}
        </div>
      )}

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 max-w-[80%] bg-black/80 text-white text-xs px-3.5 py-2.5 rounded-2xl text-center leading-relaxed">
          <div className="font-semibold">공유 미리보기 (목업)</div>
          <div className="text-white/75">실서비스에선 근거 카드가 커뮤니티로 발행됩니다</div>
        </div>
      )}
    </div>
  )
}

// 판단 기록 카드 — 눌러서 상세(부합/위반/미지원·대조 시점가·기록 시각·근거)를 펼쳐 본다.
function RecordCard({ r, onShare }: { r: DecisionRecord; onShare: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-black/5 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left p-3.5" aria-expanded={open}>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-[#191919]">{stockName(r.code)}</span>
          <span className="text-[10px] text-gray-300">{r.code}</span>
          <span className="ml-auto text-emerald-600 font-semibold">부합 {r.okCount}</span>
          <span className="text-red-500 font-semibold">위반 {r.violateCount}</span>
          <Caret open={open} />
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>{new Date(r.at).toLocaleString('ko-KR')}</span>
          {r.note && !open && <span className="truncate text-gray-500">· “{r.note}”</span>}
        </div>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 -mt-0.5 space-y-2.5">
          {/* 부합/위반/미지원 */}
          <div className="flex gap-1 text-[10px] font-bold">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">부합 {r.okCount}</span>
            <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600">위반 {r.violateCount}</span>
            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">미지원 {r.naCount}</span>
          </div>

          {/* 대조 시점가 */}
          {r.priceAtDecision != null && (
            <div className="text-[11px] text-gray-500">
              대조 시점가 <b className="text-gray-700">{r.priceAtDecision.toLocaleString()}원</b>
              <span className="ml-1 text-gray-400">· 회고에서 이 가격 대비 성과로 운/실력을 가려요</span>
            </div>
          )}

          {/* 근거(메모) */}
          {r.note && (
            <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-700 leading-relaxed">“{r.note}”</div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              onShare()
            }}
            className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
          >
            👥 커뮤니티에 근거 공유 <span className="text-gray-400">(목업)</span>
          </button>
        </div>
      )}
    </div>
  )
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`shrink-0 text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
