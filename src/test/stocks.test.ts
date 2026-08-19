import { describe, it, expect } from 'vitest'
import { searchStocks, STOCKS } from '../lib/stocks'

describe('searchStocks', () => {
  it('정확한 이름은 1순위로 찾는다', () => {
    expect(searchStocks('삼성전자')[0]).toMatchObject({ code: '005930', name: '삼성전자' })
  })
  it('별칭으로 찾는다', () => {
    expect(searchStocks('삼전')[0].code).toBe('005930')
    expect(searchStocks('네이버')[0].code).toBe('035420')
  })
  it('부분 일치는 여러 개를 돌려준다 (카카오 계열)', () => {
    const names = searchStocks('카카오').map((s) => s.name)
    expect(names).toContain('카카오')
    expect(names).toContain('카카오뱅크')
    expect(names.indexOf('카카오')).toBe(0) // 정확 일치 우선
  })
  it('6자리 코드는 리스트에 있으면 그 종목, 없으면 코드 그대로 통과시킨다(열린 탐색)', () => {
    expect(searchStocks('005930')[0].name).toBe('삼성전자')
    expect(searchStocks('123450')[0]).toMatchObject({ code: '123450' })
  })
  it('빈 질의/미지 종목은 빈 배열', () => {
    expect(searchStocks('')).toEqual([])
    expect(searchStocks('없는종목이름')).toEqual([])
  })
  it('STOCKS 코드는 중복이 없다', () => {
    const codes = STOCKS.map((s) => s.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
