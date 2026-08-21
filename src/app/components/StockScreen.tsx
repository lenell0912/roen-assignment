'use client'
import { useEffect, useMemo, useState } from 'react'

interface Candle { date: string; close: number }
interface Quote {
  code: string; name?: string; price: number; changeRate: number
  change?: number; prevClose?: number; open?: number; dayHigh?: number; dayLow?: number
  volume?: number; marketCap?: number; week52High?: number; week52Low?: number; per?: number
}

const RANGES: { key: string; days: number }[] = [
  { key: '1주', days: 5 },
  { key: '1개월', days: 22 },
  { key: '3개월', days: 66 },
  { key: '1년', days: 250 },
]

export function StockScreen({ code, name, onBack }: { code: string; name: string; onBack: () => void }) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [candles, setCandles] = useState<Candle[]>([])
  const [failed, setFailed] = useState(false)
  const [range, setRange] = useState('3개월')
  const [tab, setTab] = useState('차트')
  const [toast, setToast] = useState('')

  useEffect(() => {
    setQuote(null)
    setCandles([])
    setFailed(false)
    setRange('3개월')
    setTab('차트')
    Promise.all([
      fetch(`/api/quote?code=${code}`).then((r) => r.json()),
      fetch(`/api/history?code=${code}&days=250`).then((r) => r.json()),
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

  const up = quote ? Number(quote.changeRate) >= 0 : true
  const tone = up ? 'text-red-500' : 'text-blue-500'

  return (
    <div className="absolute inset-0 bg-[#f7f8fa] flex flex-col">
      {/* 앱바 */}
      <div className="pt-12 px-3 pb-2 bg-white flex items-center gap-2 shrink-0">
        <button onClick={onBack} aria-label="뒤로" className="w-8 h-8 grid place-items-center text-lg">←</button>
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{name}</div>
          <div className="text-[10px] text-gray-400">{code} · 실시간</div>
        </div>
        <button onClick={() => mock('관심 종목은 프로토타입 범위 밖이에요')} aria-label="관심" className="ml-auto w-8 h-8 grid place-items-center text-gray-300 text-lg">☆</button>
      </div>

      <div className="flex-1 overflow-y-auto ios-scroll">
        {/* 가격 헤더 */}
        <div className="bg-white px-4 pt-2 pb-4">
          {failed ? (
            <div className="text-sm text-gray-400 py-3">시세를 불러오지 못했어요 — 미지원 종목이거나 일시 오류</div>
          ) : !quote ? (
            <div className="text-sm text-gray-300 py-3">실시간 시세 불러오는 중…</div>
          ) : (
            <>
              <div className="text-[26px] leading-none font-extrabold">{fmtWon(quote.price)}</div>
              <div className={`mt-1.5 text-sm font-semibold ${tone}`}>
                {up ? '▲' : '▼'} {quote.change != null ? `${fmtWon(Math.abs(quote.change))} · ` : ''}
                {Math.abs(Number(quote.changeRate)).toFixed(2)}%
                <span className="ml-1 text-[11px] font-medium text-gray-400">전일 대비</span>
              </div>
            </>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-4 px-4 py-2.5 text-[13px] text-gray-400 bg-white border-t border-b">
          {['차트', '호가', '뉴스', '토론'].map((t) => (
            <button
              key={t}
              onClick={() => (t === '차트' ? setTab('차트') : (setTab(t), mock('프로토타입 범위 밖이에요')))}
              className={tab === t ? 'text-black font-semibold' : ''}
            >
              {t}
            </button>
          ))}
        </div>

        {tab !== '차트' ? (
          <div className="px-4 py-16 text-center text-sm text-gray-400 bg-white">
            {tab}는 프로토타입 범위 밖이에요.
            <div className="mt-1 text-xs text-gray-300">차트·시세·종목정보는 실데이터로 제공돼요.</div>
          </div>
        ) : (
          <>
            {/* 기간 탭 + 영역 차트 */}
            <div className="bg-white px-4 pt-3 pb-4">
              <AreaChart candles={candles} days={RANGES.find((r) => r.key === range)!.days} />
              <div className="mt-3 flex gap-1.5">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      range === r.key ? 'bg-[#191919] text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {r.key}
                  </button>
                ))}
              </div>
            </div>

            {/* 오늘의 시세 */}
            <Section title="오늘의 시세">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <Field label="시가" value={fmtWonOrDash(quote?.open)} />
                <Field label="전일 종가" value={fmtWonOrDash(quote?.prevClose)} />
                <Field label="고가" value={fmtWonOrDash(quote?.dayHigh)} valueClass="text-red-500" />
                <Field label="저가" value={fmtWonOrDash(quote?.dayLow)} valueClass="text-blue-500" />
              </div>
            </Section>

            {/* 종목정보 */}
            <Section title="종목정보">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <Field label="거래량" value={quote?.volume != null ? `${quote.volume.toLocaleString()}주` : '—'} />
                <Field label="시가총액" value={fmtCap(quote?.marketCap)} />
                <Field label="52주 최고" value={fmtWonOrDash(quote?.week52High)} />
                <Field label="52주 최저" value={fmtWonOrDash(quote?.week52Low)} />
                {quote?.per != null && <Field label="PER" value={`${quote.per.toFixed(2)}배`} />}
              </div>

              {/* 52주 위치 게이지 */}
              {quote?.week52High != null && quote?.week52Low != null && quote.week52High > quote.week52Low && (
                <div className="mt-4">
                  <div className="text-[11px] text-gray-400 mb-1.5">52주 내 현재가 위치</div>
                  <Gauge low={quote.week52Low} high={quote.week52High} price={quote.price} />
                </div>
              )}
            </Section>

            {/* Frame 유도 */}
            <div className="mx-3 my-3 rounded-2xl bg-[#FFF9DB] border border-[#FFEC47] p-3.5">
              <div className="text-sm font-bold text-[#191919]">결정하기 전에, Frame에게 물어보세요</div>
              <div className="mt-1 text-xs text-[#191919]/70 leading-relaxed">
                오른쪽 아래 <b>Frame</b>을 누르면 이 종목을 <b>내 원칙</b>에 실데이터로 대조하고, 일부러 반대 근거까지 짚어드려요.
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-30 bg-black/80 text-white text-xs px-3 py-2 rounded-full whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* 결정의 순간 — 히어로 하단 바 */}
      <div className="flex h-14 shrink-0">
        <button onClick={() => mock('주문은 프로토타입 범위 밖 — Frame에게 먼저 물어보세요')} className="flex-1 bg-blue-500 text-white font-semibold">판매</button>
        <button onClick={() => mock('주문은 프로토타입 범위 밖 — Frame에게 먼저 물어보세요')} className="flex-1 bg-red-500 text-white font-semibold">구매</button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white mt-2 px-4 py-3.5">
      <div className="text-sm font-bold mb-2.5">{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

function Gauge({ low, high, price }: { low: number; high: number; price: number }) {
  const pos = Math.max(0, Math.min(1, (price - low) / (high - low)))
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-blue-300 via-gray-200 to-red-300">
        <div className="absolute -top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#191919] -translate-x-1/2" style={{ left: `${pos * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-gray-400">
        <span>최저 {fmtWon(low)}</span>
        <span>최고 {fmtWon(high)}</span>
      </div>
    </div>
  )
}

function AreaChart({ candles, days }: { candles: Candle[]; days: number }) {
  const closes = useMemo(() => candles.map((c) => c.close).slice(-days), [candles, days])
  if (closes.length < 2) return <div className="h-[168px] grid place-items-center text-xs text-gray-300">차트 데이터 불러오는 중…</div>
  const W = 520, H = 168, pad = 6
  const min = Math.min(...closes), max = Math.max(...closes)
  const x = (i: number) => pad + (i / (closes.length - 1)) * (W - 2 * pad)
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (H - 2 * pad)
  const line = closes.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const up = closes[closes.length - 1] >= closes[0]
  const stroke = up ? '#f04452' : '#3182f6'
  const gid = `g-${up ? 'u' : 'd'}`
  const area = `${pad},${(H - pad).toFixed(1)} ${line} ${(W - pad).toFixed(1)},${(H - pad).toFixed(1)}`
  const pct = (((closes[closes.length - 1] - closes[0]) / closes[0]) * 100)
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gid})`} />
        <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(closes.length - 1)} cy={y(closes[closes.length - 1])} r="3.5" fill={stroke} />
      </svg>
      <div className={`mt-1 text-[11px] font-semibold ${up ? 'text-red-500' : 'text-blue-500'}`}>
        이 구간 {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
      </div>
    </div>
  )
}

function fmtWon(v: number) {
  return `${Math.round(v).toLocaleString()}원`
}
function fmtWonOrDash(v?: number) {
  return v != null ? fmtWon(v) : '—'
}
function fmtCap(v?: number) {
  if (v == null) return '—'
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}조원`
  if (v >= 1e8) return `${Math.round(v / 1e8).toLocaleString()}억원`
  return fmtWon(v)
}
