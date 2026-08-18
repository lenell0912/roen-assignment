import { NextRequest, NextResponse } from 'next/server'
import { compareToFrame } from '@/lib/capabilities'
import { EXAMPLE_FRAME } from '@/lib/frame'

export async function POST(req: NextRequest) {
  const { code = '005930', frame } = await req.json().catch(() => ({}))
  try {
    return NextResponse.json(await compareToFrame(code, frame ?? EXAMPLE_FRAME))
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
