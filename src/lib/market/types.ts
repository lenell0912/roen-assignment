export interface Quote {
  code: string
  name?: string
  price: number
  changeRate: number
}

export interface Candle {
  date: string // YYYY-MM-DD
  close: number
}

export interface MarketData {
  getQuote(code: string): Promise<Quote>
  /** 일봉 캔들, 오래된→최신 순 */
  getDailyCandles(code: string, days?: number): Promise<Candle[]>
}
