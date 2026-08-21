import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystem, ChatContext } from '@/lib/persona'
import { TOOLS, runTool } from '@/lib/tools'
import { searchStocks } from '@/lib/stocks'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const client = new Anthropic()
const MODEL = 'claude-sonnet-5'

export async function POST(req: NextRequest) {
  // 공개 데모 API 키 보호 — IP당 5분에 30회, 그리고 전역 일일 상한(공유)
  const rl = rateLimit(clientIp(req), { perIp: 30, windowMs: 5 * 60_000 })
  if (!rl.ok) {
    const msg =
      rl.reason === 'global'
        ? '오늘 데모 이용량이 많아 잠시 쉬어가요. 내일 다시 시도해 주세요. 🙏'
        : '잠깐만요 — 요청이 너무 빨라요. 잠시 후 다시 시도해 주세요.'
    return NextResponse.json({ error: msg }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } })
  }

  const { messages, context } = (await req.json()) as {
    messages: { role: 'user' | 'assistant'; content: any }[]
    context?: ChatContext
  }
  // 클라이언트가 보낸 code/name은 신뢰하지 않는다 — code는 6자리 숫자만 통과시키고
  // name은 서버 사전(searchStocks)에서 다시 도출한다. 그래야 임의 텍스트가 시스템 프롬프트에 그대로 섞이지 않는다.
  const rawCode = typeof context?.code === 'string' && /^\d{6}$/.test(context.code) ? context.code : undefined
  const safeName = rawCode ? searchStocks(rawCode, 1)[0]?.name : undefined
  const ctx: ChatContext = { code: rawCode, name: safeName, frame: context?.frame }
  const system = buildSystem(ctx)
  const convo: any[] = [...messages]
  const usedTools: { name: string; input: any; output?: any }[] = []
  let frame = ctx.frame

  try {
    for (let i = 0; i < 5; i++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1400,
        system,
        tools: TOOLS as any,
        messages: convo,
      })
      const toolUses = res.content.filter((c: any) => c.type === 'tool_use') as any[]
      convo.push({ role: 'assistant', content: res.content })

      if (toolUses.length === 0) {
        const text = res.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('')
        return NextResponse.json({ reply: text, usedTools })
      }

      const base = usedTools.length
      const results = await Promise.all(
        toolUses.map(async (t, i) => {
          const out = await runTool(t.name, t.input, {
            frame,
            setFrame: (f) => {
              frame = f
            },
          }).catch((e) => {
            console.error('[tool]', t.name, e instanceof Error ? e.message : String(e))
            return { error: 'tool_failed' }
          })
          usedTools[base + i] = { name: t.name, input: t.input, output: out }
          return { type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(out) }
        }),
      )
      convo.push({ role: 'user', content: results })
    }
    return NextResponse.json({ reply: '(생각이 길어졌어. 다시 물어봐 줄래?)', usedTools })
  } catch (e: any) {
    console.error('[chat]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: '일시적인 오류가 났어. 다시 시도해줘.' }, { status: 502 })
  }
}
