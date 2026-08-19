// 국내 주요 종목 정적 사전 — 검색 화면과 에이전트 resolve_stock 도구가 공용.
// 사전에 없는 6자리 코드도 통과시켜 열린 탐색(아무 종목)을 보장한다.
export interface StockInfo {
  code: string
  name: string
  aliases?: string[]
}

export const STOCKS: StockInfo[] = [
  { code: '005930', name: '삼성전자', aliases: ['삼전'] },
  { code: '000660', name: 'SK하이닉스', aliases: ['하이닉스'] },
  { code: '373220', name: 'LG에너지솔루션', aliases: ['엔솔', '엘지엔솔'] },
  { code: '207940', name: '삼성바이오로직스', aliases: ['삼바'] },
  { code: '005380', name: '현대차', aliases: ['현대자동차'] },
  { code: '000270', name: '기아' },
  { code: '068270', name: '셀트리온' },
  { code: '005490', name: 'POSCO홀딩스', aliases: ['포스코'] },
  { code: '035420', name: 'NAVER', aliases: ['네이버'] },
  { code: '035720', name: '카카오' },
  { code: '051910', name: 'LG화학' },
  { code: '006400', name: '삼성SDI' },
  { code: '105560', name: 'KB금융' },
  { code: '055550', name: '신한지주' },
  { code: '086790', name: '하나금융지주' },
  { code: '032830', name: '삼성생명' },
  { code: '015760', name: '한국전력', aliases: ['한전'] },
  { code: '017670', name: 'SK텔레콤', aliases: ['skt'] },
  { code: '030200', name: 'KT' },
  { code: '066570', name: 'LG전자' },
  { code: '096770', name: 'SK이노베이션' },
  { code: '010130', name: '고려아연' },
  { code: '009150', name: '삼성전기' },
  { code: '012330', name: '현대모비스' },
  { code: '028260', name: '삼성물산' },
  { code: '010950', name: 'S-Oil', aliases: ['에스오일'] },
  { code: '011200', name: 'HMM' },
  { code: '042700', name: '한미반도체' },
  { code: '247540', name: '에코프로비엠' },
  { code: '086520', name: '에코프로' },
  { code: '293490', name: '카카오게임즈' },
  { code: '259960', name: '크래프톤' },
  { code: '036570', name: '엔씨소프트', aliases: ['엔씨'] },
  { code: '251270', name: '넷마블' },
  { code: '377300', name: '카카오페이' },
  { code: '323410', name: '카카오뱅크', aliases: ['카뱅'] },
  { code: '000810', name: '삼성화재' },
  { code: '329180', name: 'HD현대중공업' },
  { code: '042660', name: '한화오션' },
  { code: '012450', name: '한화에어로스페이스', aliases: ['한화에어로'] },
  { code: '064350', name: '현대로템' },
  { code: '272210', name: '한화시스템' },
  { code: '196170', name: '알테오젠' },
  { code: '328130', name: '루닛' },
  { code: '277810', name: '레인보우로보틱스' },
]

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

/** 이름/별칭/코드로 종목 검색. 정확 이름 > 정확 별칭 > 이름 접두 > 이름 포함 > 별칭 포함 순으로 랭킹. */
export function searchStocks(query: string, limit = 8): StockInfo[] {
  const q = norm(query)
  if (!q) return []

  // 6자리 코드: 사전 우선, 없으면 코드 그대로 통과(열린 탐색)
  if (/^\d{6}$/.test(q)) {
    const hit = STOCKS.find((s) => s.code === q)
    return [hit ?? { code: q, name: `종목 ${q}` }]
  }

  const scored = STOCKS.map((s) => {
    const name = norm(s.name)
    const aliases = (s.aliases ?? []).map(norm)
    let score = 0
    if (name === q) score = 100
    else if (aliases.includes(q)) score = 90
    else if (name.startsWith(q)) score = 80
    else if (name.includes(q)) score = 60
    else if (aliases.some((a) => a.includes(q))) score = 40
    return { s, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((x) => x.s)
}
