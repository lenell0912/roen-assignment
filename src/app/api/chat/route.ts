import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystem, ChatContext } from '@/lib/persona'
import { TOOLS, runTool } from '@/lib/tools'

const client = new Anthropic()
const MODEL = 'claude-sonnet-5'

export async function POST(req: NextRequest) {
  const { messages, context } = (await req.json()) as {
    messages: { role: 'user' | 'assistant'; content: any }[]
    context?: ChatContext
  }
  const ctx: ChatContext = context ?? {}
  const system = buildSystem(ctx)
  const convo: any[] = [...messages]
  const usedTools: { name: string; input: any; output?: any }[] = []

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

      const results = await Promise.all(
        toolUses.map(async (t) => {
          const out = await runTool(t.name, t.input, { frame: ctx.frame }).catch((e) => ({ error: String(e.message) }))
          usedTools.push({ name: t.name, input: t.input, output: out })
          return { type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(out) }
        }),
      )
      convo.push({ role: 'user', content: results })
    }
    return NextResponse.json({ reply: '(생각이 길어졌어. 다시 물어봐 줄래?)', usedTools })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }
}
