import { Candle } from './market/types'
import { smaSeries } from './indicators'

export interface BtEvent {
  date: string
  type: 'BUY' | 'SELL'
  price: number
  reason: string
}

export interface BtResult {
  events: BtEvent[]
  trades: number
  strategyReturnPct: number | null // 규칙대로 매매했을 때 누적 수익률
  buyHoldReturnPct: number | null // 그냥 들고 있었을 때
  note: string
}

/**
 * "프레임을 과거에 대입" — 이동평균 교차 규칙을 과거 캔들에 그대로 시뮬레이션.
 * 정답이 아니라 "네 규칙을 과거에 비춘 참고"임(한계 고지 전제).
 */
export function backtestSmaCross(candles: Candle[], fast = 5, slow = 20): BtResult {
  const closes = candles.map((c) => c.close)
  if (closes.length < slow + 1) {
    return { events: [], trades: 0, strategyReturnPct: null, buyHoldReturnPct: null, note: '데이터 부족' }
  }
  const f = smaSeries(closes, fast)
  const s = smaSeries(closes, slow)
  const events: BtEvent[] = []
  let inPos = false
  let entry = 0
  let cum = 1

  for (let i = 1; i < closes.length; i++) {
    const fp = f[i - 1]
    const sp = s[i - 1]
    const fn = f[i]
    const sn = s[i]
    if (fp == null || sp == null || fn == null || sn == null) continue

    if (!inPos && fp <= sp && fn > sn) {
      inPos = true
      entry = closes[i]
      events.push({ date: candles[i].date, type: 'BUY', price: closes[i], reason: '골든크로스' })
    } else if (inPos && fp >= sp && fn < sn) {
      inPos = false
      cum *= closes[i] / entry
      events.push({ date: candles[i].date, type: 'SELL', price: closes[i], reason: '데드크로스' })
    }
  }

  let note = '규칙대로 진입/청산 시뮬레이션 (참고용, 미래 보장 아님)'
  if (inPos) {
    cum *= closes[closes.length - 1] / entry
    note += ' · 마지막 포지션은 최신가로 평가'
  }
  const trades = events.filter((e) => e.type === 'SELL').length + (inPos ? 1 : 0)
  return {
    events,
    trades,
    strategyReturnPct: (cum - 1) * 100,
    buyHoldReturnPct: (closes[closes.length - 1] / closes[0] - 1) * 100,
    note,
  }
}
