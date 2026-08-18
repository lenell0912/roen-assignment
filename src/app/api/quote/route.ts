import { NextRequest, NextResponse } from 'next/server'
import { getQuote } from '@/lib/market'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? '005930'
  const provider = req.nextUrl.searchParams.get('provider') ?? undefined
  try {
    return NextResponse.json(await getQuote(code, provider))
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
