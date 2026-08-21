export interface Quote {
  code: string
  name?: string
  price: number
  changeRate: number
}

export interface Candle {
  date: string // YYYY-MM-DD
  close: number
  volume?: number // 거래량(주). 제공자에 따라 없을 수 있음
}

export interface MarketData {
  getQuote(code: string): Promise<Quote>
  /** 일봉 캔들, 오래된→최신 순 */
  getDailyCandles(code: string, days?: number): Promise<Candle[]>
}
