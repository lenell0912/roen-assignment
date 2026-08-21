import { describe, it, expect } from 'vitest'
import { SIGNED_SPLIT, signDirection } from '../lib/richText'

describe('signDirection', () => {
  it('상승(+/▲)은 up', () => {
    expect(signDirection('+2.2%')).toBe('up')
    expect(signDirection('+13%p')).toBe('up')
    expect(signDirection('▲6.94%')).toBe('up')
    expect(signDirection('+1,234.5%')).toBe('up')
  })

  it('하락(-/−/▼)은 down', () => {
    expect(signDirection('-13%p')).toBe('down')
    expect(signDirection('−13%p')).toBe('down') // 유니코드 마이너스
    expect(signDirection('▼8.59%')).toBe('down')
  })

  it('부호 없는 수치는 색칠 대상 아님(null)', () => {
    expect(signDirection('38%')).toBeNull()
    expect(signDirection('298.7만원')).toBeNull()
    expect(signDirection('5/20')).toBeNull()
    expect(signDirection('2030')).toBeNull()
  })

  it('부호로 시작하는 일반 텍스트 오탐 방지', () => {
    expect(signDirection('+추가')).toBeNull()
    expect(signDirection('-그리고')).toBeNull()
    expect(signDirection('')).toBeNull()
  })
})

describe('SIGNED_SPLIT', () => {
  it('문장에서 방향성 토큰만 분리하고 부호 없는 수치는 남긴다', () => {
    const parts = '급등(+2.2%)했지만 반도체 38%로 아직 여유'.split(SIGNED_SPLIT)
    // 분리된 조각 중 하나는 정확히 '+2.2%'여야 하고, '38%'는 토큰으로 잡히지 않는다
    expect(parts).toContain('+2.2%')
    expect(parts.some((p) => signDirection(p) === 'up')).toBe(true)
    expect(parts.filter((p) => signDirection(p) != null)).toHaveLength(1)
  })
})
