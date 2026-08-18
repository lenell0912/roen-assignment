import { NextResponse } from 'next/server'

// 연결/설정 점검용 (비밀키 값은 노출하지 않고 존재 여부만)
export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: process.env.MARKET_PROVIDER ?? 'toss',
    env: {
      toss: !!(process.env.TOSS_CLIENT_ID && process.env.TOSS_CLIENT_SECRET),
      anthropic: !!process.env.ANTHROPIC_API_KEY,
    },
  })
}
