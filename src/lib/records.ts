'use client'

export interface DecisionRecord {
  id: string
  at: string
  code: string
  okCount: number
  violateCount: number
  naCount: number
  priceAtDecision?: number // 대조 시점 시세(회고 성과 계산용). 옛 기록엔 없을 수 있음
  note: string
}

const KEY = 'records_v1'

export function loadRecords(): DecisionRecord[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as DecisionRecord[]
  } catch {
    return []
  }
}

export function addRecord(r: Omit<DecisionRecord, 'id' | 'at'>): void {
  const cur = loadRecords()
  const rec: DecisionRecord = { ...r, id: String(Date.now()), at: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify([rec, ...cur]))
}

export function clearRecords(): void {
  localStorage.removeItem(KEY)
}
