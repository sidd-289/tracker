import { getSmartDocumentContext } from '@/lib/db'

const fallbackHosts = [
  process.env.JANS_URL,
  'http://fedora:11434',        // Tailscale MagicDNS
  'http://fedora.local:11434',  // Local LAN mDNS
  'http://jans.local:11434',    // Alternative mDNS alias
  'http://localhost:11434',     // Local loopback
].filter(Boolean) as string[]

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

let cachedHost: string | null = null
let cacheExpiresAt = 0

async function findJansHost(): Promise<string | null> {
  const now = Date.now()
  if (cachedHost && now < cacheExpiresAt) {
    return cachedHost
  }

  for (const host of fallbackHosts) {
    try {
      const response = await fetch(`${host}/api/tags`, {
        signal: AbortSignal.timeout(2500),
        cache: 'no-store',
      })
      if (response.ok) {
        cachedHost = host
        cacheExpiresAt = Date.now() + 20000 // Cache for 20 seconds to avoid repeating DNS & TCP handshakes
        return host
      }
    } catch {
      // Try next network interface
    }
  }

  cachedHost = null
  return null
}

export async function GET() {
  const host = await findJansHost()
  return Response.json({
    online: Boolean(host),
    host: host || null,
  })
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
          error: 'Jans is offline. Make sure your AMD Linux machine (fedora) is powered on and connected to Wi-Fi / Tailscale.',
          offline: true,
        },
        { status: 503 },
      )
    }

    const rawUser = String((body as any).user || (body as any).userId || 'sidd').toLowerCase()
    const isJahnavi = rawUser === 'jahnavi'
    const userName = isJahnavi ? 'Jahnavi' : 'Siddhant'
    const userId = isJahnavi ? 'jahnavi' : 'sidd'

    const userQuery = body.messages[body.messages.length - 1]?.content || ''
    const documentContext = getSmartDocumentContext(userQuery, userId)

    const systemPrompt = isJahnavi
      ? `You are Jans, Jahnavi's personal AI companion, study partner, and wingman running natively on Siddhant's AMD Ryzen Linux machine.
Siddhant custom built this entire private system and companion especially for Jahnavi.
Help Jahnavi organize her day, plan her study, master her concepts, stay calm, and keep her commitments realistic.
Be warm, encouraging, thoughtful, practical, and high-signal. Address her as Jahnavi.
Keep answers concise, direct, and conversational (1 to 3 punchy sentences, avoiding markdown bullet walls or headers) so voice synthesis sounds natural and quick.
${body.context ? `\nJahnavi's current workspace context:\n${body.context}` : ''}${documentContext}`
      : `You are Jans, Siddhant's personal AI engineering companion, study partner, and accountability wingman running natively on his AMD Ryzen Linux machine (fedora).
Help Siddhant plan, research, organize information, master systems architecture, and keep commitments realistic.
Be concise, practical, calm, and high-signal. Address him as Siddhant.
Keep conversational responses punchy, direct, and conversational (1 to 3 punchy sentences, avoiding markdown bullet walls or headers) so voice synthesis sounds natural, snappy, and clear like Jarvis.
${body.context ? `\nSiddhant's current workspace context:\n${body.context}` : ''}${documentContext}`

    const messagesToSend = [
      { role: 'system', content: systemPrompt },
      ...body.messages.slice(-10),
    ]

    const response = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.JANS_MODEL || 'jans',
        stream: false,
        messages: messagesToSend,
        options: {
          temperature: documentContext ? 0.25 : 0.65,
          num_predict: 120, // Cap tokens for instant low-latency conversational duplex speech
        },
      }),
      signal: AbortSignal.timeout(60000), // Extended timeout for CPU inference on Ryzen 5500U
    })

    if (!response.ok) {
      return Response.json(
        { error: `Jans returned HTTP ${response.status} from ${host}.` },
        { status: 502 },
      )
    }

    const data = await response.json()
    const reply = data?.message?.content || "Standing by, Siddhant. What are we organizing or building?"

    return Response.json({ reply, host })
  } catch (error: any) {
    console.error('Jans API Error:', error?.message)
    return Response.json(
      { error: error?.message || 'Jans could not be reached over the network.' },
      { status: 503 },
    )
  }
}
