'use client'
import { useEffect, useState } from 'react'
import { Frame } from '@/lib/frame'
import { saveFrame } from '@/lib/frameStore'

interface Candle { date: string; close: number }

export function RetroPage({ code, frame, setFrame }: { code: string; frame: Frame; setFrame: (f: Frame) => void }) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [bt, setBt] = useState<any>(null)
  const [evo, setEvo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    setLoading(true)
    setApplied(false)
    Promise.all([
      fetch(`/api/history?code=${code}&days=200`).then((r) => r.json()),
      fetch('/api/backtest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, frame }) }).then((r) => r.json()),
      fetch('/api/evolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, frame }) }).then((r) => r.json()),
    ])
      .then(([h, b, e]) => {
        setCandles(h.candles ?? [])
        setBt(b)
        setEvo(e)
      })
      .finally(() => setLoading(false))
  }, [code, frame])

  function applyProposal(p: any) {
    const rules = frame.rules.flatMap((r) => {
      if (r.id !== p.ruleId) return [r]
      if (p.action === 'drop') return []
      return [{ ...r, text: p.newText ?? r.text, check: r.check && p.paramPatch ? ({ ...r.check, ...p.paramPatch } as any) : r.check }]
    })
    saveFrame({ rules, updatedAt: new Date().toISOString() })
    setFrame({ rules, updatedAt: new Date().toISOString() })
    setApplied(true)
  }

  if (loading) return <div className="p-6 text-gray-400 text-sm">과거 데이터에 프레임을 대입하고, 규칙별로 채점 중…</div>

  const events: { date: string; type: string; price: number }[] = bt?.result?.events ?? []
  const scorable = (evo?.edges ?? []).filter((e: any) => e.scorable)

  return (
    <div className="p-5 overflow-y-auto h-full text-sm">
      <div className="font-bold">🔁 회고 — 내 프레임을 과거에 대입 &amp; 데이터로 채점</div>

      {bt?.supported === false ? (
        <div className="mt-2 text-gray-600">{bt.note}</div>
      ) : (
        <>
          <div className="text-xs text-gray-500 mt-0.5">
            규칙: {bt?.params?.fast}/{bt?.params?.slow} 이동평균 교차 · 최근 {candles.length}거래일
          </div>
          <Chart candles={candles} events={events} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="규칙대로 매매" value={fmt(bt?.result?.strategyReturnPct)} />
            <Stat label="그냥 보유" value={fmt(bt?.result?.buyHoldReturnPct)} />
            <Stat label="매매 횟수" value={`${bt?.result?.trades ?? 0}회`} />
          </div>
        </>
      )}

      {/* 규칙별 기여도 — novelty */}
      <div className="mt-5">
        <div className="font-semibold">📊 규칙별 기여도 (내 데이터로 채점)</div>
        <div className="text-[11px] text-gray-500 mb-1">각 규칙을 지킨 날 vs 어긴 날의 이후 20일 수익률 차이(엣지).</div>
        {scorable.length === 0 ? (
          <div className="text-xs text-gray-400">채점 가능한 규칙(이동평균/추격) 이 없어. 서술형·쏠림 규칙은 자동 채점 대상이 아니야.</div>
        ) : (
          <div className="space-y-1">
            {scorable.map((e: any) => (
              <div key={e.ruleId} className="flex items-center gap-2 border rounded-lg px-2 py-1.5">
                <span className="flex-1 truncate">{e.text}</span>
                <span className="text-[11px] text-gray-400">지킨 {e.satisfiedAvg?.toFixed(1)}% / 어긴 {e.violatedAvg?.toFixed(1)}%</span>
                <span className={`font-bold ${e.edge >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  엣지 {e.edge >= 0 ? '+' : ''}{e.edge?.toFixed(1)}%p
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 진화 제안 */}
      {evo?.suggestion && (
        <div className="mt-4 p-3 rounded-lg bg-indigo-50 text-indigo-900">
          <div className="font-semibold text-xs">🧬 프레임 진화 제안</div>
          <div className="mt-1 text-sm">{evo.suggestion}</div>
          {evo.proposal && !applied && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border">
                {evo.proposal.action} · {evo.proposal.ruleId}
              </span>
              <button onClick={() => applyProposal(evo.proposal)} className="px-3 py-1 rounded bg-indigo-600 text-white text-xs">
                ✅ 이 개정 반영
              </button>
            </div>
          )}
          {applied && <div className="mt-2 text-xs text-emerald-700">반영됨 — 프레임이 업데이트되고 회고가 다시 계산됐어.</div>}
        </div>
      )}

      <div className="mt-3 p-3 bg-amber-50 rounded-lg text-amber-800 text-xs">
        ⚠️ 이건 <b>정답이 아니라 "네 규칙을 과거에 비춘 참고"</b>야. 특정 구간에 과최적화될 수 있으니, 규칙 변경은 신중히.
      </div>
    </div>
  )
}

function fmt(v: number | null | undefined) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  )
}

function Chart({ candles, events }: { candles: Candle[]; events: { date: string; type: string; price: number }[] }) {
  if (candles.length < 2) return <div className="text-xs text-gray-400 mt-2">차트 데이터 부족</div>
  const W = 520
  const H = 170
  const pad = 10
  const closes = candles.map((c) => c.close)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const x = (i: number) => pad + (i / (candles.length - 1)) * (W - 2 * pad)
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (H - 2 * pad)
  const line = candles.map((c, i) => `${x(i).toFixed(1)},${y(c.close).toFixed(1)}`).join(' ')
  const idxByDate = new Map(candles.map((c, i) => [c.date, i]))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3 border rounded-lg bg-white">
      <polyline points={line} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      {events.map((e, k) => {
        const i = idxByDate.get(e.date)
        if (i == null) return null
        const buy = e.type === 'BUY'
        return (
          <g key={k}>
            <circle cx={x(i)} cy={y(e.price)} r="4" fill={buy ? '#ef4444' : '#3b82f6'} />
            <text x={x(i)} y={y(e.price) - 7} fontSize="9" textAnchor="middle" fill={buy ? '#ef4444' : '#3b82f6'}>
              {buy ? '매수' : '매도'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
