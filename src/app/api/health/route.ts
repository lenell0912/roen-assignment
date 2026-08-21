import { NextRequest, NextResponse } from 'next/server'
import { tossProvider } from '@/lib/market/toss'

export const dynamic = 'force-dynamic'

// 연결/설정 점검용. 상세(키 설정 여부·provider·tossLive)는 인프라 정찰에 쓰일 수 있어
// HEALTH_TOKEN 헤더로 보호한다. 토큰 없거나 불일치면 최소 정보(ok)만 반환한다.
export async function GET(req: NextRequest) {
  const token = process.env.HEALTH_TOKEN
  const authorized = !!token && req.headers.get('x-health-key') === token
  if (!authorized) return NextResponse.json({ ok: true })

  let tossLive = false
  try {
    const q = await Promise.race([
      tossProvider.getQuote('005930'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
    ])
    tossLive = Number((q as any)?.price) > 0
  } catch {
    tossLive = false
  }
  return NextResponse.json({
    ok: true,
    provider: process.env.MARKET_PROVIDER ?? 'toss',
    tossLive,
    env: {
      toss: !!(process.env.TOSS_CLIENT_ID && process.env.TOSS_CLIENT_SECRET),
      anthropic: !!process.env.ANTHROPIC_API_KEY,
    },
  })
}
