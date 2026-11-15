import { NextRequest } from 'next/server'
import { getWorkspaceState, saveWorkspaceState } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user') || 'sidd'
    const state = getWorkspaceState(userId)
    return Response.json({ state })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to fetch state.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user') || 'sidd'
    const data = await request.json()
    if (!data) {
      return Response.json({ error: 'No payload provided.' }, { status: 400 })
    }
    saveWorkspaceState(data, userId)
    return Response.json({ success: true, updated_at: new Date().toISOString() })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to save state.' }, { status: 500 })
  }
}
