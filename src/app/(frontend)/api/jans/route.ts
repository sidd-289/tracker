const fallbackHosts = [
  process.env.JANS_URL,
  'http://fedora:11434',
  'http://jans.local:11434',
  'http://localhost:11434',
].filter(Boolean) as string[]

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

async function findJansHost() {
  for (const host of fallbackHosts) {
    try {
      const response = await fetch(`${host}/api/tags`, {
        signal: AbortSignal.timeout(1200),
        cache: 'no-store',
      })
      if (response.ok) return host
    } catch {
      // Try the next local interface.
    }
  }
  return null
}

export async function GET() {
  const host = await findJansHost()
  return Response.json({ online: Boolean(host) })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: ChatMessage[]
      context?: string
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json({ error: 'A message is required.' }, { status: 400 })
    }

    const host = await findJansHost()
    if (!host) {
      return Response.json(
        {
          error: 'Jans is offline. Your local workspace is still fully available.',
          offline: true,
        },
        { status: 503 },
      )
    }

    const response = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.JANS_MODEL || 'jans',
        stream: false,
        messages: [
          {
            role: 'system',
            content: `You are Jans, a Jarvis-style personal intelligence and trusted digital companion. Help the user plan, research, organize information, choose priorities, break down work, review progress, and keep commitments realistic. Be proactive, concise, practical, and calm. Never shame the user. Their current local workspace context is:\n${body.context || 'No workspace summary supplied.'}`,
          },
          ...body.messages.slice(-10),
        ],
        options: { temperature: 0.55 },
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      return Response.json({ error: `Jans returned ${response.status}.` }, { status: 502 })
    }

    const data = await response.json()
    return Response.json({
      reply: data?.message?.content || 'I am here. What should we organize first?',
    })
  } catch {
    return Response.json({ error: 'Jans could not be reached.' }, { status: 503 })
  }
}
