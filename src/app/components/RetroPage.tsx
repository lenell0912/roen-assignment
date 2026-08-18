'use client'
import { useEffect, useState } from 'react'
import { Frame } from '@/lib/frame'

interface Candle { date: string; close: number }

export function RetroPage({ code, frame }: { code: string; frame: Frame }) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [bt, setBt] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/history?code=${code}&days=200`).then((r) => r.json()),
      fetch('/api/backtest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, frame }),
      }).then((r) => r.json()),
    ])
      .then(([h, b]) => {
        setCandles(h.candles ?? [])
        setBt(b)
      })
      .finally(() => setLoading(false))
  }, [code, frame])

  if (loading) return <div className="p-6 text-gray-400 text-sm">과거 데이터에 프레임을 대입 중…</div>
  if (bt && bt.supported === false)
    return (
      <div className="p-6 text-sm">
        <div className="text-gray-600">{bt.note}</div>
        <div className="mt-2 text-xs text-gray-400">회고 자동 대입은 이동평균 규칙이 있을 때 동작해. 내 프레임 탭에서 규칙을 확인해봐.</div>
      </div>
    )

  const events: { date: string; type: string; price: number }[] = bt?.result?.events ?? []
  return (
    <div className="p-5 overflow-y-auto h-full text-sm">
      <div className="font-bold">🔁 내 프레임을 과거에 대입 (백테스트-라이트)</div>
      <div className="text-xs text-gray-500 mt-0.5">
        규칙: {bt?.params?.fast}/{bt?.params?.slow} 이동평균 교차 · 최근 {candles.length}거래일
      </div>

      <Chart candles={candles} events={events} />

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="규칙대로 매매" value={fmt(bt?.result?.strategyReturnPct)} />
        <Stat label="그냥 보유" value={fmt(bt?.result?.buyHoldReturnPct)} />
        <Stat label="매매 횟수" value={`${bt?.result?.trades ?? 0}회`} />
      </div>

      <div className="mt-3 p-3 bg-amber-50 rounded-lg text-amber-800 text-xs">
        ⚠️ {bt?.result?.note} — <b>정답이 아니라 "네 규칙을 과거에 비춘 참고"</b>야. 미래를 보장하지 않고, 이 구간에 과최적화된 결과일 수 있어.
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
  const H = 180
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
