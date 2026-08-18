import { NextRequest, NextResponse } from 'next/server'
import { getDailyCandles } from '@/lib/market'
import { scoreRuleEdges } from '@/lib/edges'
import { proposeEvolution } from '@/lib/evolve'
import { EXAMPLE_FRAME } from '@/lib/frame'

export async function POST(req: NextRequest) {
  const { code = '005930', frame } = await req.json().catch(() => ({}))
  const f = frame ?? EXAMPLE_FRAME
  try {
    const candles = await getDailyCandles(code, 200)
    const edges = scoreRuleEdges(candles, f, 20)
    const evolution = await proposeEvolution(code, f, edges)
    return NextResponse.json({ code, edges, ...evolution })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
