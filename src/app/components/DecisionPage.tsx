'use client'
import { useEffect, useState } from 'react'
import { Frame } from '@/lib/frame'
import { addRecord } from '@/lib/records'
import { stockName } from '@/lib/stocks'

const COLOR: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  violate: 'bg-red-50 text-red-700 border-red-200',
  na: 'bg-gray-50 text-gray-500 border-gray-200',
}
const LABEL: Record<string, string> = { ok: '부합', violate: '위반', na: '미지원' }

export function DecisionPage({ code, frame }: { code: string; frame: Frame }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLoading(true)
    setData(null)
    setSaved(false)
    fetch('/api/compare', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, frame }),
    })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [code, frame])

  if (loading) return <div className="p-6 text-gray-400 text-sm">실데이터로 프레임에 대조 중…</div>
  if (!data || data.error) return <div className="p-6 text-red-500 text-sm">{data?.error ?? '오류'}</div>

  const q = data.quote
  return (
    <div className="p-5 overflow-y-auto h-full text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-bold truncate">{stockName(code, q.name)}</div>
          <div className="text-[11px] text-gray-400">{code}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold">{Number(q.price).toLocaleString()}원</div>
          <div className={`text-sm font-semibold ${Number(q.changeRate) < 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {Number(q.changeRate) < 0 ? '▼' : '▲'} {Math.abs(Number(q.changeRate)).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
        <span>내 프레임 대조 결과 — 부합 {data.summary.ok} · 위반 {data.summary.violate} · 미지원 {data.summary.na}</span>
        <span className="text-gray-300">|</span>
        <span>{data.sector ?? '섹터?'} · 내 {data.sector} 비중 {data.sectorWeights?.[data.sector] ?? '—'}%</span>
      </div>

      <div className="mt-3 space-y-2">
        {data.verdicts.map((v: any, i: number) => (
          <div key={i} className={`border rounded-lg p-3 flex items-start gap-2.5 ${COLOR[v.verdict.status]}`}>
            <span className="shrink-0 whitespace-nowrap text-[11px] px-1.5 py-0.5 rounded bg-white/70 border">{LABEL[v.verdict.status]}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium leading-snug">{v.rule.text}</div>
              <div className="mt-1 text-xs opacity-80">{v.verdict.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-amber-50 rounded-lg text-amber-800 text-xs">
        ⚠️ 이건 "사라/팔아라"가 아니라 네 프레임에 비춘 결과야. <b>왜 지금인지</b> 스스로 답할 수 있을 때 결정해.
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-gray-500 mb-1">이 판단, 근거와 함께 기록하기</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="왜 이렇게 판단했는지 한 줄로 남겨두면, 나중에 회고할 때 운/실력을 가릴 수 있어."
          className="w-full border rounded-lg p-2 text-sm h-16"
        />
        <button
          disabled={saved}
          onClick={() => {
            addRecord({ code, okCount: data.summary.ok, violateCount: data.summary.violate, naCount: data.summary.na, priceAtDecision: Number(data.quote?.price) || undefined, note })
            setSaved(true)
          }}
          className={`mt-1 px-3 py-1.5 rounded text-xs transition-colors ${
            saved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default' : 'bg-black text-white'
          }`}
        >
          {saved ? '✅ 저장됨 — 위키 탭에서 확인' : '🗂 내 위키에 판단 기록 저장'}
        </button>
      </div>
    </div>
  )
}
