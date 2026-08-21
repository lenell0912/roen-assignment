import { NextResponse } from 'next/server'
import { getTradingValueRanking } from '@/lib/market'
import { STOCKS } from '@/lib/stocks'

// 거래대금 상위 후보 유니버스 — 잘 알려진 유동성 높은 국내 대형·중형주.
// 이 안에서 최근 거래일 실거래대금(가격×거래량) 기준으로 top5 를 뽑는다(실데이터).
const UNIVERSE = [
  '005930', '000660', '035720', '035420', '005380', '000270',
  '373220', '042660', '012450', '323410', '086520', '247540',
  '066570', '051910', '010130',
]

export const revalidate = 300 // 5분 캐시 — 시세 서버 과호출 방지

export async function GET() {
  try {
    const ranked = await getTradingValueRanking(UNIVERSE, 5)
    if (!ranked.length) return NextResponse.json({ error: '랭킹을 만들 데이터가 없어요' }, { status: 502 })
    const stocks = ranked.map((r) => ({
      ...r,
      name: STOCKS.find((s) => s.code === r.code)?.name ?? `종목 ${r.code}`,
    }))
    return NextResponse.json({ stocks })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
