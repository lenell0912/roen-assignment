import { NextRequest, NextResponse } from 'next/server'
import { proposeEvolution } from '@/lib/evolve'
import { EXAMPLE_FRAME } from '@/lib/frame'
import type { TradeReview } from '@/lib/review'

export async function POST(req: NextRequest) {
  const { frame, review } = (await req.json().catch(() => ({}))) as { frame?: any; review?: TradeReview }
  try {
    if (!review) return NextResponse.json({ error: 'review 없음' }, { status: 400 })
    return NextResponse.json(await proposeEvolution(frame ?? EXAMPLE_FRAME, review))
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
