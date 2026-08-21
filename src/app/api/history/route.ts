import { NextRequest, NextResponse } from 'next/server'
import { getDailyCandles } from '@/lib/market'
import { checkRate, isValidCode, serverError } from '@/lib/apiGuard'

export async function GET(req: NextRequest) {
  const limited = checkRate(req, 'market', { perIp: 60, windowMs: 60_000 })
  if (limited) return limited

  const code = req.nextUrl.searchParams.get('code') ?? '005930'
  if (!isValidCode(code)) return NextResponse.json({ error: '잘못된 종목코드예요.' }, { status: 400 })
  // days는 클라이언트 입력 — 과도한 조회를 막게 [1, 400]으로 클램프
  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days') ?? '120') || 120, 1), 400)
  const provider = req.nextUrl.searchParams.get('provider') ?? undefined
  try {
    return NextResponse.json({ code, candles: await getDailyCandles(code, days, provider) })
  } catch (e) {
    return serverError('history', e)
  }
}
