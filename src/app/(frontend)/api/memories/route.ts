import { listMemories, insertMemory, deleteMemory, updateMemory } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawUser = searchParams.get('user') || 'sidd'
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const cleanUser = rawUser.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'

    const memories = listMemories(cleanUser, limit)
    return Response.json({ memories })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to fetch memories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user = 'sidd', category = 'general', fact, importance = 3, tags = '', source = 'manual' } = body

    if (!fact || typeof fact !== 'string' || !fact.trim()) {
      return Response.json({ error: 'Fact is required.' }, { status: 400 })
    }

    const cleanUser = user.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
    const memory = insertMemory(cleanUser, category, fact, importance, tags, source)
    return Response.json({ memory })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to save memory' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'Memory ID is required.' }, { status: 400 })
    }

    const success = deleteMemory(id)
    return Response.json({ ok: success })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to delete memory' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, fact, category, importance, tags } = body

    if (!id) {
      return Response.json({ error: 'Memory ID is required.' }, { status: 400 })
    }

    const success = updateMemory(id, { fact, category, importance, tags })
    return Response.json({ ok: success })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to update memory' }, { status: 500 })
  }
}
