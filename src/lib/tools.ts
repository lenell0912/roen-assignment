import { getQuote } from './market'
import { getPortfolio, compareToFrame, runBacktest } from './capabilities'
import { Frame } from './frame'

export const TOOLS = [
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
    name: 'run_backtest',
    description: '사용자 프레임의 이동평균 규칙을 종목 과거 데이터에 대입(회고). 규칙대로 매매 시 성과 vs 버이홀드.',
    input_schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
  },
] as const

export async function runTool(name: string, input: any, ctx: { frame?: Frame }): Promise<any> {
  switch (name) {
    case 'get_quote':
      return await getQuote(input.code)
    case 'get_portfolio':
      return getPortfolio()
    case 'compare_to_frame':
      return await compareToFrame(input.code, ctx.frame)
    case 'run_backtest':
      return await runBacktest(input.code, ctx.frame)
    default:
      throw new Error(`unknown tool ${name}`)
  }
}
