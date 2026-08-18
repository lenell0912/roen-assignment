'use client'
import { useState } from 'react'
import { Frame } from '@/lib/frame'
import { loadRecords, clearRecords, DecisionRecord } from '@/lib/records'

export function WikiPage({ frame }: { frame: Frame }) {
  const [records, setRecords] = useState<DecisionRecord[]>(() => loadRecords())

  return (
    <div className="p-5 overflow-y-auto h-full text-sm">
      <div className="font-bold">🗂 내 위키 — 프레임 + 판단 기록</div>
      <div className="text-xs text-gray-500 mt-0.5">쓸수록 쌓이는 나의 판단 기록. 결과와 대조하면 운/실력이 갈린다.</div>

      <div className="mt-3 border rounded-lg p-3 bg-neutral-50">
        <div className="text-xs font-semibold text-gray-600">내 프레임 ({frame.rules.length}개 규칙)</div>
        <ul className="mt-1 text-xs text-gray-600 list-disc ml-4">
          {frame.rules.map((r) => (
            <li key={r.id}>{r.text}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center">
        <div className="text-xs font-semibold text-gray-600">판단 기록 ({records.length})</div>
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
        <div className="mt-2 text-xs text-gray-400">아직 기록 없음 — 결정 페이지에서 판단을 저장하면 여기 쌓여.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {records.map((r) => (
            <div key={r.id} className="border rounded-lg p-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{r.code}</span>
                <span className="text-gray-400">{new Date(r.at).toLocaleString('ko-KR')}</span>
                <span className="ml-auto text-emerald-600">부합 {r.okCount}</span>
                <span className="text-red-500">위반 {r.violateCount}</span>
              </div>
              {r.note && <div className="mt-1 text-xs text-gray-700">“{r.note}”</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
