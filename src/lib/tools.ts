import { getQuote } from './market'
import { getPortfolio, compareToFrame, reviewTrades } from './capabilities'
import { Frame, rulesFromToolInput } from './frame'
import { searchStocks } from './stocks'

const hasFrame = (f?: Frame) => !!f && f.rules.length > 0

export const TOOLS = [
  {
    name: 'resolve_stock',
    description:
      '종목 이름·별칭으로 6자리 종목코드를 찾는다. 사용자가 종목을 이름으로 말하면 다른 도구보다 먼저 호출해라. matches가 비면 코드를 직접 물어봐라.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: '종목 이름/별칭/코드' } },
      required: ['query'],
    },
  },
  {
    name: 'get_quote',
    description: '종목의 실시간 현재가/등락률 조회',
    input_schema: { type: 'object', properties: { code: { type: 'string', description: '6자리 종목코드' } }, required: ['code'] },
  },
  {
    name: 'get_portfolio',
    description: '사용자의 보유 종목과 섹터별 비중(쏠림 확인용)',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'compare_to_frame',
    description: '특정 종목을 사용자의 거래 프레임(규칙)에 실데이터로 대조. 각 규칙 부합/위반을 돌려준다.',
    input_schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
  },
  {
    name: 'review_trades',
    description:
      '사용자의 실제 매매(보유내역·판단기록)를 그의 프레임으로 회고한다. 운/실력 분리 관점의 참고 요약. code를 주면 그 종목의 가상 시나리오도 만든다.',
    input_schema: { type: 'object', properties: { code: { type: 'string' } } },
  },
  {
    name: 'update_frame',
    description:
      '대화에서 사용자와 합의된 매매 원칙을 저장한다. 규칙을 새로 만들었거나 다듬었으면 반드시 호출. rules는 기존을 포함한 전체 교체본이다. 이동평균/고점추격/쏠림 규칙엔 check를 붙이면 자동 대조가 가능해진다.',
    input_schema: {
      type: 'object',
      properties: {
        rules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['buy', 'sell', 'risk'] },
              text: { type: 'string', description: '사용자 언어의 규칙 한 문장' },
              check: {
                type: 'object',
                description:
                  '자동체크(선택): {"type":"sma_cross","fast":5,"slow":20} | {"type":"price_vs_high","window":60,"minPctBelowHigh":10} | {"type":"sector_concentration","maxPct":40}',
              },
            },
            required: ['kind', 'text'],
          },
        },
      },
      required: ['rules'],
    },
  },
] as const

export async function runTool(
  name: string,
  input: any,
  ctx: { frame?: Frame; setFrame?: (f: Frame) => void },
): Promise<any> {
  switch (name) {
    case 'resolve_stock':
      return { matches: searchStocks(String(input?.query ?? ''), 5) }
    case 'get_quote':
      return await getQuote(String(input?.code ?? ''))
    case 'get_portfolio':
      return getPortfolio()
    case 'compare_to_frame':
      if (!hasFrame(ctx.frame))
        return { noFrame: true, note: '사용자의 매매 원칙이 아직 없다. 대조 대신 팩트 브리핑(get_quote)을 하고, 원칙부터 만들자고 제안해라.' }
      return await compareToFrame(String(input?.code ?? ''), ctx.frame)
    case 'review_trades':
      if (!hasFrame(ctx.frame))
        return { noFrame: true, note: '사용자의 매매 원칙이 아직 없다. 원칙부터 만들자고 제안해라.' }
      // 서버엔 판단기록(records, 클라 localStorage)이 없으므로 여기 요약은 '보유내역 기반 미리보기'다.
      // 기록까지 포함한 전체 회고는 RetroPage가 /api/review로 records를 실어 다시 계산한다.
      return await reviewTrades(ctx.frame, { code: input?.code })
    case 'update_frame': {
      // 저장 자체는 클라이언트가 한다(localStorage). 서버는 실제로 반영될 정제본 기준으로 정직하게 보고한다.
      const rules = rulesFromToolInput(input)
      const checksApplied = rules.filter((r) => r.check).length
      const dropped = (Array.isArray(input?.rules) ? input.rules.length : 0) - rules.length
      if (rules.length && ctx.setFrame) ctx.setFrame({ rules, updatedAt: new Date().toISOString() })
      return { saved: rules.length > 0, count: rules.length, checksApplied, dropped }
    }
    default:
      throw new Error(`unknown tool ${name}`)
  }
}
