import { NextRequest } from 'next/server'
import { addTask, listTasks, toggleTask, deleteTask } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user') || 'sidd'
    const date = request.nextUrl.searchParams.get('date') || undefined
    const tasks = listTasks(userId, date)
    return Response.json({ tasks })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to list tasks.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user = 'sidd', title, priority = 'Normal', date, time } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return Response.json({ error: 'Task title is required.' }, { status: 400 })
    }

    const task = addTask(user, { title, priority, date, time })
    return Response.json({ task })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to add task.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { user = 'sidd', id } = body

    if (!id) {
      return Response.json({ error: 'Task ID is required.' }, { status: 400 })
    }

    const task = toggleTask(id, user)
    return Response.json({ task, ok: Boolean(task) })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to update task.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user') || 'sidd'
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'Task ID is required.' }, { status: 400 })
    }

    const ok = deleteTask(id, userId)
    return Response.json({ ok })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to delete task.' }, { status: 500 })
  }
}
