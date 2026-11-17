import { NextRequest } from 'next/server'
import { getCachedDailyQuote, saveCachedDailyQuote, DailyQuote } from '@/lib/db'

const CURATED_QUOTES: Array<{ quote: string; author: string }> = [
  { quote: 'Simplicity is prerequisite for reliability.', author: 'Edsger W. Dijkstra' },
  { quote: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { quote: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { quote: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  {
    quote: 'The impediment to action advances action. What stands in the way becomes the way.',
    author: 'Marcus Aurelius',
  },
  {
    quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    author: 'Will Durant',
  },
  {
    quote: 'Knowing is not enough; we must apply. Willing is not enough; we must do.',
    author: 'Johann Wolfgang von Goethe',
  },
  { quote: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { quote: 'Discipline equals freedom.', author: 'Jocko Willink' },
  { quote: 'Energy flows where attention goes. Protect your deep focus.', author: 'Systems Rule' },
  {
    quote: 'Mastery is not about perfection. It is about relentless daily progress.',
    author: 'Jans Desk',
  },
  {
    quote: 'Compound interest applies to code, habits, and knowledge alike.',
    author: 'Naval Ravikant',
  },
  { quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  {
    quote: 'Focus is a muscle. The more you protect your quiet hours, the sharper it gets.',
    author: 'Deep Work',
  },
  {
    quote: 'Small deeds done are better than great deeds planned.',
    author: 'Peter Marshall',
  },
  {
    quote: 'A system is only as strong as its foundation. Build yours one focused block at a time.',
    author: 'Jans',
  },
  { quote: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { quote: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { quote: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { quote: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { quote: 'Well begun is half done.', author: 'Aristotle' },
  {
    quote: 'Focus on the process, not the outcome. The score takes care of itself.',
    author: 'Bill Walsh',
  },
  { quote: 'Quality is not an act, it is a habit.', author: 'Aristotle' },
  { quote: 'He who has a why to live can bear almost any how.', author: 'Friedrich Nietzsche' },
  {
    quote: 'You do not rise to the level of your goals. You fall to the level of your systems.',
    author: 'James Clear',
  },
  { quote: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  {
    quote:
      'Programs must be written for people to read, and only incidentally for machines to execute.',
    author: 'Harold Abelson',
  },
  { quote: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  {
    quote: 'The most dangerous phrase in the language is: We have always done it this way.',
    author: 'Grace Hopper',
  },
  {
    quote: 'Continuous improvement is better than delayed perfection.',
    author: 'Mark Twain',
  },
]

function getFallbackQuote(dateStr: string): { quote: string; author: string } {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % CURATED_QUOTES.length
  return CURATED_QUOTES[index]
}

export async function GET(request: NextRequest) {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`

  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

  if (!forceRefresh) {
    const cached = getCachedDailyQuote(today)
    if (cached) {
      return Response.json(cached)
    }
  }

  // Attempt online fetch from ZenQuotes API
  try {
    const endpoint = forceRefresh
      ? 'https://zenquotes.io/api/random'
      : 'https://zenquotes.io/api/today'
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(3000),
      headers: { 'User-Agent': 'JansDesk/1.0' },
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data[0]?.q && data[0]?.a) {
        const quoteObj: DailyQuote = {
          quote: data[0].q.trim(),
          author: data[0].a.trim(),
          date: today,
          source: 'zenquotes',
        }
        saveCachedDailyQuote(quoteObj)
        return Response.json(quoteObj)
      }
    }
  } catch {
    // Online fetch failed or timed out — fall through to curated library
  }

  // Fallback to rich curated offline library
  const fallback = getFallbackQuote(forceRefresh ? `${today}-${Date.now()}` : today)
  const result: DailyQuote = {
    quote: fallback.quote,
    author: fallback.author,
    date: today,
    source: 'curated-library',
  }
  saveCachedDailyQuote(result)
  return Response.json(result)
}
