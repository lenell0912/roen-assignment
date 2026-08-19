import { NextResponse } from 'next/server'
import { tossProvider } from '@/lib/market/toss'

export const dynamic = 'force-dynamic'

// 연결/설정 점검용 — 비밀키 값은 노출하지 않고, 토스는 실제 시세를 1회 프로브해 연결 상태를 확인한다.
export async function GET() {
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
