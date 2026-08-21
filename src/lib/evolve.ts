import Anthropic from '@anthropic-ai/sdk'
import { Frame } from './frame'
import { TradeReview } from './review'

const client = new Anthropic()
const MODEL = 'claude-sonnet-5'

export interface Proposal {
  ruleId: string
  action: 'tighten' | 'loosen' | 'keep' | 'drop'
  paramPatch?: Record<string, number> // 머신체크 숫자 파라미터 수정 (예: { minPctBelowHigh: 5 })
  newText?: string
  rationale: string
}
export interface Evolution {
  suggestion: string
  proposal: Proposal | null
}

export async function proposeEvolution(frame: Frame, review: TradeReview): Promise<Evolution> {
  const edgeLines = review.items
    .map((it) => {
      const perf = it.returnPct == null ? '관찰 중(경과 짧음)' : `${it.returnPct >= 0 ? '+' : ''}${it.returnPct.toFixed(1)}%`
      return `- (${it.source}) ${it.name}: 부합 ${it.fit.ok}·위반 ${it.fit.violate}·미지원 ${it.fit.na}, 이후 성과 ${perf}`
    })
    .join('\n') || '- (아직 회고할 매매가 없음)'
  const summaryLine = review.summary.verdict
  const ruleLines = frame.rules
    .map((r) => `- [${r.id}] (${r.kind}) "${r.text}"${r.check ? ` check=${JSON.stringify(r.check)}` : ''}`)
    .join('\n')

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    tools: [
      {
        name: 'record_evolution',
        description: '엣지 데이터에 근거해 프레임 개정을 제안(최대 1개 규칙)',
        input_schema: {
          type: 'object',
          properties: {
            suggestion: { type: 'string', description: '사용자에게 보여줄 2~3줄 진단·제안(한국어, 친근)' },
            hasProposal: { type: 'boolean' },
            ruleId: { type: 'string' },
            action: { type: 'string', enum: ['tighten', 'loosen', 'keep', 'drop'] },
            paramPatch: {
              type: 'object',
              properties: {
                minPctBelowHigh: { type: 'number' },
                window: { type: 'number' },
                fast: { type: 'number' },
                slow: { type: 'number' },
                maxPct: { type: 'number' },
              },
            },
            newText: { type: 'string' },
            rationale: { type: 'string' },
          },
          required: ['suggestion', 'hasProposal'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'record_evolution' },
    messages: [
      {
        role: 'user',
        content:
          `사용자의 실제 매매(보유내역·판단기록)를 그의 거래 프레임으로 "돌아본" 결과다. 표본이 적으니 단정 말고 방향만. ` +
          `성과가 프레임 부합과 어떻게 갈리는지 보고, 규칙 1개 개정(tighten/loosen/keep/drop)을 근거와 함께 제안하라. ` +
          `머신체크 숫자 파라미터는 paramPatch로 구체 값을. 과최적화 위험을 한 줄 경고에 포함하라.\n\n` +
          `[운/실력 요약]\n${summaryLine}\n\n[프레임]\n${ruleLines}\n\n[매매별 회고]\n${edgeLines}`,
      },
    ],
  })
  const tool = msg.content.find((c: any) => c.type === 'tool_use') as any
  const i = tool?.input ?? {}
  const proposal: Proposal | null =
    i.hasProposal && i.ruleId
      ? { ruleId: i.ruleId, action: i.action ?? 'keep', paramPatch: i.paramPatch, newText: i.newText, rationale: i.rationale ?? '' }
      : null
  const suggestion =
    i.suggestion && String(i.suggestion).trim()
      ? String(i.suggestion)
      : proposal
        ? `데이터로 보니 손볼 여지가 있어. ${proposal.rationale}`
        : '지금 프레임은 데이터상 크게 손 볼 곳이 없어 보여.'
  return { suggestion, proposal }
}
