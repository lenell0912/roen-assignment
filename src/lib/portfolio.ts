// 실계좌는 보유 0 → 데모용 가상 포트폴리오(2차전지 편중으로 쏠림 시나리오 시연)
export interface Holding {
  code: string
  name: string
  sector: string
  qty: number
  avgPrice: number
}

export const DEMO_PORTFOLIO: Holding[] = [
  { code: '005930', name: '삼성전자', sector: '반도체', qty: 10, avgPrice: 70000 },
  { code: '373220', name: 'LG에너지솔루션', sector: '2차전지', qty: 2, avgPrice: 300000 },
  { code: '247540', name: '에코프로비엠', sector: '2차전지', qty: 3, avgPrice: 180000 },
]

const SECTOR_MAP: Record<string, string> = {
  '005930': '반도체',
  '000660': '반도체',
  '373220': '2차전지',
  '247540': '2차전지',
  '005490': '철강',
  '035720': '인터넷',
  '035420': '인터넷',
}

export function sectorOf(code: string): string | undefined {
  return SECTOR_MAP[code] ?? DEMO_PORTFOLIO.find((h) => h.code === code)?.sector
}

export function sectorWeights(hs: Holding[] = DEMO_PORTFOLIO): Record<string, number> {
  const val = (h: Holding) => h.qty * h.avgPrice
  const total = hs.reduce((s, h) => s + val(h), 0) || 1
  const by: Record<string, number> = {}
  for (const h of hs) by[h.sector] = (by[h.sector] ?? 0) + val(h)
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round((v / total) * 100)]))
}
