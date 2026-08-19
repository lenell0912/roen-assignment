'use client'
import { useEffect, useState } from 'react'

interface Candle { date: string; close: number }

export function StockScreen({ code, name, onBack }: { code: string; name: string; onBack: () => void }) {
  const [quote, setQuote] = useState<any>(null)
  const [candles, setCandles] = useState<Candle[]>([])
  const [failed, setFailed] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    setQuote(null)
    setCandles([])
    setFailed(false)
    Promise.all([
      fetch(`/api/quote?code=${code}`).then((r) => r.json()),
      fetch(`/api/history?code=${code}&days=60`).then((r) => r.json()),
    ])
      .then(([q, h]) => {
        if (q.error) setFailed(true)
        else {
          setQuote(q)
          setCandles(h.candles ?? [])
        }
      })
      .catch(() => setFailed(true))
  }, [code])

  function mock(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  const up = quote && Number(quote.changeRate) >= 0
  return (
    <div className="absolute inset-0 bg-[#f7f8fa] flex flex-col">
      <div className="pt-12 px-3 pb-2 bg-white flex items-center gap-2">
        <button onClick={onBack} aria-label="뒤로" className="w-8 h-8 grid place-items-center text-lg">←</button>
        <div>
          <div className="font-bold text-sm">{name}</div>
          <div className="text-[10px] text-gray-400">{code} · 실시간</div>
        </div>
      </div>

      <div className="bg-white px-4 pb-3">
        {failed ? (
          <div className="text-sm text-gray-400 py-3">시세를 불러오지 못했어요 — 미지원 종목이거나 일시 오류</div>
        ) : !quote ? (
          <div className="text-sm text-gray-300 py-3">실시간 시세 불러오는 중…</div>
        ) : (
          <>
            <div className="text-2xl font-bold">{Number(quote.price).toLocaleString()}원</div>
            <div className={`text-sm ${up ? 'text-red-500' : 'text-blue-500'}`}>
              {up ? '▲' : '▼'} {Number(quote.changeRate).toFixed(2)}%
            </div>
          </>
        )}
        <Sparkline candles={candles} />
      </div>

      <div className="flex gap-4 px-4 py-2.5 text-[13px] text-gray-400 bg-white border-t border-b">
        <span className="text-black font-semibold">차트</span>
        {['호가', '종목정보', '커뮤니티', '뉴스'].map((t) => (
          <button key={t} onClick={() => mock('프로토타입 범위 밖이에요')}>{t}</button>
        ))}
      </div>

      <div className="flex-1 px-4 py-3 text-xs text-gray-400">
        결정하기 전에, 오른쪽 아래 Frame에게 내 원칙에 맞는지 물어보세요.
      </div>

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-40 z-30 bg-black/80 text-white text-xs px-3 py-2 rounded-full">
          {toast}
        </div>
      )}

      {/* 결정의 순간 — 히어로 장면 */}
      <div className="flex h-14 shrink-0">
        <button onClick={() => mock('주문은 프로토타입 범위 밖 — Frame에게 먼저 물어보세요')} className="flex-1 bg-blue-500 text-white font-semibold">판매</button>
        <button onClick={() => mock('주문은 프로토타입 범위 밖 — Frame에게 먼저 물어보세요')} className="flex-1 bg-red-500 text-white font-semibold">구매</button>
      </div>
    </div>
  )
}

function Sparkline({ candles }: { candles: Candle[] }) {
  if (candles.length < 2) return <div className="h-[90px]" />
  const W = 380, H = 90, pad = 4
  const closes = candles.map((c) => c.close)
  const min = Math.min(...closes), max = Math.max(...closes)
  const x = (i: number) => pad + (i / (candles.length - 1)) * (W - 2 * pad)
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (H - 2 * pad)
  const pts = candles.map((c, i) => `${x(i).toFixed(1)},${y(c.close).toFixed(1)}`).join(' ')
  const up = closes[closes.length - 1] >= closes[0]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
      <polyline points={pts} fill="none" stroke={up ? '#ef4444' : '#3b82f6'} strokeWidth="1.5" />
    </svg>
  )
}
