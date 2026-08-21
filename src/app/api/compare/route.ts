import { NextRequest, NextResponse } from 'next/server'
import { compareToFrame } from '@/lib/capabilities'
import { EXAMPLE_FRAME } from '@/lib/frame'
import { checkRate, isValidCode, serverError } from '@/lib/apiGuard'

export async function POST(req: NextRequest) {
  const limited = checkRate(req, 'compare', { perIp: 30, windowMs: 60_000 })
  if (limited) return limited

  const { code = '005930', frame } = await req.json().catch(() => ({}))
  if (!isValidCode(code)) return NextResponse.json({ error: '잘못된 종목코드예요.' }, { status: 400 })
  try {
    return NextResponse.json(await compareToFrame(code, frame ?? EXAMPLE_FRAME))
  } catch (e) {
    return serverError('compare', e)
  }
}
