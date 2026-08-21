import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, clientIp, __resetRateLimit } from '../lib/rateLimit'

describe('rateLimit', () => {
  beforeEach(() => __resetRateLimit())

  it('허용 한도 내에서는 통과시킨다', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('1.1.1.1', { perIp: 5, windowMs: 60_000 }, t0 + i).ok).toBe(true)
    }
  })

  it('IP당 한도를 넘으면 429(ip)로 막고 retryAfter를 준다', () => {
    const t0 = 2_000_000
    for (let i = 0; i < 3; i++) rateLimit('2.2.2.2', { perIp: 3, windowMs: 60_000 }, t0)
    const blocked = rateLimit('2.2.2.2', { perIp: 3, windowMs: 60_000 }, t0)
    expect(blocked.ok).toBe(false)
    expect(blocked.reason).toBe('ip')
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
  })

  it('윈도우가 지나면 다시 허용한다', () => {
    const t0 = 3_000_000
    for (let i = 0; i < 3; i++) rateLimit('3.3.3.3', { perIp: 3, windowMs: 60_000 }, t0)
    expect(rateLimit('3.3.3.3', { perIp: 3, windowMs: 60_000 }, t0).ok).toBe(false)
    // 윈도우(60s) 경과 후
    expect(rateLimit('3.3.3.3', { perIp: 3, windowMs: 60_000 }, t0 + 61_000).ok).toBe(true)
  })

  it('IP별로 카운트가 분리된다', () => {
    const t0 = 4_000_000
    for (let i = 0; i < 3; i++) rateLimit('a', { perIp: 3, windowMs: 60_000 }, t0)
    // 다른 IP는 영향 없음
    expect(rateLimit('b', { perIp: 3, windowMs: 60_000 }, t0).ok).toBe(true)
  })
})

describe('clientIp', () => {
  it('x-forwarded-for의 첫 IP를 쓴다', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' } })
    expect(clientIp(req)).toBe('9.9.9.9')
  })

  it('헤더가 없으면 unknown', () => {
    expect(clientIp(new Request('http://x'))).toBe('unknown')
  })
})
