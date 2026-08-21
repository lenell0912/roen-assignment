// LLM 비용 보호용 경량 rate limiter.
// 공개 배포 프로토타입에서 API 키가 남용·소진되지 않게 (1) IP당 슬라이딩 윈도우 +
// (2) 전역 일일 상한을 함께 건다. 서버리스에선 인스턴스별 인메모리라 완벽하진 않지만,
// 단일 링크 배포 데모에서 폭주를 막는 1차 방어로는 충분하다. (실서비스는 Redis 등 공유 저장소로)

const ipHits = new Map<string, number[]>()
let dayCount = 0
let dayStart = Date.now()

const DAY_MS = 86_400_000
// 전역 일일 상한 — 두 LLM 라우트(chat·evolve)가 공유한다. env로 조정 가능.
const DAILY_GLOBAL_CAP = Number(process.env.LLM_DAILY_CAP ?? 800)

export interface RateOpts {
  perIp: number // 윈도우당 IP 허용 횟수
  windowMs: number // 윈도우 길이
}
export interface RateResult {
  ok: boolean
  reason?: 'ip' | 'global'
  retryAfterSec?: number
}

export function rateLimit(ip: string, opts: RateOpts, now: number = Date.now()): RateResult {
  // 일일 윈도우 리셋
  if (now - dayStart > DAY_MS) {
    dayStart = now
    dayCount = 0
  }
  if (dayCount >= DAILY_GLOBAL_CAP) {
    return { ok: false, reason: 'global', retryAfterSec: Math.ceil((dayStart + DAY_MS - now) / 1000) }
  }

  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < opts.windowMs)
  if (recent.length >= opts.perIp) {
    ipHits.set(ip, recent)
    return { ok: false, reason: 'ip', retryAfterSec: Math.ceil((recent[0] + opts.windowMs - now) / 1000) }
  }

  recent.push(now)
  ipHits.set(ip, recent)
  dayCount++

  // 맵 무한 증식 방지 — 가끔 만료된 IP 정리
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      if (!v.some((t) => now - t < opts.windowMs)) ipHits.delete(k)
    }
  }
  return { ok: true }
}

/** 프록시(Vercel 등) 뒤 클라이언트 IP 추출. 없으면 'unknown'으로 묶는다. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/** 테스트용 — 인메모리 상태 초기화 */
export function __resetRateLimit(): void {
  ipHits.clear()
  dayCount = 0
  dayStart = Date.now()
}
