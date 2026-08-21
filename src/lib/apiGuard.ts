import { NextResponse } from 'next/server'
import { rateLimit, clientIp, RateOpts } from './rateLimit'

// 라우트 공용 가드 — rate limit / 입력 검증 / 에러 일반화를 한곳에서.
// 목적: 무인증 공개 라우트가 외부 API(토스·Yahoo) 프록시로 남용되거나,
// 내부 에러 원문이 클라이언트로 새는 것을 막는다.

/**
 * IP·전역 rate limit 검사. 통과면 null, 초과면 429 응답을 반환한다.
 * bucket으로 라우트별 독립 카운터를 쓴다(시장 조회가 챗 할당량을 잠식하지 않게).
 */
export function checkRate(req: Request, bucket: string, opts: RateOpts): NextResponse | null {
  const rl = rateLimit(`${bucket}:${clientIp(req)}`, opts)
  if (rl.ok) return null
  const msg =
    rl.reason === 'global'
      ? '오늘 데모 이용량이 많아 잠시 쉬어가요. 잠시 후 다시 시도해 주세요. 🙏'
      : '요청이 너무 빨라요 — 잠시 후 다시 시도해 주세요.'
  return NextResponse.json({ error: msg }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } })
}

/** 국내 6자리 종목코드만 통과. 외부 URL에 임의 문자열이 섞이는 것을 막는다. */
export function isValidCode(code: unknown): code is string {
  return typeof code === 'string' && /^\d{6}$/.test(code)
}

/** 내부/외부 에러를 클라이언트에 원문 노출하지 않는다 — 상세는 서버 로그로만. */
export function serverError(tag: string, e: unknown, status = 502): NextResponse {
  console.error(`[${tag}]`, e instanceof Error ? e.message : String(e))
  return NextResponse.json({ error: '일시적인 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, { status })
}
