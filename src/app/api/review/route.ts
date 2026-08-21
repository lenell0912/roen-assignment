import { NextRequest, NextResponse } from 'next/server'
import { reviewTrades } from '@/lib/capabilities'
import { EXAMPLE_FRAME } from '@/lib/frame'

export async function POST(req: NextRequest) {
  const { frame, code, records } = await req.json().catch(() => ({}))
  try {
    return NextResponse.json(await reviewTrades(frame ?? EXAMPLE_FRAME, { code, records }))
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
