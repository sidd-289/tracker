import { NextRequest } from 'next/server'
import { addTask, getWorkspaceState, saveWorkspaceState, TaskRecord } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user') || 'sidd'
    const state = getWorkspaceState(userId) || {}
    const hasToken = Boolean(process.env.MSOT_AUTH_TOKEN)
    const collegeClasses = (state.tasks || []).filter((t: TaskRecord) =>
      t.title.startsWith('[Class]'),
    )

    return Response.json({
      hasToken,
      classCount: collegeClasses.length,
      classes: collegeClasses,
    })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to check timetable state.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token: inputToken, days = 14, user = 'sidd', events: directEvents } = body

    const cleanUser = user.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
    const token = (inputToken || process.env.MSOT_AUTH_TOKEN || '').trim()

    let events: any[] = []

    if (Array.isArray(directEvents) && directEvents.length > 0) {
      events = directEvents
    } else if (token) {
      const todayIso = new Date().toISOString().split('T')[0]
      const url = `https://api.msot.org/hub/box/student/timetable/events?date=${todayIso}&days=${days}`

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
          Referer: 'https://hub.msot.org/',
          Origin: 'https://hub.msot.org',
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return Response.json(
            { error: 'Authentication failed. Your MSOT session token has expired or is invalid.' },
            { status: 401 },
          )
        }
        return Response.json(
          { error: `MSOT API returned HTTP ${res.status}: ${res.statusText}` },
          { status: res.status },
        )
      }

      const data = await res.json()
      if (Array.isArray(data)) {
        events = data
      } else if (data?.data) {
        if (Array.isArray(data.data)) {
          events = data.data
        } else if (typeof data.data === 'object') {
          events = data.data.events || data.data.timetable || data.data.classes || []
        }
      } else if (data?.events) {
        events = data.events
      }
    } else {
      return Response.json(
        { error: 'Missing MSOT authToken. Provide a token or pass events directly.' },
        { status: 400 },
      )
    }

    if (!Array.isArray(events)) {
      events = [events]
    }

    const state = getWorkspaceState(cleanUser) || { tasks: [] }
    const existingTasks: TaskRecord[] = Array.isArray(state.tasks) ? state.tasks : []
    const addedTasks: TaskRecord[] = []
    const todayYmd = new Date().toISOString().split('T')[0]

    for (const ev of events) {
      if (!ev || typeof ev !== 'object') continue
      const subj = (ev.subject_name || ev.subject || ev.title || ev.course_name || ev.name || 'Class').trim()
      const dateIso = (ev.date || ev.start_date || todayYmd).split('T')[0]

      const startT = ev.start_time || ev.startTime || ''
      const endT = ev.end_time || ev.endTime || ''
      const timeStr = `${startT} - ${endT}`.replace(/^ - |- $/g, '').trim()

      const room = ev.room_no || ev.room || ev.venue || ev.classroom || ''
      const faculty = ev.faculty_name || ev.faculty || ev.teacher || ''

      const details: string[] = []
      if (timeStr) details.push(timeStr)
      if (room) details.push(String(room).toLowerCase().startsWith('room') ? String(room) : `Room ${room}`)
      if (faculty) details.push(String(faculty))

      const suffix = details.length > 0 ? ` (${details.join(' · ')})` : ''
      const taskTitle = `[Class] ${subj}${suffix}`

      const evType = String(ev.type || '').toLowerCase()
      const isExam = evType.includes('exam') || evType.includes('test') || evType.includes('quiz') || subj.toLowerCase().includes('exam')
      const priority: 'High' | 'Normal' = isExam ? 'High' : 'Normal'

      // Avoid duplicate exact class on same date
      const duplicate = existingTasks.find(
        (t) => t.title.toLowerCase() === taskTitle.toLowerCase() && t.date === dateIso,
      )
      if (!duplicate) {
        const newTask: TaskRecord = {
          id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: taskTitle,
          done: false,
          priority,
          date: dateIso,
          time: timeStr || undefined,
          createdAt: new Date().toISOString(),
        }
        existingTasks.unshift(newTask)
        addedTasks.push(newTask)
      }
    }

    state.tasks = existingTasks
    saveWorkspaceState(state, cleanUser)

    return Response.json({
      success: true,
      addedCount: addedTasks.length,
      tasks: addedTasks,
      totalClasses: existingTasks.filter((t) => t.title.startsWith('[Class]')).length,
    })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to sync timetable.' }, { status: 500 })
  }
}
