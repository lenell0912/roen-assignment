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
    <div className="relative p-4 overflow-y-auto h-full text-sm">
      <div className="font-bold">🗂 내 위키 — 원칙 + 판단 기록</div>
      <div className="text-xs text-gray-500 mt-0.5">쓸수록 쌓이는 나의 판단. 결과와 대조하면 운/실력이 갈린다.</div>

      <div className="mt-3 border rounded-xl p-3 bg-neutral-50">
        <div className="flex items-center">
          <div className="text-xs font-semibold text-gray-600">
            내 매매 원칙 ({shown.rules.length}개){isEx && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">예시</span>}
          </div>
          <button onClick={onEditFrame} className="ml-auto text-xs text-blue-600 underline">편집</button>
        </div>
        <ul className="mt-1 text-xs text-gray-600 list-disc ml-4 space-y-0.5">
          {shown.rules.map((r) => (<li key={r.id}>{r.text}</li>))}
        </ul>
        {isEx && <div className="mt-2 text-[11px] text-amber-700">아직 내 원칙이 없어요 — 대화로 만들면 여기 저장됩니다.</div>}
      </div>

      <div className="mt-4 flex items-center">
        <div className="text-xs font-semibold text-gray-600">판단 기록 ({records.length})</div>
        {records.length > 0 && (
          <button
            onClick={() => { clearRecords(); setRecords([]) }}
            className="ml-auto text-xs text-gray-400 underline"
          >
            비우기
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="mt-2 text-xs text-gray-400">아직 기록 없음 — 대화에서 종목을 대조하면 자동으로 쌓여요.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {records.map((r) => (
            <div key={r.id} className="border rounded-xl p-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{r.code}</span>
                <span className="text-gray-400">{new Date(r.at).toLocaleString('ko-KR')}</span>
                <span className="ml-auto text-emerald-600">부합 {r.okCount}</span>
                <span className="text-red-500">위반 {r.violateCount}</span>
              </div>
              {r.note && <div className="mt-1 text-xs text-gray-700">“{r.note}”</div>}
              <button onClick={share} className="mt-1.5 text-[11px] px-2 py-1 rounded-full border text-gray-500">
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
