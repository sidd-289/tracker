import { insertMemory, MemoryCategory } from './db'

const EXPLICIT_TRIGGERS = [
  /^remember\s+(?:that\s+)?(.+)/i,
  /^don't\s+forget\s+(?:that\s+)?(.+)/i,
  /^keep\s+in\s+mind\s+(?:that\s+)?(.+)/i,
  /^note\s+(?:that\s+)?(.+)/i,
  /^remember:\s*(.+)/i,
]

const IMPLICIT_KEYWORDS = [
  'i want to',
  'my goal',
  'aiming to',
  'planning to',
  'struggling with',
  'stuck on',
  'i solved',
  'i finished',
  'i built',
  'i passed',
  'my exam',
  'studying',
  'i prefer',
  'i hate',
  'i love',
  'my habit',
  'i slept',
  'wake up',
  'leetcode',
  'assignment',
  'syllabus',
  'commit',
  'promise',
  'milestone',
]

/**
 * Checks if a turn is worth sending to the LLM memory consolidation pass
 */
function shouldAnalyzeTurn(userMessage: string): boolean {
  const lower = userMessage.toLowerCase().trim()
  if (lower.length < 10) return false

  // Skip common conversational chit-chat
  if (
    lower === 'hello' ||
    lower === 'hi' ||
    lower === 'hey' ||
    lower === 'thanks' ||
    lower === 'thank you' ||
    lower === 'bye' ||
    lower === 'good morning' ||
    lower === 'good night' ||
    lower === 'ok' ||
    lower === 'okay' ||
    lower === 'yes' ||
    lower === 'no' ||
    lower === 'what time is it'
  ) {
    return false
  }

  // Check explicit triggers
  for (const trigger of EXPLICIT_TRIGGERS) {
    if (trigger.test(userMessage.trim())) return true
  }

  // Check keyword matches
  return IMPLICIT_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Asynchronously extracts and consolidates durable long-term memories
 * from a conversational turn between the user and Jans.
 */
export async function consolidateMemoryAsync({
  userMessage,
  assistantReply,
  userId = 'sidd',
  host,
}: {
  userMessage: string
  assistantReply: string
  userId?: string
  host: string | null
}) {
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const userName = cleanUser === 'jahnavi' ? 'Jahnavi' : 'Siddhant'

  try {
    const trimmed = userMessage.trim()

    // 1. Check for immediate explicit "remember that..." commands
    for (const pattern of EXPLICIT_TRIGGERS) {
      const match = trimmed.match(pattern)
      if (match && match[1]) {
        const rawFact = match[1].replace(/[.!]+$/, '').trim()
        if (rawFact.length > 5) {
          const formattedFact = `${userName} noted: "${rawFact}"`
          insertMemory(cleanUser, 'general', formattedFact, 5, 'explicit,manual', 'manual')
          return
        }
      }
    }

    // 2. Pre-filter: skip if no salient memory signals
    if (!shouldAnalyzeTurn(userMessage) || !host) {
      return
    }

    // 3. Asynchronously ask Ollama to extract durable knowledge
    const extractionPrompt = `You are Jans's memory consolidation cortex.
Analyze this single conversational exchange between ${userName} and Jans:
User (${userName}): "${userMessage}"
Jans: "${assistantReply}"

Determine if ${userName} revealed any durable, long-term facts worth remembering for future sessions (e.g. goals, milestones, struggles, preferences, projects, habits, exam dates).
Ignore transient questions, temporary states, greetings, or trivial details.
If nothing durable is worth saving, reply strictly with the word: NONE
If there is a durable fact, reply ONLY with a valid JSON object matching this schema:
{
  "category": "goal" | "milestone" | "struggle" | "preference" | "study" | "habit" | "project" | "general",
  "fact": "Concise statement in third person summarizing the durable fact (e.g. '${userName} solved LeetCode #4 using Dynamic Programming')",
  "importance": 1 to 5,
  "tags": "comma,separated,tags"
}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

    const response = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.JANS_MODEL || 'jans',
        stream: false,
        messages: [
          { role: 'system', content: 'You are a precise JSON extractor. Output valid JSON or NONE.' },
          { role: 'user', content: extractionPrompt },
        ],
        options: {
          temperature: 0.1,
          num_predict: 100,
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) return

    const data = await response.json()
    const content = (data?.message?.content || '').trim()

    if (!content || content.toUpperCase().includes('NONE')) {
      return
    }

    // Extract JSON from potential code block or raw string
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return

    const parsed = JSON.parse(jsonMatch[0])
    if (parsed.fact && typeof parsed.fact === 'string') {
      const category = (parsed.category || 'general').toLowerCase() as MemoryCategory
      const importance = typeof parsed.importance === 'number' ? parsed.importance : 3
      const tags = typeof parsed.tags === 'string' ? parsed.tags : ''

      insertMemory(cleanUser, category, parsed.fact, importance, tags, 'auto')
    }
  } catch {
    // Background memory consolidation is resilient and non-blocking
  }
}
