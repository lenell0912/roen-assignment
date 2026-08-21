import { NextRequest, NextResponse } from 'next/server'
import { reviewTrades } from '@/lib/capabilities'
import { EXAMPLE_FRAME } from '@/lib/frame'
import { checkRate, isValidCode, serverError } from '@/lib/apiGuard'

const MAX_RECORDS = 50 // 레코드당 외부 시세 조회가 붙으므로 증폭 방지 상한

export async function POST(req: NextRequest) {
  const limited = checkRate(req, 'review', { perIp: 15, windowMs: 60_000 })
  if (limited) return limited

  const { frame, code, records } = await req.json().catch(() => ({}))
  // code는 선택 — 있으면 6자리만 허용(가상 시나리오용). 잘못된 값이면 무시.
  const safeCode = isValidCode(code) ? code : undefined
  // records는 클라이언트 입력 — 개수 상한 + 유효 코드만 통과(외부 호출 증폭 차단)
  const safeRecords = Array.isArray(records)
    ? records.filter((r: any) => isValidCode(r?.code)).slice(0, MAX_RECORDS)
    : []
  try {
    return NextResponse.json(await reviewTrades(frame ?? EXAMPLE_FRAME, { code: safeCode, records: safeRecords }))
  } catch (e) {
    return serverError('review', e)
  }
}
