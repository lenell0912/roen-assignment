import { NextRequest, NextResponse } from 'next/server'
import { getQuote } from '@/lib/market'
import { checkRate, isValidCode, serverError } from '@/lib/apiGuard'

export async function GET(req: NextRequest) {
  const limited = checkRate(req, 'market', { perIp: 60, windowMs: 60_000 })
  if (limited) return limited

  const code = req.nextUrl.searchParams.get('code') ?? '005930'
  if (!isValidCode(code)) return NextResponse.json({ error: '잘못된 종목코드예요.' }, { status: 400 })
  const provider = req.nextUrl.searchParams.get('provider') ?? undefined
  try {
    return NextResponse.json(await getQuote(code, provider))
  } catch (e) {
    return serverError('quote', e)
  }
}
