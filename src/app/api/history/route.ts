import { NextRequest, NextResponse } from 'next/server'
import { getDailyCandles } from '@/lib/market'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? '005930'
  const days = Number(req.nextUrl.searchParams.get('days') ?? '120')
  const provider = req.nextUrl.searchParams.get('provider') ?? undefined
  try {
    return NextResponse.json({ code, candles: await getDailyCandles(code, days, provider) })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
