import { NextRequest, NextResponse } from 'next/server'
import { proposeEvolution } from '@/lib/evolve'
import { EXAMPLE_FRAME } from '@/lib/frame'
import type { TradeReview } from '@/lib/review'
import { checkRate, serverError } from '@/lib/apiGuard'

export async function POST(req: NextRequest) {
  // 공개 데모 API 키 보호 — evolve는 무거운 LLM 호출이라 더 빡빡하게(IP당 5분 10회) + 전역 일일 상한(공유)
  const limited = checkRate(req, 'evolve', { perIp: 10, windowMs: 5 * 60_000, countGlobal: true })
  if (limited) return limited

  const { frame, review } = (await req.json().catch(() => ({}))) as { frame?: any; review?: TradeReview }
  try {
    if (!review) return NextResponse.json({ error: 'review 없음' }, { status: 400 })
    return NextResponse.json(await proposeEvolution(frame ?? EXAMPLE_FRAME, review))
  } catch (e) {
    return serverError('evolve', e)
  }
}
