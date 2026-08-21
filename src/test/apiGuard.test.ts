import { describe, it, expect } from 'vitest'
import { isValidCode } from '../lib/apiGuard'

describe('isValidCode', () => {
  it('6자리 숫자만 통과', () => {
    expect(isValidCode('005930')).toBe(true)
    expect(isValidCode('000660')).toBe(true)
  })

  it('형식이 어긋나면 거부', () => {
    expect(isValidCode('5930')).toBe(false)
    expect(isValidCode('005930.KS')).toBe(false)
    expect(isValidCode('00593a')).toBe(false)
    expect(isValidCode('005930 OR 1=1')).toBe(false)
    expect(isValidCode('')).toBe(false)
  })

  it('문자열이 아니면 거부', () => {
    expect(isValidCode(5930 as unknown)).toBe(false)
    expect(isValidCode(null as unknown)).toBe(false)
    expect(isValidCode(undefined as unknown)).toBe(false)
    expect(isValidCode({ code: '005930' } as unknown)).toBe(false)
  })
})
