'use client'
import { useState } from 'react'
import { Frame, EXAMPLE_FRAME } from '@/lib/frame'
import { loadRecords, clearRecords, DecisionRecord } from '@/lib/records'

export function WikiPage({ frame, onEditFrame }: { frame: Frame | null; onEditFrame: () => void }) {
  const [records, setRecords] = useState<DecisionRecord[]>(() => loadRecords())
  const [toast, setToast] = useState('')
  const shown = frame ?? EXAMPLE_FRAME
  const isEx = !frame

  function share() {
    setToast('공유 미리보기(목업) — 실서비스에선 근거 카드가 커뮤니티로 발행됩니다')
    setTimeout(() => setToast(''), 2200)
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
            <div key={r.id} className="rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-black/5 p-3.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[#191919]">{r.code}</span>
                <span className="text-gray-400">{new Date(r.at).toLocaleString('ko-KR')}</span>
                <span className="ml-auto text-emerald-600 font-semibold">부합 {r.okCount}</span>
                <span className="text-red-500 font-semibold">위반 {r.violateCount}</span>
              </div>
              {r.note && <div className="mt-1.5 text-xs text-gray-700">“{r.note}”</div>}
              <button onClick={share} className="mt-2 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                👥 커뮤니티에 근거 공유 <span className="text-gray-400">(목업)</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 bg-black/80 text-white text-xs px-3 py-2 rounded-full whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
