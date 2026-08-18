import Anthropic from '@anthropic-ai/sdk'
import { Frame } from './frame'
import { RuleEdge } from './edges'

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

export async function proposeEvolution(code: string, frame: Frame, edges: RuleEdge[]): Promise<Evolution> {
  const edgeLines = edges
    .map((e) => {
      if (!e.scorable) return `- [${e.ruleId}] "${e.text}": 과거 데이터로 채점 불가`
      return `- [${e.ruleId}] "${e.text}": 지킨날 ${fmt(e.satisfiedAvg)} vs 어긴날 ${fmt(e.violatedAvg)} → 엣지 ${fmt(e.edge)}p (표본 ${e.nSat}/${e.nViol})`
    })
    .join('\n')
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
          `종목 ${code}에 대해 사용자의 거래 프레임을 "그 사용자의 데이터로 채점"한 결과다. 엣지가 낮거나 음수인 규칙은 완화(loosen)/삭제(drop)를, 엣지가 뚜렷한 규칙은 유지(keep)를 제안하라. ` +
          `개정은 최대 1개 규칙만, 반드시 엣지 숫자에 근거해서. 머신체크 숫자 파라미터는 paramPatch로 구체 값을 제시(예: 고점회피 기준 10→5면 {"minPctBelowHigh":5}). ` +
          `과최적화 위험도 한 줄 경고에 포함하라.\n\n[프레임]\n${ruleLines}\n\n[규칙별 엣지]\n${edgeLines}`,
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

function fmt(v: number | null) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}
