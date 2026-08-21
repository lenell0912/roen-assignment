import { NextRequest, NextResponse } from 'next/server'
import { proposeEvolution } from '@/lib/evolve'
import { EXAMPLE_FRAME } from '@/lib/frame'
import type { TradeReview } from '@/lib/review'
import { rateLimit, clientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // 공개 데모 API 키 보호 — evolve는 무거운 LLM 호출이라 더 빡빡하게(IP당 5분 10회) + 전역 일일 상한(공유)
  const rl = rateLimit(clientIp(req), { perIp: 10, windowMs: 5 * 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.reason === 'global' ? '오늘 데모 이용량이 많아 진화 제안은 잠시 쉬어가요.' : '요청이 너무 빨라요 — 잠시 후 다시 시도해 주세요.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const { frame, review } = (await req.json().catch(() => ({}))) as { frame?: any; review?: TradeReview }
  try {
    if (!review) return NextResponse.json({ error: 'review 없음' }, { status: 400 })
    return NextResponse.json(await proposeEvolution(frame ?? EXAMPLE_FRAME, review))
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
