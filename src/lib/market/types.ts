export interface Quote {
  code: string
  name?: string
  price: number
  changeRate: number
  // 상세 화면용 리치 필드(선택). 제공자에 따라 없을 수 있어 UI는 폴백('—') 처리.
  change?: number // 전일 대비 금액
  prevClose?: number // 전일 종가
  open?: number // 시가
  dayHigh?: number // 당일 고가
  dayLow?: number // 당일 저가
  volume?: number // 거래량(주)
  marketCap?: number // 시가총액(원)
  week52High?: number // 52주 최고
  week52Low?: number // 52주 최저
  per?: number // PER(있을 때만)
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
