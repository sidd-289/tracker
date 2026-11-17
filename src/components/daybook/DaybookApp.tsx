'use client'

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Section =
  | 'Today'
  | 'Diary'
  | 'Notes'
  | 'Commands'
  | 'YouTube'
  | 'Profiles'
  | 'Trackers'
  | 'Jans'
  | 'Library'
type CaptureType = 'Note' | 'Diary' | 'Task' | 'Command'
type Mood = 'Clear' | 'Good' | 'Heavy' | 'Restless'

type Note = {
  id: string
  title: string
  body: string
  label: string
  pinned: boolean
  createdAt: string
}

type DiaryEntry = {
  id: string
  title: string
  body: string
  mood: Mood
  createdAt: string
}

type SavedCommand = {
  id: string
  name: string
  command: string
  label: string
  description: string
  favorite: boolean
}

type Task = {
  id: string
  title: string
  done: boolean
  priority: 'High' | 'Normal'
  date?: string // 'YYYY-MM-DD'
  time?: string
  createdAt?: string
}

type Habit = {
  id: string
  name: string
  days: boolean[]
  color: string
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Video = {
  id: string
  title: string
  url: string
  videoId: string
  label: string
  status: 'queue' | 'watched'
  createdAt: string
}

type CompetitiveProfiles = {
  github: string
  leetcode: string
  codeforces: string
  codechef: string
}

type ProfileData = {
  platform: string
  username: string
  name?: string
  avatar?: string
  bio?: string
  followers?: number
  following?: number
  publicRepos?: number
  totalContributions?: number
  contributions?: { date: string; count: number; level: number }[]
  repos?: {
    id: number
    name: string
    url: string
    description: string
    language: string
    stars: number
  }[]
  rating?: number
  maxRating?: number
  rank?: string
  ranking?: number
  totalSolved?: number
  easy?: number
  medium?: number
  hard?: number
  profileUrl: string
}

type Store = {
  notes: Note[]
  diary: DiaryEntry[]
  commands: SavedCommand[]
  tasks: Task[]
  habits: Habit[]
  videos: Video[]
  profiles: CompetitiveProfiles
  mood: Mood
  craftsmanXp?: number
  velocityXp?: number
  knowledgeXp?: number
}

const DEFAULT_STORE: Store = {
  mood: 'Clear',
  craftsmanXp: 0,
  velocityXp: 0,
  knowledgeXp: 0,
  notes: [],
  diary: [],
  commands: [],
  tasks: [],
  habits: [],
  videos: [],
  profiles: {
    github: 'sidd-289',
    leetcode: '',
    codeforces: '',
    codechef: '',
  },
}

function normalizeProfiles(raw: any): CompetitiveProfiles {
  if (!raw || typeof raw !== 'object') {
    return { github: '', leetcode: '', codeforces: '', codechef: '' }
  }
  return {
    github: typeof raw.github === 'string' ? raw.github : (typeof raw.github?.handle === 'string' ? raw.github.handle : ''),
    leetcode: typeof raw.leetcode === 'string' ? raw.leetcode : (typeof raw.leetcode?.handle === 'string' ? raw.leetcode.handle : ''),
    codeforces: typeof raw.codeforces === 'string' ? raw.codeforces : (typeof raw.codeforces?.handle === 'string' ? raw.codeforces.handle : ''),
    codechef: typeof raw.codechef === 'string' ? raw.codechef : (typeof raw.codechef?.handle === 'string' ? raw.codechef.handle : ''),
  }
}

const nav: { label: Section; icon: string }[] = [
  { label: 'Today', icon: 'grid' },
  { label: 'Diary', icon: 'book' },
  { label: 'Notes', icon: 'note' },
  { label: 'Commands', icon: 'terminal' },
  { label: 'YouTube', icon: 'play' },
  { label: 'Profiles', icon: 'profile' },
  { label: 'Trackers', icon: 'check' },
  { label: 'Jans', icon: 'spark' },
  { label: 'Library', icon: 'file' },
]

const moodDetails: Record<Mood, { mark: string; color: string }> = {
  Clear: { mark: '—', color: '#7f8fbd' },
  Good: { mark: '+', color: '#75a38a' },
  Heavy: { mark: '↓', color: '#9b806d' },
  Restless: { mark: '≈', color: '#e66b3c' },
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    book: (
      <>
        <path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3Z" />
        <path d="M8 3v18M11 8h5M11 12h5" />
      </>
    ),
    note: (
      <>
        <path d="M5 3h14v14l-4 4H5V3Z" />
        <path d="M15 21v-4h4M9 8h6M9 12h5" />
      </>
    ),
    terminal: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="1" />
        <path d="m7 9 3 3-3 3M13 15h4" />
      </>
    ),
    check: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="m7 12 3 3 7-7" />
      </>
    ),
    spark: (
      <>
        <path d="M12 2 9.7 9.7 2 12l7.7 2.3L12 22l2.3-7.7L22 12l-7.7-2.3L12 2Z" />
      </>
    ),
    play: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="1" />
        <path d="m10 9 5 3-5 3V9Z" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0M4 3h3M17 3h3" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    plus: <path d="M12 4v16M4 12h16" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="1" />
        <path d="M16 8V4H4v12h4" />
      </>
    ),
    pin: <path d="m8 3 8 8M14 5l3-2 4 4-2 3-4 2-5 5-3-3 5-5 2-4Z" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m5 5 14 14M19 5 5 19" />,
    up: <path d="m5 14 7-7 7 7" />,
    dots: (
      <>
        <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
    mic: (
      <>
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
      </>
    ),
    speaker: (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
      </>
    ),
    speakerOff: (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function JansCharacter({ compact = false, level }: { compact?: boolean; level: number }) {
  return (
    <div
      className={compact ? 'relative h-12 w-12 shrink-0' : 'relative h-[210px] w-[190px] shrink-0'}
      aria-label={`Jans intelligence character, evolution level ${level}`}
      role="img"
    >
      <svg viewBox="0 0 190 220" className="h-full w-full overflow-visible">
        {!compact && (
          <>
            <path d="M30 192h132" stroke="#20211f" strokeWidth="2" />
            <path d="M45 199h102" stroke="#20211f" strokeWidth="2" />
          </>
        )}
        <path
          d="M55 100 73 86h45l20 16 8 63-23 32H69l-25-32 11-65Z"
          fill="#f3efe3"
          stroke="#20211f"
          strokeWidth="4"
        />
        <path
          d="M68 92V51l18-18h33l17 18v43l-18 17H85L68 92Z"
          fill="#ffca3a"
          stroke="#20211f"
          strokeWidth="4"
        />
        <path d="M77 55h50v39H77z" fill="#20211f" />
        <path d="M84 67h13v9H84zM108 67h13v9h-13z" fill="#f3efe3" />
        <path d="M94 86h17" stroke="#ffca3a" strokeWidth="3" />
        <path
          d="m68 59-13 7v19l13 5M136 59l13 7v19l-13 5"
          fill="#e66b3c"
          stroke="#20211f"
          strokeWidth="4"
        />
        <path d="M91 33V20h23v13" fill="#7f8fbd" stroke="#20211f" strokeWidth="4" />
        <circle
          cx="102.5"
          cy="15"
          r="5.5"
          fill={level > 1 ? '#e66b3c' : '#f3efe3'}
          stroke="#20211f"
          strokeWidth="3"
        />
        <path
          d="m55 119-24 15 9 39 20-8M138 119l22 14-7 40-21-8"
          fill="#75a38a"
          stroke="#20211f"
          strokeWidth="4"
        />
        <path d="M75 121h53v35H75z" fill="#20211f" />
        <path d="M84 132h20v4H84zM84 143h34v4H84z" fill="#f3efe3" />
        {level > 1 && (
          <path d="m128 42 16-12 8 11-16 13" fill="#e66b3c" stroke="#20211f" strokeWidth="4" />
        )}
        {level > 2 && (
          <path d="M61 181h82l-11 18H72l-11-18Z" fill="#7f8fbd" stroke="#20211f" strokeWidth="4" />
        )}
      </svg>
      {!compact && (
        <div className="absolute right-0 top-8 border-2 border-[#20211f] bg-[#f3efe3] px-2 py-1 font-mono text-[9px] font-bold uppercase shadow-[3px_3px_0_#20211f]">
          LVL {level}
        </div>
      )}
    </div>
  )
}

function sanitizeTasks(tasks: Task[]): Task[] {
  if (!Array.isArray(tasks)) return []
  const seenIds = new Set<string>()
  return tasks.map((t, idx) => {
    let id = t?.id
    if (!id || seenIds.has(id)) {
      id = `task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`
    }
    seenIds.add(id)
    return { ...t, id }
  })
}

function useLocalStore() {
  const [currentUser, setCurrentUser] = useState<'sidd' | 'jahnavi'>('sidd')
  const [store, setStore] = useState<Store>(DEFAULT_STORE)
  const [loaded, setLoaded] = useState(false)

  // Initialize active user on mount (checks URL parameter ?user=jahnavi first, then localStorage)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const paramUser = urlParams.get('user')?.toLowerCase()
      if (paramUser === 'jahnavi' || paramUser === 'sidd') {
        setCurrentUser(paramUser)
        window.localStorage.setItem('jans-active-user', paramUser)
        return
      }

      const savedUser = window.localStorage.getItem('jans-active-user')
      if (savedUser === 'jahnavi' || savedUser === 'sidd') {
        setCurrentUser(savedUser)
      }
    } catch {}
  }, [])

  // Whenever currentUser changes, load state from local storage and sync with SQLite
  useEffect(() => {
    setLoaded(false)
    const storageKey = `jans-desk-v1-${currentUser}`
    try {
      const saved =
        window.localStorage.getItem(storageKey) ||
        (currentUser === 'sidd' ? window.localStorage.getItem('jans-desk-v1') : null)
      if (saved) {
        const parsed = JSON.parse(saved)
        setStore({
          ...DEFAULT_STORE,
          ...parsed,
          tasks: sanitizeTasks(parsed.tasks || []),
          profiles: normalizeProfiles({
            ...DEFAULT_STORE.profiles,
            ...(parsed.profiles || {}),
          }),
        })
      } else {
        setStore(DEFAULT_STORE)
      }
    } finally {
      setLoaded(true)
    }

    // Fetch from SQLite for this user
    fetch(`/api/sync?user=${currentUser}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.state) {
          setStore((current) => ({
            ...current,
            ...data.state,
            tasks: sanitizeTasks(data.state.tasks || current.tasks),
            profiles: normalizeProfiles({
              ...current.profiles,
              ...(data.state.profiles || {}),
            }),
          }))
        }
      })
      .catch(() => {})
  }, [currentUser])

  // Cross-device sync: re-fetch from SQLite when switching back to tab/app
  useEffect(() => {
    function syncLatest() {
      fetch(`/api/sync?user=${currentUser}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.state) {
            setStore((current) => ({
              ...current,
              ...data.state,
              tasks: sanitizeTasks(data.state.tasks || current.tasks),
              profiles: normalizeProfiles({
                ...current.profiles,
                ...(data.state.profiles || {}),
              }),
            }))
          }
        })
        .catch(() => {})
    }

    window.addEventListener('focus', syncLatest)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncLatest()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', syncLatest)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [currentUser])

  // Save changes for this user
  useEffect(() => {
    if (!loaded) return
    const storageKey = `jans-desk-v1-${currentUser}`
    window.localStorage.setItem(storageKey, JSON.stringify(store))
    window.localStorage.setItem('jans-active-user', currentUser)

    const timer = setTimeout(() => {
      fetch(`/api/sync?user=${currentUser}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store),
      }).catch(() => {})
    }, 1200)
    return () => clearTimeout(timer)
  }, [loaded, store, currentUser])

  return { store, setStore, loaded, currentUser, setCurrentUser }
}

export function DaybookApp() {
  const { store, setStore, currentUser, setCurrentUser } = useLocalStore()
  const [active, setActive] = useState<Section>('Today')
  const [capture, setCapture] = useState<CaptureType | null>(null)
  const [query, setQuery] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [commandFilter, setCommandFilter] = useState('All')
  const [dateLabel, setDateLabel] = useState('Today')
  const searchRef = useRef<HTMLInputElement>(null)

  const completedTasks = store.tasks.filter((task) => task.done).length
  const totalRecords = store.notes.length + store.diary.length + store.commands.length
  const jansLevel = totalRecords > 12 ? 3 : totalRecords > 6 ? 2 : 1

  useEffect(() => {
    setDateLabel(
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    )
  }, [])

  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setCapture('Note')
      }
    }
    window.addEventListener('keydown', shortcuts)
    return () => window.removeEventListener('keydown', shortcuts)
  }, [])

  const searchResults = useMemo(() => {
    const raw = query.trim()
    if (!raw) return []
    const needle = raw.toLowerCase()
    type SearchResultItem = {
      id: string
      title: string
      meta: string
      section: Section
      action?: () => void
      isAction?: boolean
    }
    const actions: SearchResultItem[] = []

    // 1. YouTube Quick Add via URL
    const ytId = extractYouTubeId(raw)
    if (ytId) {
      actions.push({
        id: 'action-yt-add',
        title: `+ Save Video to Queue (${ytId})`,
        meta: 'Quick Action · YouTube Queue',
        section: 'YouTube',
        isAction: true,
        action: () => {
          const videoUrl = raw.startsWith('http') ? raw : `https://${raw}`
          setStore((current) => ({
            ...current,
            videos: [
              {
                id: `video-${Date.now()}`,
                title: `YouTube Video (${ytId})`,
                url: videoUrl,
                videoId: ytId,
                label: 'Learning',
                status: 'queue',
                createdAt: new Date().toISOString(),
              },
              ...current.videos,
            ],
          }))
          setActive('YouTube')
        },
      })
    }

    // 2. Task Quick Add (task: or todo:)
    if (needle.startsWith('task:') || needle.startsWith('todo:')) {
      const taskTitle = raw.replace(/^(task|todo):\s*/i, '').trim()
      if (taskTitle) {
        actions.push({
          id: 'action-task-add',
          title: `+ Add Task: "${taskTitle}"`,
          meta: 'Quick Action · Today Plan',
          section: 'Today',
          isAction: true,
          action: () => {
            setStore((current) => ({
              ...current,
              tasks: [
                ...current.tasks,
                {
                  id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  title: taskTitle,
                  done: false,
                  priority: 'Normal',
                },
              ],
            }))
            setActive('Today')
          },
        })
      }
    }

    // 3. Note Quick Add (note:)
    if (needle.startsWith('note:')) {
      const noteTitle = raw.replace(/^note:\s*/i, '').trim()
      if (noteTitle) {
        actions.push({
          id: 'action-note-add',
          title: `+ Create Note: "${noteTitle}"`,
          meta: 'Quick Action · Notes',
          section: 'Notes',
          isAction: true,
          action: () => {
            setStore((current) => ({
              ...current,
              notes: [
                {
                  id: `note-${Date.now()}`,
                  title: noteTitle,
                  body: '',
                  label: 'General',
                  pinned: false,
                  createdAt: new Date().toISOString(),
                },
                ...current.notes,
              ],
            }))
            setActive('Notes')
          },
        })
      }
    }

    // 4. Command Quick Add (cmd: or command:)
    if (needle.startsWith('cmd:') || needle.startsWith('command:')) {
      const cmdStr = raw.replace(/^(cmd|command):\s*/i, '').trim()
      if (cmdStr) {
        actions.push({
          id: 'action-cmd-add',
          title: `+ Save Command: "${cmdStr}"`,
          meta: 'Quick Action · Commands Runbook',
          section: 'Commands',
          isAction: true,
          action: () => {
            setStore((current) => ({
              ...current,
              commands: [
                {
                  id: `cmd-${Date.now()}`,
                  name: cmdStr.split(' ')[0] || 'Command',
                  command: cmdStr,
                  label: 'CLI',
                  description: 'Saved via command bar',
                  favorite: false,
                },
                ...current.commands,
              ],
            }))
            setActive('Commands')
          },
        })
      }
    }

    // Standard content search matches
    const contentMatches: SearchResultItem[] = [
      ...store.notes
        .filter((item) => `${item.title} ${item.body} ${item.label}`.toLowerCase().includes(needle))
        .map((item) => ({
          id: item.id,
          title: item.title,
          meta: `Note · ${item.label}`,
          section: 'Notes' as Section,
        })),
      ...store.diary
        .filter((item) => `${item.title} ${item.body} ${item.mood}`.toLowerCase().includes(needle))
        .map((item) => ({
          id: item.id,
          title: item.title,
          meta: `Diary · ${item.mood}`,
          section: 'Diary' as Section,
        })),
      ...store.commands
        .filter((item) =>
          `${item.name} ${item.command} ${item.label} ${item.description}`
            .toLowerCase()
            .includes(needle),
        )
        .map((item) => ({
          id: item.id,
          title: item.name,
          meta: `Command · ${item.label}`,
          section: 'Commands' as Section,
        })),
      ...store.tasks
        .filter((item) => item.title.toLowerCase().includes(needle))
        .map((item) => ({
          id: item.id,
          title: item.title,
          meta: 'Task · Today',
          section: 'Today' as Section,
        })),
      ...store.videos
        .filter((item) => `${item.title} ${item.label}`.toLowerCase().includes(needle))
        .map((item) => ({
          id: item.id,
          title: item.title,
          meta: `YouTube · ${item.label}`,
          section: 'YouTube' as Section,
        })),
    ]

    return [...actions, ...contentMatches].slice(0, 8)
  }, [query, store])

  function chooseSearchResult(result: Section | { section: Section; action?: () => void }) {
    if (typeof result === 'string') {
      setActive(result)
    } else if (result.action) {
      result.action()
    } else {
      setActive(result.section)
    }
    setQuery('')
    setMobileNav(false)
  }

  function copyCommand(command: SavedCommand) {
    navigator.clipboard.writeText(command.command)
    setCopied(command.id)
    window.setTimeout(() => setCopied(null), 1500)
  }

  function deleteRecord(kind: 'note' | 'diary' | 'command', id: string) {
    setStore((current) => ({
      ...current,
      notes: kind === 'note' ? current.notes.filter((item) => item.id !== id) : current.notes,
      diary: kind === 'diary' ? current.diary.filter((item) => item.id !== id) : current.diary,
      commands:
        kind === 'command' ? current.commands.filter((item) => item.id !== id) : current.commands,
    }))
  }

  return (
    <div className="min-h-screen bg-[#e8e5dc] text-[#20211f]">
      <div className="mx-auto grid min-h-screen max-w-[1720px] grid-cols-1 bg-[#f3efe3] lg:grid-cols-[224px_1fr]">
        <aside
          className={`${mobileNav ? 'flex' : 'hidden'} fixed inset-0 z-40 flex-col border-r-2 border-[#20211f] bg-[#dfe5da] p-5 lg:sticky lg:top-0 lg:flex lg:h-screen`}
        >
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-3 text-left"
              onClick={() => chooseSearchResult('Today')}
            >
              <span className="grid h-9 w-9 place-items-center border-2 border-[#20211f] bg-[#ffca3a] shadow-[3px_3px_0_#20211f]">
                <span className="h-3 w-3 bg-[#20211f]" />
              </span>
              <span>
                <strong className="block text-[15px] font-black tracking-[-0.04em]">
                  JANS DESK
                </strong>
                <small className="block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#596057]">
                  Personal OS / 01
                </small>
              </span>
            </button>
            <button
              className="p-2 lg:hidden"
              onClick={() => setMobileNav(false)}
              aria-label="Close navigation"
            >
              <Icon name="close" />
            </button>
          </div>

          <nav className="mt-12 grid gap-1" aria-label="Main navigation">
            {nav.map((item, index) => (
              <button
                key={item.label}
                onClick={() => chooseSearchResult(item.label)}
                className={`group flex h-11 items-center gap-3 border-2 px-3 text-left text-[12px] font-bold transition ${
                  active === item.label
                    ? 'border-[#20211f] bg-[#f3efe3] shadow-[3px_3px_0_#20211f]'
                    : 'border-transparent text-[#596057] hover:border-[#20211f]/30 hover:bg-[#edf0e9]'
                }`}
              >
                <span className="w-4 font-mono text-[9px] text-[#848b80]">0{index + 1}</span>
                <Icon name={item.icon} size={16} />
                <span>{item.label}</span>
                {item.label === 'Commands' && (
                  <span className="ml-auto bg-[#ffca3a] px-1.5 py-0.5 font-mono text-[8px] text-[#20211f]">
                    {store.commands.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto border-2 border-[#20211f] bg-[#f3efe3] p-3 shadow-[3px_3px_0_#20211f]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-[#75a38a]" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em]">
                Local & private
              </span>
            </div>
            <div className="mt-3 h-1.5 border border-[#20211f] bg-white">
              <div
                className="h-full bg-[#e66b3c]"
                style={{ width: `${Math.min(100, totalRecords * 5)}%` }}
              />
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[#687066]">
              {totalRecords} records saved in this browser.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-[70px] items-center gap-3 border-b-2 border-[#20211f] bg-[#f3efe3]/95 px-4 backdrop-blur md:px-7">
            <button
              className="p-2 lg:hidden"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>

            <div className="relative max-w-[520px] flex-1">
              <div className="flex h-10 items-center gap-2 border-2 border-[#20211f] bg-white px-3 shadow-[2px_2px_0_#20211f]">
                <Icon name="search" size={16} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search everything..."
                  className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#8e928a]"
                />
                <kbd className="hidden border border-[#20211f] bg-[#ece9df] px-1.5 py-0.5 font-mono text-[8px] sm:block">
                  ⌘ K
                </kbd>
              </div>
              {query && (
                <div className="absolute left-0 right-0 top-12 z-50 border-2 border-[#20211f] bg-[#f3efe3] p-2 shadow-[5px_5px_0_#20211f]">
                  {searchResults.length ? (
                    searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => chooseSearchResult(result)}
                        className={`flex w-full items-center justify-between border-b border-[#20211f]/20 px-3 py-3 text-left last:border-0 hover:bg-[#ffca3a]/25 ${
                          result.isAction ? 'bg-[#ffca3a]/25 font-bold' : ''
                        }`}
                      >
                        <span>
                          <strong className="block text-[11px]">{result.title}</strong>
                          <small className="font-mono text-[8px] uppercase text-[#737970]">
                            {result.meta}
                          </small>
                        </span>
                        <Icon name={result.isAction ? 'plus' : 'arrow'} size={13} />
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center">
                      <p className="text-[11px] text-[#737970]">No matching records.</p>
                      <p className="mt-1 font-mono text-[8px] text-[#8e928a]">
                        Tip: Type <code className="bg-[#dfe5da] px-1 py-0.5">task:</code>,{' '}
                        <code className="bg-[#dfe5da] px-1 py-0.5">note:</code>,{' '}
                        <code className="bg-[#dfe5da] px-1 py-0.5">cmd:</code>, or paste a YouTube URL.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Multi-Tenant Profile Switcher */}
            <div className="ml-auto flex items-center border-2 border-[#20211f] bg-white p-0.5 shadow-[2px_2px_0_#20211f]">
              <button
                onClick={() => setCurrentUser('sidd')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase transition ${
                  currentUser === 'sidd'
                    ? 'bg-[#20211f] text-[#ffca3a]'
                    : 'text-[#596057] hover:bg-[#dfe5da]'
                }`}
                title="Switch to Siddhant's Profile"
              >
                <span>SIDD</span>
              </button>
              <button
                onClick={() => setCurrentUser('jahnavi')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase transition ${
                  currentUser === 'jahnavi'
                    ? 'bg-[#e66b3c] text-white'
                    : 'text-[#596057] hover:bg-[#dfe5da]'
                }`}
                title="Switch to Jahnavi's Profile"
              >
                <span>JAHNAVI</span>
              </button>
            </div>

            <button
              onClick={() => setCapture('Note')}
              className="flex h-10 items-center gap-2 border-2 border-[#20211f] bg-[#ffca3a] px-3 text-[11px] font-black shadow-[3px_3px_0_#20211f] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none md:px-4"
            >
              <Icon name="plus" size={16} />
              <span className="hidden sm:inline">QUICK CAPTURE</span>
            </button>
          </header>

          <main className="mx-auto w-full max-w-[1220px] px-4 py-8 md:px-8 md:py-11">
            {active === 'Today' && (
              <TodayView
                store={store}
                setStore={setStore}
                dateLabel={dateLabel}
                jansLevel={jansLevel}
                completedTasks={completedTasks}
                currentUser={currentUser}
                onCapture={setCapture}
                onNavigate={setActive}
              />
            )}
            {active === 'Diary' && (
              <DiaryView
                entries={store.diary}
                onCapture={() => setCapture('Diary')}
                onDelete={(id) => deleteRecord('diary', id)}
              />
            )}
            {active === 'Notes' && (
              <NotesView
                notes={store.notes}
                onCapture={() => setCapture('Note')}
                onDelete={(id) => deleteRecord('note', id)}
                onPin={(id) =>
                  setStore((current) => ({
                    ...current,
                    notes: current.notes.map((note) =>
                      note.id === id ? { ...note, pinned: !note.pinned } : note,
                    ),
                  }))
                }
              />
            )}
            {active === 'Commands' && (
              <CommandsView
                commands={store.commands}
                filter={commandFilter}
                setFilter={setCommandFilter}
                copied={copied}
                onCopy={copyCommand}
                onCapture={() => setCapture('Command')}
                onDelete={(id) => deleteRecord('command', id)}
                onFavorite={(id) =>
                  setStore((current) => ({
                    ...current,
                    commands: current.commands.map((command) =>
                      command.id === id ? { ...command, favorite: !command.favorite } : command,
                    ),
                  }))
                }
              />
            )}
            {active === 'YouTube' && <YouTubeView store={store} setStore={setStore} />}
            {active === 'Profiles' && <ProfilesView store={store} setStore={setStore} />}
            {active === 'Trackers' && <TrackersView store={store} setStore={setStore} />}
            {active === 'Jans' && (
              <JansView store={store} jansLevel={jansLevel} currentUser={currentUser} />
            )}
            {active === 'Library' && (
              <LibraryView setStore={setStore} currentUser={currentUser} />
            )}
          </main>
        </div>
      </div>

      {capture && (
        <CaptureModal
          initialType={capture}
          onClose={() => setCapture(null)}
          onSave={(type, form) => {
            const now = new Date().toISOString()
            const id = `${type.toLowerCase()}-${Date.now()}`
            setStore((current) => {
              if (type === 'Note') {
                return {
                  ...current,
                  notes: [
                    {
                      id,
                      title: form.title,
                      body: form.body,
                      label: form.label || 'General',
                      pinned: false,
                      createdAt: now,
                    },
                    ...current.notes,
                  ],
                }
              }
              if (type === 'Diary') {
                return {
                  ...current,
                  diary: [
                    { id, title: form.title, body: form.body, mood: current.mood, createdAt: now },
                    ...current.diary,
                  ],
                }
              }
              if (type === 'Task') {
                const todayIso = new Date().toISOString().split('T')[0]
                return {
                  ...current,
                  tasks: [
                    {
                      id,
                      title: form.title,
                      done: false,
                      priority: (form.priority || form.label) === 'High' ? 'High' : 'Normal',
                      date: form.date || todayIso,
                      createdAt: now,
                    },
                    ...current.tasks,
                  ],
                }
              }
              return {
                ...current,
                commands: [
                  {
                    id,
                    name: form.title,
                    command: form.body,
                    label: form.label || 'General',
                    description: form.description,
                    favorite: false,
                  },
                  ...current.commands,
                ],
              }
            })
            setCapture(null)
          }}
        />
      )}
    </div>
  )
}

function PageHeading({
  index,
  title,
  description,
  action,
}: {
  index: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-9 flex items-end justify-between gap-5">
      <div>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#e66b3c]">
          SECTION {index}
        </span>
        <h1 className="mt-2 text-[38px] font-black leading-none tracking-[-0.055em] md:text-[52px]">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-[12px] leading-5 text-[#697067]">{description}</p>
      </div>
      {action}
    </div>
  )
}

function TodayView({
  store,
  setStore,
  dateLabel,
  jansLevel,
  completedTasks,
  currentUser = 'sidd',
  onCapture,
  onNavigate,
}: {
  store: Store
  setStore: React.Dispatch<React.SetStateAction<Store>>
  dateLabel: string
  jansLevel: number
  completedTasks: number
  currentUser?: 'sidd' | 'jahnavi'
  onCapture: (type: CaptureType) => void
  onNavigate: (section: Section) => void
}) {
  const [briefOpen, setBriefOpen] = useState(false)
  const [showTimetableModal, setShowTimetableModal] = useState(false)

  // Interactive Calendar & Date Navigation State (Using Local Date Utilities to eliminate timezone drift)
  const toLocalDateIso = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const parseLocalDateIso = (iso: string): Date => {
    const parts = (iso || '').split('-').map(Number)
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return new Date()
    }
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
  }

  const todayIso = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [showMonthGrid, setShowMonthGrid] = useState(false)
  const [filterMode, setFilterMode] = useState<'day' | 'all'>('day')
  const [quickTitle, setQuickTitle] = useState('')
  const [quickPriority, setQuickPriority] = useState<'Normal' | 'High'>('Normal')

  // Daily Motivational Quote state
  const [dailyQuote, setDailyQuote] = useState<{ quote: string; author: string }>({
    quote: 'Simplicity is prerequisite for reliability.',
    author: 'Edsger W. Dijkstra',
  })
  const [quoteLoading, setQuoteLoading] = useState(false)

  const loadQuote = useCallback((refresh = false) => {
    setQuoteLoading(true)
    fetch(`/api/quote${refresh ? '?refresh=true' : ''}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.quote) {
          setDailyQuote({ quote: data.quote, author: data.author || 'Unknown' })
        }
      })
      .catch(() => {})
      .finally(() => setQuoteLoading(false))
  }, [])

  useEffect(() => {
    loadQuote(false)
  }, [loadQuote])

  const targetDate = useMemo(() => parseLocalDateIso(selectedDate), [selectedDate])
  const todayDate = useMemo(() => parseLocalDateIso(todayIso), [todayIso])

  const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
  const isToday = selectedDate === todayIso
  const relativeBadge = isToday
    ? 'TODAY'
    : diffDays === 1
    ? 'TOMORROW'
    : diffDays === -1
    ? 'YESTERDAY'
    : diffDays > 0
    ? `IN ${diffDays} DAYS`
    : `${Math.abs(diffDays)} DAYS AGO`

  const formattedSelectedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(targetDate)
  }, [targetDate])

  function navigateDay(offset: number) {
    const d = parseLocalDateIso(selectedDate)
    d.setDate(d.getDate() + offset)
    setSelectedDate(toLocalDateIso(d))
  }

  // 7-day strip centered around selectedDate
  const weekStrip = useMemo(() => {
    const baseDate = parseLocalDateIso(selectedDate)
    const days: Array<{
      iso: string
      dayName: string
      dayNum: number
      isToday: boolean
      isSelected: boolean
      count: number
    }> = []
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + offset)
      const iso = toLocalDateIso(d)
      const count = store.tasks.filter((t) => (t.date || todayIso) === iso).length
      days.push({
        iso,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: iso === todayIso,
        isSelected: iso === selectedDate,
        count,
      })
    }
    return days
  }, [selectedDate, store.tasks, todayIso])

  // Month grid days (1..daysInMonth)
  const monthDays = useMemo(() => {
    const baseDate = parseLocalDateIso(selectedDate)
    const year = baseDate.getFullYear()
    const month = baseDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0

    const days: Array<{
      iso: string
      dayNum: number
      count: number
      isToday: boolean
      isSelected: boolean
    }> = []

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day, 12, 0, 0)
      const iso = toLocalDateIso(dayDate)
      const count = store.tasks.filter((t) => (t.date || todayIso) === iso).length
      days.push({
        iso,
        dayNum: day,
        count,
        isToday: iso === todayIso,
        isSelected: iso === selectedDate,
      })
    }
    return {
      days,
      firstDayIndex,
      monthName: baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
  }, [selectedDate, store.tasks, todayIso])

  // Filter tasks based on view mode
  const filteredTasks = useMemo(() => {
    if (filterMode === 'all') return store.tasks
    return store.tasks.filter((t) => (t.date || todayIso) === selectedDate)
  }, [filterMode, store.tasks, selectedDate, todayIso])

  const dayCompleted = filteredTasks.filter((t) => t.done).length

  function handleQuickAdd(e: FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: quickTitle.trim(),
      done: false,
      priority: quickPriority,
      date: selectedDate,
      createdAt: new Date().toISOString(),
    }
    setStore((current) => ({
      ...current,
      tasks: [newTask, ...current.tasks],
    }))
    setQuickTitle('')
  }

  function deleteTask(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setStore((current) => ({
      ...current,
      tasks: current.tasks.filter((t) => t.id !== id),
    }))
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#e66b3c]">
            {dateLabel}
          </span>
          <h1 className="mt-2 text-[40px] font-black leading-[0.92] tracking-[-0.06em] md:text-[58px]">
            Keep today
            <br />
            <span className="font-serif font-normal italic">manageable.</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <StatChip value={`${completedTasks}/${store.tasks.length}`} label="tasks" />
          <StatChip
            value={`${store.habits.filter((habit) => habit.days[4]).length}`}
            label="habits"
          />
          <StatChip value="06" label="day streak" />
        </div>
      </div>

      <section className="grid border-2 border-[#20211f] bg-[#dfe5da] shadow-[5px_5px_0_#20211f] lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col justify-between border-b-2 border-[#20211f] p-5 md:p-7 lg:border-b-0 lg:border-r-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-[#75a38a]" />
                <span className="font-mono text-[9px] font-black uppercase tracking-[0.18em]">
                  Jans / Daily Spark & Brief
                </span>
              </div>
              <button
                type="button"
                onClick={() => loadQuote(true)}
                disabled={quoteLoading}
                className="flex items-center gap-1 border-2 border-[#20211f] bg-white px-2 py-0.5 font-mono text-[8px] font-black uppercase transition hover:bg-[#ffca3a] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                title="Get another quote from library"
              >
                <span className={quoteLoading ? 'inline-block animate-spin' : ''}>↻</span>
                <span>{quoteLoading ? 'Fetching...' : 'New Spark'}</span>
              </button>
            </div>

            <div className="mt-5">
              <h2 className="max-w-[660px] font-serif text-[23px] font-normal italic leading-snug tracking-tight text-[#20211f] md:text-[30px]">
                &ldquo;{dailyQuote.quote}&rdquo;
              </h2>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="h-[2px] w-5 bg-[#e66b3c]" />
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#20211f]">
                  {dailyQuote.author}
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-[580px] font-mono text-[10px] leading-relaxed text-[#636a61]">
              {filteredTasks.length > 0
                ? `${filteredTasks.length} task${filteredTasks.length > 1 ? 's' : ''} on deck for ${formattedSelectedDate} (${dayCompleted} done). Protect a quiet focus block, review notes, and keep your plan sharp.`
                : `No tasks scheduled for ${formattedSelectedDate}. Use this space for deep study, review past notes, or schedule your next target below.`}
            </p>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            <button
              onClick={() => setBriefOpen(!briefOpen)}
              className="border-2 border-[#20211f] bg-[#20211f] px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#f3efe3]"
            >
              {briefOpen ? 'Close plan' : 'Open today’s plan'}
            </button>
            <button
              onClick={() => onNavigate('Jans')}
              className="border-2 border-[#20211f] bg-[#f3efe3] px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em]"
            >
              Talk to Jans
            </button>
          </div>
          {briefOpen && (
            <div className="mt-5 grid gap-2 border-t-2 border-[#20211f] pt-5 sm:grid-cols-3">
              {['09:00 · Deep work', '13:30 · Admin batch', '19:45 · Daily close'].map((item) => (
                <div
                  key={item}
                  className="border border-[#20211f] bg-[#f3efe3] px-3 py-2 font-mono text-[9px] font-bold"
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative flex min-h-[260px] items-end justify-center overflow-hidden bg-[#ffca3a]">
          <span className="absolute left-4 top-4 font-mono text-[8px] font-black uppercase tracking-[0.18em]">
            Intelligence form / {jansLevel}
          </span>
          <JansCharacter level={jansLevel} />
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_320px]">
        <div>
          {/* Calendar & Date Navigator Bar */}
          <div className="mb-4 border-2 border-[#20211f] bg-[#f3efe3] p-3 shadow-[3px_3px_0_#20211f]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#20211f] pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateDay(-1)}
                  className="grid h-7 w-7 place-items-center border-2 border-[#20211f] bg-white text-[12px] font-black transition hover:bg-[#ffca3a] active:translate-x-[1px] active:translate-y-[1px]"
                  title="Previous Day"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => navigateDay(1)}
                  className="grid h-7 w-7 place-items-center border-2 border-[#20211f] bg-white text-[12px] font-black transition hover:bg-[#ffca3a] active:translate-x-[1px] active:translate-y-[1px]"
                  title="Next Day"
                >
                  ▶
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-black uppercase text-[#20211f]">
                    📅 {formattedSelectedDate}
                  </span>
                  <span
                    className={`border border-[#20211f] px-1.5 py-0.5 font-mono text-[8px] font-black uppercase ${
                      isToday
                        ? 'bg-[#ffca3a] text-[#20211f]'
                        : diffDays > 0
                        ? 'bg-[#dfe5da] text-[#20211f]'
                        : 'bg-white text-[#777d74]'
                    }`}
                  >
                    {relativeBadge}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isToday && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayIso)}
                    className="border border-[#20211f] bg-white px-2 py-1 font-mono text-[8px] font-black uppercase text-[#20211f] transition hover:bg-[#ffca3a]"
                  >
                    Jump to Today
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowMonthGrid((prev) => !prev)}
                  className={`border border-[#20211f] px-2 py-1 font-mono text-[8px] font-black uppercase transition ${
                    showMonthGrid
                      ? 'bg-[#20211f] text-[#ffca3a]'
                      : 'bg-white text-[#20211f] hover:bg-[#dfe5da]'
                  }`}
                >
                  {showMonthGrid ? '✕ Close Calendar' : '📅 Month Grid'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTimetableModal(true)}
                  className="border border-[#20211f] bg-white px-2 py-1 font-mono text-[8px] font-black uppercase text-[#20211f] transition hover:bg-[#ffca3a]"
                  title="Sync College Timetable from hub.msot.org"
                >
                  🎓 College Timetable
                </button>
              </div>
            </div>

            {/* Interactive 7-Day Strip */}
            <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
              {weekStrip.map((day) => (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setSelectedDate(day.iso)}
                  className={`flex flex-col items-center justify-center border-2 border-[#20211f] p-1.5 transition active:translate-x-[1px] active:translate-y-[1px] ${
                    day.isSelected
                      ? 'bg-[#ffca3a] shadow-[2px_2px_0_#20211f]'
                      : day.isToday
                      ? 'bg-[#dfe5da] hover:bg-[#edf0e9]'
                      : 'bg-white hover:bg-[#fff9dd]'
                  }`}
                >
                  <span className="font-mono text-[8px] font-black uppercase text-[#697067]">
                    {day.dayName}
                  </span>
                  <span className="text-[13px] font-black leading-tight text-[#20211f]">
                    {day.dayNum}
                  </span>
                  <div className="mt-1 flex h-3 items-center">
                    {day.count > 0 ? (
                      <span className="rounded-full bg-[#e66b3c] px-1 font-mono text-[7px] font-bold text-white">
                        {day.count}
                      </span>
                    ) : day.isToday ? (
                      <span className="h-1 w-1 rounded-full bg-[#20211f]" />
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {/* Expandable Month Grid */}
            {showMonthGrid && (
              <div className="mt-3 border-t-2 border-[#20211f] pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider text-[#20211f]">
                    {monthDays.monthName}
                  </span>
                  <span className="font-mono text-[8px] text-[#777d74]">
                    Click any day to browse tasks
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center font-mono text-[8px] font-black text-[#697067]">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d} className="py-0.5">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {Array.from({ length: monthDays.firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2" />
                  ))}
                  {monthDays.days.map((day) => (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.iso)
                        setShowMonthGrid(false)
                      }}
                      className={`flex flex-col items-center justify-center border border-[#20211f] p-1.5 transition ${
                        day.isSelected
                          ? 'bg-[#ffca3a] font-black shadow-[2px_2px_0_#20211f]'
                          : day.isToday
                          ? 'bg-[#dfe5da] font-bold'
                          : 'bg-white hover:bg-[#fff9dd]'
                      }`}
                    >
                      <span className="text-[10px]">{day.dayNum}</span>
                      {day.count > 0 && (
                        <span className="mt-0.5 rounded-full bg-[#e66b3c] px-1 font-mono text-[6px] font-bold text-white">
                          {day.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Focus Queue Header with Filters */}
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#777d74]">
                Focus queue · {relativeBadge}
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">
                {isToday
                  ? 'What matters today'
                  : diffDays > 0
                  ? `Scheduled for ${formattedSelectedDate}`
                  : `Archived for ${formattedSelectedDate}`}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex border-2 border-[#20211f]">
                <button
                  type="button"
                  onClick={() => setFilterMode('day')}
                  className={`px-2.5 py-1 font-mono text-[8px] font-black uppercase transition ${
                    filterMode === 'day' ? 'bg-[#ffca3a] text-[#20211f]' : 'bg-white text-[#777d74]'
                  }`}
                >
                  Day ({dayCompleted}/{filteredTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`border-l border-[#20211f] px-2.5 py-1 font-mono text-[8px] font-black uppercase transition ${
                    filterMode === 'all' ? 'bg-[#ffca3a] text-[#20211f]' : 'bg-white text-[#777d74]'
                  }`}
                >
                  All ({store.tasks.length})
                </button>
              </div>

              <button
                onClick={() => onCapture('Task')}
                className="flex items-center gap-1 border-2 border-[#20211f] bg-white px-2.5 py-1 font-mono text-[8px] font-black uppercase shadow-[2px_2px_0_#20211f] transition hover:bg-[#ffca3a]"
              >
                <Icon name="plus" size={12} /> Modal Add
              </button>
            </div>
          </div>

          {/* Inline Quick Task Scheduler for Selected Date */}
          <form
            onSubmit={handleQuickAdd}
            className="mb-4 grid gap-2 border-2 border-[#20211f] bg-white p-2 shadow-[2px_2px_0_#20211f] sm:grid-cols-[1fr_100px_auto]"
          >
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder={`Add task for ${formattedSelectedDate}...`}
              className="border border-[#20211f] px-3 py-1.5 text-[11px] outline-none focus:bg-[#fff9dd]"
            />
            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as 'Normal' | 'High')}
              className="border border-[#20211f] bg-white px-2 py-1.5 font-mono text-[9px] font-bold text-[#20211f] outline-none"
            >
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="border-2 border-[#20211f] bg-[#e66b3c] px-3 py-1.5 font-mono text-[9px] font-black uppercase text-white shadow-[1px_1px_0_#20211f] transition hover:bg-[#ff7b4d] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
            >
              + Add
            </button>
          </form>

          {/* Task List */}
          <div className="border-t-2 border-[#20211f]">
            {filteredTasks.length === 0 ? (
              <div className="border-b border-[#20211f] py-8 text-center">
                <p className="font-mono text-[10px] text-[#737970]">
                  No tasks scheduled for {formattedSelectedDate}.
                </p>
                <p className="mt-1 text-[11px] text-[#858a82]">
                  Add a focus item or study block above, or schedule one via terminal (`jans task add`).
                </p>
              </div>
            ) : (
              filteredTasks.map((task, index) => (
                <div
                  key={`${task.id || 'task'}-${index}`}
                  onClick={() =>
                    setStore((current) => ({
                      ...current,
                      tasks: current.tasks.map((item) =>
                        item.id === task.id ? { ...item, done: !item.done } : item,
                      ),
                    }))
                  }
                  className="grid w-full cursor-pointer grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-[#20211f] py-3.5 text-left transition hover:bg-[#fffdf7]"
                >
                  <span
                    className={`grid h-6 w-6 place-items-center border-2 border-[#20211f] text-[11px] ${
                      task.done ? 'bg-[#75a38a] text-white' : 'bg-white'
                    }`}
                  >
                    {task.done && '✓'}
                  </span>
                  <div>
                    <strong
                      className={`block text-[12px] leading-tight ${
                        task.done ? 'text-[#81867e] line-through' : 'text-[#20211f]'
                      }`}
                    >
                      {task.title}
                    </strong>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[8px] uppercase text-[#858a82]">
                        #{index + 1}
                      </span>
                      <span
                        className={`border border-[#20211f] px-1 py-0.2 font-mono text-[7px] font-black uppercase ${
                          task.priority === 'High'
                            ? 'bg-[#e66b3c] text-white'
                            : 'bg-[#dfe5da] text-[#20211f]'
                        }`}
                      >
                        {task.priority} Priority
                      </span>
                      {task.date && (
                        <span className="font-mono text-[8px] text-[#697067]">
                          📅 {task.date}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => deleteTask(task.id, e)}
                    className="grid h-7 w-7 place-items-center border border-[#20211f] text-[#8b4c36] transition hover:bg-[#e66b3c] hover:text-white"
                    title="Delete task"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#777d74]">
            Daily check-in
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">How are you arriving?</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(Object.keys(moodDetails) as Mood[]).map((mood) => (
              <button
                key={mood}
                onClick={() => setStore((current) => ({ ...current, mood }))}
                className={`flex items-center gap-3 border-2 border-[#20211f] p-3 text-left ${
                  store.mood === mood ? 'bg-[#ffca3a] shadow-[3px_3px_0_#20211f]' : 'bg-white'
                }`}
              >
                <span
                  className="grid h-8 w-8 place-items-center border-2 border-[#20211f] bg-[#f3efe3] text-sm font-black"
                  style={{ color: moodDetails[mood].color }}
                >
                  {moodDetails[mood].mark}
                </span>
                <span className="text-[10px] font-bold">{mood}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => onCapture('Diary')}
            className="mt-3 w-full border-2 border-[#20211f] bg-[#e66b3c] p-3 font-mono text-[9px] font-black uppercase tracking-[0.1em] text-white shadow-[3px_3px_0_#20211f]"
          >
            Write today’s entry
          </button>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#777d74]">
              Quick access
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">Your working shelf</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ShelfCard
            color="#7f8fbd"
            label="Notes"
            count={store.notes.length}
            title={store.notes[0]?.title || 'Capture a thought'}
            onClick={() => onNavigate('Notes')}
          />
          <ShelfCard
            color="#75a38a"
            label="Diary"
            count={store.diary.length}
            title={store.diary[0]?.title || 'Start today’s entry'}
            onClick={() => onNavigate('Diary')}
          />
          <ShelfCard
            color="#ffca3a"
            label="Commands"
            count={store.commands.length}
            title={store.commands[0]?.name || 'Save a useful command'}
            onClick={() => onNavigate('Commands')}
          />
        </div>
      </section>

      {showTimetableModal && (
        <TimetableModal
          user={currentUser || 'sidd'}
          onClose={() => setShowTimetableModal(false)}
          onSyncComplete={() => {
            fetch(`/api/sync?user=${currentUser || 'sidd'}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data?.state) {
                  setStore((current) => ({
                    ...current,
                    ...data.state,
                    profiles: normalizeProfiles({
                      ...current.profiles,
                      ...(data.state.profiles || {}),
                    }),
                  }))
                }
              })
              .catch(() => {})
          }}
        />
      )}
    </>
  )
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[72px] border-2 border-[#20211f] bg-white px-3 py-2 text-center shadow-[2px_2px_0_#20211f]">
      <strong className="block font-mono text-sm">{value}</strong>
      <small className="block font-mono text-[7px] uppercase tracking-[0.12em] text-[#767c74]">
        {label}
      </small>
    </div>
  )
}

function ShelfCard({
  color,
  label,
  count,
  title,
  onClick,
}: {
  color: string
  label: string
  count: number
  title: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-[132px] flex-col justify-between border-2 border-[#20211f] bg-white p-4 text-left transition hover:-translate-y-1 hover:shadow-[4px_4px_0_#20211f]"
    >
      <div className="flex items-center justify-between">
        <span className="h-3 w-3 border border-[#20211f]" style={{ background: color }} />
        <span className="font-mono text-[9px] font-bold">{String(count).padStart(2, '0')}</span>
      </div>
      <div>
        <small className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#777d74]">
          {label}
        </small>
        <div className="mt-1 flex items-end justify-between gap-3">
          <strong className="text-[13px] leading-4">{title}</strong>
          <Icon name="arrow" size={14} />
        </div>
      </div>
    </button>
  )
}

function DiaryView({
  entries,
  onCapture,
  onDelete,
}: {
  entries: DiaryEntry[]
  onCapture: () => void
  onDelete: (id: string) => void
}) {
  return (
    <>
      <PageHeading
        index="02"
        title="Diary"
        description="A private record of what happened, how it felt, and what you want to carry forward."
        action={<AddButton label="New entry" onClick={onCapture} />}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map((entry, index) => (
          <article
            key={entry.id}
            className={`border-2 border-[#20211f] p-5 ${index === 0 ? 'bg-[#ffca3a]' : 'bg-white'} shadow-[4px_4px_0_#20211f]`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-7 w-7 place-items-center border-2 border-[#20211f] bg-[#f3efe3] font-black"
                  style={{ color: moodDetails[entry.mood].color }}
                >
                  {moodDetails[entry.mood].mark}
                </span>
                <span className="font-mono text-[8px] font-bold uppercase">{entry.mood}</span>
              </div>
              <button
                onClick={() => onDelete(entry.id)}
                className="p-1 text-[#71776f] hover:text-[#e66b3c]"
                aria-label={`Delete ${entry.title}`}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
            <h2 className="mt-8 text-[23px] font-black leading-none tracking-[-0.04em]">
              {entry.title}
            </h2>
            <p className="mt-4 text-[11px] leading-5 text-[#545a53]">{entry.body}</p>
            <div className="mt-8 border-t border-[#20211f] pt-3 font-mono text-[8px] uppercase tracking-[0.12em]">
              {new Intl.DateTimeFormat('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }).format(new Date(entry.createdAt))}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function NotesView({
  notes,
  onCapture,
  onDelete,
  onPin,
}: {
  notes: Note[]
  onCapture: () => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
}) {
  const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned))
  return (
    <>
      <PageHeading
        index="03"
        title="Notes"
        description="Loose thoughts, useful references, and ideas that deserve somewhere to land."
        action={<AddButton label="New note" onClick={onCapture} />}
      />
      <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
        {sorted.map((note, index) => (
          <article
            key={note.id}
            className={`mb-4 break-inside-avoid border-2 border-[#20211f] p-5 ${index % 4 === 1 ? 'bg-[#dfe5da]' : 'bg-white'} shadow-[3px_3px_0_#20211f]`}
          >
            <div className="flex items-center justify-between">
              <span className="border border-[#20211f] bg-[#f3efe3] px-2 py-1 font-mono text-[8px] font-black uppercase">
                {note.label}
              </span>
              <div className="flex">
                <button
                  onClick={() => onPin(note.id)}
                  className={`p-1.5 ${note.pinned ? 'text-[#e66b3c]' : 'text-[#777d74]'}`}
                  aria-label="Pin note"
                >
                  <Icon name="pin" size={14} />
                </button>
                <button
                  onClick={() => onDelete(note.id)}
                  className="p-1.5 text-[#777d74] hover:text-[#e66b3c]"
                  aria-label="Delete note"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
            <h2 className="mt-7 text-xl font-black tracking-[-0.04em]">{note.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-[#5d645c]">
              {note.body}
            </p>
            <p className="mt-7 font-mono text-[8px] uppercase text-[#858a82]">
              {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
                new Date(note.createdAt),
              )}
            </p>
          </article>
        ))}
      </div>
    </>
  )
}

function CommandsView({
  commands,
  filter,
  setFilter,
  copied,
  onCopy,
  onCapture,
  onDelete,
  onFavorite,
}: {
  commands: SavedCommand[]
  filter: string
  setFilter: (filter: string) => void
  copied: string | null
  onCopy: (command: SavedCommand) => void
  onCapture: () => void
  onDelete: (id: string) => void
  onFavorite: (id: string) => void
}) {
  const labels = ['All', ...Array.from(new Set(commands.map((command) => command.label)))]
  const filtered =
    filter === 'All' ? commands : commands.filter((command) => command.label === filter)

  return (
    <>
      <PageHeading
        index="04"
        title="Command library"
        description="Label, explain, and retrieve the commands you never want to search for twice."
        action={<AddButton label="Save command" onClick={onCapture} />}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {labels.map((label) => (
          <button
            key={label}
            onClick={() => setFilter(label)}
            className={`border-2 border-[#20211f] px-3 py-2 font-mono text-[8px] font-black uppercase ${
              filter === label ? 'bg-[#ffca3a] shadow-[2px_2px_0_#20211f]' : 'bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {filtered.map((command) => (
          <article
            key={command.id}
            className="grid border-2 border-[#20211f] bg-white shadow-[4px_4px_0_#20211f] md:grid-cols-[180px_1fr_auto]"
          >
            <div className="border-b-2 border-[#20211f] bg-[#dfe5da] p-4 md:border-b-0 md:border-r-2">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#657065]">
                  {command.label}
                </span>
                <button
                  onClick={() => onFavorite(command.id)}
                  className={command.favorite ? 'text-[#e66b3c]' : 'text-[#9ba098]'}
                  aria-label="Toggle favorite"
                >
                  <Icon name="spark" size={13} />
                </button>
              </div>
              <h2 className="mt-5 text-[14px] font-black leading-4">{command.name}</h2>
              <p className="mt-2 text-[9px] leading-4 text-[#687067]">{command.description}</p>
            </div>
            <div className="min-w-0 p-4 md:p-5">
              <code className="block overflow-x-auto whitespace-nowrap border border-[#20211f] bg-[#20211f] px-4 py-3 font-mono text-[10px] text-[#f3efe3]">
                <span className="mr-2 text-[#ffca3a]">$</span>
                {command.command}
              </code>
            </div>
            <div className="flex items-center gap-1 border-t-2 border-[#20211f] p-3 md:border-l-2 md:border-t-0">
              <button
                onClick={() => onCopy(command)}
                className="flex h-10 min-w-20 items-center justify-center gap-2 border-2 border-[#20211f] bg-[#ffca3a] px-3 font-mono text-[8px] font-black uppercase"
              >
                <Icon name="copy" size={13} /> {copied === command.id ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => onDelete(command.id)}
                className="grid h-10 w-10 place-items-center border-2 border-[#20211f] bg-white hover:bg-[#e66b3c] hover:text-white"
                aria-label={`Delete ${command.name}`}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function extractYouTubeId(url: string) {
  try {
    const raw = url.trim()
    if (!raw) return ''
    const normalized =
      raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
    const parsed = new URL(normalized)
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1).split('/')[0]
    if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2]
    return parsed.searchParams.get('v') || ''
  } catch {
    return ''
  }
}

function YouTubeView({
  store,
  setStore,
}: {
  store: Store
  setStore: React.Dispatch<React.SetStateAction<Store>>
}) {
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [label, setLabel] = useState('')
  const [fetchingMeta, setFetchingMeta] = useState(false)

  const queued = store.videos.filter((video) => video.status === 'queue')
  const watched = store.videos.filter((video) => video.status === 'watched')

  async function handleUrlChange(newUrl: string) {
    setUrl(newUrl)
    const videoId = extractYouTubeId(newUrl)
    if (videoId && !title) {
      setFetchingMeta(true)
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(newUrl.trim())}&format=json`,
        )
        if (response.ok) {
          const data = await response.json()
          if (data.title) setTitle(data.title)
          if (!label && data.author_name) setLabel(data.author_name)
        }
      } catch {
        // Graceful fallback to manual entry
      } finally {
        setFetchingMeta(false)
      }
    }
  }

  function addVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const videoId = extractYouTubeId(url)
    if (!videoId) return
    const finalTitle = title.trim() || 'Untitled YouTube video'
    const finalLabel = label.trim() || 'Learning'
    setStore((current) => ({
      ...current,
      videos: [
        {
          id: `video-${Date.now()}`,
          title: finalTitle,
          url,
          videoId,
          label: finalLabel,
          status: 'queue',
          createdAt: new Date().toISOString(),
        },
        ...current.videos,
      ],
    }))
    setUrl('')
    setTitle('')
    setLabel('')
    setShowForm(false)
  }

  function toggleVideo(id: string) {
    setStore((current) => {
      const target = current.videos.find((video) => video.id === id)
      const nextStatus = target?.status === 'queue' ? 'watched' : 'queue'
      const xpBonus = nextStatus === 'watched' ? 35 : 0
      return {
        ...current,
        knowledgeXp: (current.knowledgeXp || 0) + xpBonus,
        videos: current.videos.map((video) =>
          video.id === id ? { ...video, status: nextStatus } : video,
        ),
      }
    })
  }

  return (
    <>
      <PageHeading
        index="05"
        title="YouTube queue"
        description="Save useful videos without letting them disappear into an endless watch-later list."
        action={<AddButton label="Add video" onClick={() => setShowForm(!showForm)} />}
      />

      {showForm && (
        <form
          onSubmit={addVideo}
          className="mb-7 grid gap-3 border-2 border-[#20211f] bg-[#ffca3a] p-4 shadow-[4px_4px_0_#20211f] md:grid-cols-[1.4fr_1fr_160px_auto]"
        >
          <input
            name="url"
            required
            value={url}
            onChange={(event) => handleUrlChange(event.target.value)}
            placeholder={fetchingMeta ? 'Fetching video info...' : 'Paste YouTube URL'}
            className="h-11 border-2 border-[#20211f] bg-white px-3 text-[11px] outline-none"
          />
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={fetchingMeta ? 'Auto-fetching title...' : 'Video title'}
            className="h-11 border-2 border-[#20211f] bg-white px-3 text-[11px] outline-none"
          />
          <input
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Label / Channel"
            className="h-11 border-2 border-[#20211f] bg-white px-3 text-[11px] outline-none"
          />
          <button className="h-11 border-2 border-[#20211f] bg-[#20211f] px-5 font-mono text-[8px] font-black uppercase text-white">
            Add to queue
          </button>
        </form>
      )}

      <div className="mb-5 flex items-center justify-between border-b-2 border-[#20211f] pb-3">
        <h2 className="text-lg font-black tracking-[-0.04em]">Up next</h2>
        <span className="font-mono text-[8px] font-black uppercase">{queued.length} waiting</span>
      </div>
      {queued.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {queued.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onToggle={() => toggleVideo(video.id)}
              onDelete={() =>
                setStore((current) => ({
                  ...current,
                  videos: current.videos.filter((item) => item.id !== video.id),
                }))
              }
            />
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-[#20211f] p-10 text-center text-[11px] text-[#687067]">
          Your queue is clear. Add only what you genuinely intend to watch.
        </div>
      )}

      <div className="mb-4 mt-10 flex items-center justify-between border-b-2 border-[#20211f] pb-3">
        <h2 className="text-lg font-black tracking-[-0.04em]">Watched</h2>
        <span className="font-mono text-[8px] font-black uppercase">
          {watched.length} completed
        </span>
      </div>
      <div className="grid gap-2">
        {watched.map((video) => (
          <button
            key={video.id}
            onClick={() => toggleVideo(video.id)}
            className="flex items-center gap-4 border-2 border-[#20211f] bg-[#dfe5da] p-3 text-left"
          >
            <span className="grid h-8 w-8 place-items-center border-2 border-[#20211f] bg-[#75a38a] text-[11px] font-black">
              ✓
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[11px]">{video.title}</strong>
              <small className="font-mono text-[8px] uppercase text-[#687067]">{video.label}</small>
            </span>
            <span className="font-mono text-[8px] uppercase">Move to queue</span>
          </button>
        ))}
      </div>
    </>
  )
}

function VideoCard({
  video,
  onToggle,
  onDelete,
}: {
  video: Video
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <article className="overflow-hidden border-2 border-[#20211f] bg-white shadow-[4px_4px_0_#20211f]">
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-video border-b-2 border-[#20211f] bg-[#20211f]"
      >
        <img
          src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-14 place-items-center border-2 border-[#20211f] bg-[#e66b3c] text-white shadow-[3px_3px_0_#20211f]">
            <Icon name="play" size={19} />
          </span>
        </span>
      </a>
      <div className="p-4">
        <span className="font-mono text-[8px] font-black uppercase text-[#e66b3c]">
          {video.label}
        </span>
        <h3 className="mt-2 min-h-10 text-[14px] font-black leading-5">{video.title}</h3>
        <div className="mt-5 flex gap-2 border-t border-[#20211f] pt-3">
          <button
            onClick={onToggle}
            className="flex-1 border-2 border-[#20211f] bg-[#ffca3a] py-2 font-mono text-[8px] font-black uppercase"
          >
            Mark watched
          </button>
          <button
            onClick={onDelete}
            className="grid w-9 place-items-center border-2 border-[#20211f] bg-white"
            aria-label={`Delete ${video.title}`}
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}

function ProfilesView({
  store,
  setStore,
}: {
  store: Store
  setStore: React.Dispatch<React.SetStateAction<Store>>
}) {
  const [data, setData] = useState<Record<string, ProfileData | null>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function loadProfile(platform: keyof CompetitiveProfiles, username?: string) {
    const raw = username ?? store.profiles?.[platform]
    const handle = (typeof raw === 'string' ? raw : '').trim()
    if (!handle) return
    setLoading(platform)
    setErrors((current) => ({ ...current, [platform]: '' }))
    try {
      const response = await fetch(
        `/api/profiles?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(handle)}`,
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setData((current) => ({ ...current, [platform]: result }))
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [platform]: error instanceof Error ? error.message : 'Profile unavailable.',
      }))
    } finally {
      setLoading(null)
    }
  }

  useEffect(() => {
    if (typeof store.profiles?.github === 'string' && store.profiles.github) loadProfile('github')
    if (typeof store.profiles?.leetcode === 'string' && store.profiles.leetcode) loadProfile('leetcode')
    if (typeof store.profiles?.codeforces === 'string' && store.profiles.codeforces) loadProfile('codeforces')
    if (typeof store.profiles?.codechef === 'string' && store.profiles.codechef) loadProfile('codechef')
    // The saved handles are the trigger for initial sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function saveHandle(platform: keyof CompetitiveProfiles, username: string) {
    const cleanUsername = typeof username === 'string' ? username.trim() : ''
    setStore((current) => ({
      ...current,
      profiles: { ...current.profiles, [platform]: cleanUsername },
    }))
    loadProfile(platform, cleanUsername)
  }

  const github = data.github
  const contributions = github?.contributions || []
  const heatmap = contributions.length
    ? contributions
    : Array.from({ length: 364 }, (_, index) => ({
        date: '',
        count: 0,
        level: index % 31 === 0 ? 1 : 0,
      }))

  return (
    <>
      <PageHeading
        index="06"
        title="Proof of work"
        description="Your public coding footprint in one calm view: contribution rhythm, repositories, solved problems, and competitive identities."
      />

      <section className="border-2 border-[#20211f] bg-white shadow-[5px_5px_0_#20211f]">
        <div className="grid border-b-2 border-[#20211f] bg-[#dfe5da] lg:grid-cols-[1fr_auto]">
          <div className="p-5">
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em]">
              GitHub / primary proof
            </span>
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <ProfileInput
                platform="github"
                value={store.profiles.github}
                loading={loading === 'github'}
                onSave={(value) => saveHandle('github', value)}
              />
              {github?.profileUrl && (
                <a
                  href={github.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border-2 border-[#20211f] bg-white px-3 py-3 font-mono text-[8px] font-black uppercase"
                >
                  Open GitHub
                </a>
              )}
            </div>
            {errors.github && (
              <p className="mt-2 text-[9px] font-bold text-[#b34e2d]">{errors.github}</p>
            )}
          </div>
          <div className="grid grid-cols-3 border-t-2 border-[#20211f] lg:border-l-2 lg:border-t-0">
            <ProfileStat label="Repos" value={github?.publicRepos ?? '—'} />
            <ProfileStat label="Followers" value={github?.followers ?? '—'} />
            <ProfileStat label="Contributions" value={github?.totalContributions ?? '—'} />
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-black tracking-[-0.04em]">
                {github?.name || store.profiles.github || 'Connect GitHub'}
              </h2>
              <p className="mt-1 text-[9px] text-[#687067]">
                {github?.bio || 'A year of public contribution activity.'}
              </p>
            </div>
            <div className="flex items-center gap-1 font-mono text-[7px] uppercase text-[#777d74]">
              Less{' '}
              {[0, 1, 2, 3, 4].map((level) => (
                <i
                  key={level}
                  className={`h-3 w-3 border border-[#20211f]/30 ${heatColor(level)}`}
                />
              ))}{' '}
              More
            </div>
          </div>
          <div className="overflow-x-auto pb-2">
            <div
              className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
              aria-label="GitHub contribution heatmap"
            >
              {heatmap.map((day, index) => (
                <span
                  key={`${day.date}-${index}`}
                  title={
                    day.date ? `${day.date}: ${day.count} contributions` : 'No contribution data'
                  }
                  className={`h-[11px] w-[11px] border border-[#20211f]/20 ${heatColor(day.level)}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <PlatformCard
          name="LeetCode"
          accent="#ffca3a"
          platform="leetcode"
          value={store.profiles.leetcode}
          data={data.leetcode}
          loading={loading === 'leetcode'}
          error={errors.leetcode}
          onSave={(value) => saveHandle('leetcode', value)}
        />
        <PlatformCard
          name="Codeforces"
          accent="#7f8fbd"
          platform="codeforces"
          value={store.profiles.codeforces}
          data={data.codeforces}
          loading={loading === 'codeforces'}
          error={errors.codeforces}
          onSave={(value) => saveHandle('codeforces', value)}
        />
        <PlatformCard
          name="CodeChef"
          accent="#9b806d"
          platform="codechef"
          value={store.profiles.codechef}
          data={data.codechef}
          loading={loading === 'codechef'}
          error={errors.codechef || ''}
          onSave={(value) => saveHandle('codechef', value)}
        />
      </div>

      {github?.repos?.length ? (
        <section className="mt-9">
          <div className="mb-3 flex items-center justify-between border-b-2 border-[#20211f] pb-3">
            <h2 className="text-lg font-black tracking-[-0.04em]">Recently active repositories</h2>
            <span className="font-mono text-[8px] font-black uppercase">
              {github.repos.length} shown
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {github.repos.map((repo) => (
              <a
                key={repo.id}
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="border-2 border-[#20211f] bg-white p-4 hover:shadow-[3px_3px_0_#20211f]"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-[12px]">{repo.name}</strong>
                  <span className="font-mono text-[8px]">★ {repo.stars}</span>
                </div>
                <p className="mt-2 min-h-8 text-[9px] leading-4 text-[#687067]">
                  {repo.description || 'No description provided.'}
                </p>
                <span className="mt-3 block font-mono text-[8px] font-bold uppercase text-[#e66b3c]">
                  {repo.language}
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

function heatColor(level: number) {
  return (
    ['bg-[#ece9df]', 'bg-[#cad8c6]', 'bg-[#91b092]', 'bg-[#4f7c62]', 'bg-[#20211f]'][level] ||
    'bg-[#ece9df]'
  )
}

function ProfileStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[94px] border-r border-[#20211f] p-4 text-center last:border-r-0">
      <strong className="block font-mono text-xl">{value}</strong>
      <small className="font-mono text-[7px] font-bold uppercase text-[#71776f]">{label}</small>
    </div>
  )
}

function ProfileInput({
  platform,
  value,
  loading,
  onSave,
}: {
  platform: string
  value?: any
  loading: boolean
  onSave: (value: string) => void
}) {
  const safeInitial = typeof value === 'string' ? value : ''
  const [draft, setDraft] = useState(safeInitial)

  useEffect(() => {
    setDraft(typeof value === 'string' ? value : '')
  }, [value])

  const safeDraft = typeof draft === 'string' ? draft : ''
  const hasValidDraft = safeDraft.trim().length > 0

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (hasValidDraft) {
          onSave(safeDraft.trim())
        }
      }}
      className="flex"
    >
      <input
        value={safeDraft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label={`${platform} username`}
        placeholder={`${platform} username`}
        className="h-11 min-w-0 border-2 border-r-0 border-[#20211f] bg-white px-3 text-[11px] outline-none"
      />
      <button
        disabled={loading || !hasValidDraft}
        className="h-11 border-2 border-[#20211f] bg-[#20211f] px-4 font-mono text-[8px] font-black uppercase text-white disabled:opacity-50"
      >
        {loading ? 'Syncing' : 'Connect'}
      </button>
    </form>
  )
}

function PlatformCard({
  name,
  accent,
  platform,
  value,
  data,
  loading,
  error,
  onSave,
}: {
  name: string
  accent: string
  platform: keyof CompetitiveProfiles
  value?: any
  data?: ProfileData | null
  loading: boolean
  error: string
  onSave: (value: string) => void
}) {
  const safeVal = typeof value === 'string' ? value : ''
  return (
    <article className="border-2 border-[#20211f] bg-white shadow-[3px_3px_0_#20211f]">
      <div
        className="flex items-center justify-between border-b-2 border-[#20211f] p-4"
        style={{ background: accent }}
      >
        <strong className="text-[13px]">{name}</strong>
        <span className="font-mono text-[8px] font-black uppercase">
          {data ? 'Verified' : safeVal ? 'Saved' : 'Not linked'}
        </span>
      </div>
      <div className="p-4">
        <ProfileInput platform={platform} value={safeVal} loading={loading} onSave={onSave} />
        {error && <p className="mt-2 text-[9px] font-bold text-[#b34e2d]">{error}</p>}
        {data ? (
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#20211f] pt-4">
            {platform === 'leetcode' ? (
              <>
                <ProfileMiniStat label="Solved" value={data.totalSolved || 0} />
                <ProfileMiniStat label="Ranking" value={data.ranking || 0} />
                <ProfileMiniStat label="Medium" value={data.medium || 0} />
                <ProfileMiniStat label="Hard" value={data.hard || 0} />
              </>
            ) : platform === 'codechef' ? (
              <>
                <ProfileMiniStat label="Rating" value={data.rating || 0} />
                <ProfileMiniStat label="Stars" value={data.rank || '1★'} />
                <ProfileMiniStat
                  label="Global Rank"
                  value={data.ranking ? `#${data.ranking}` : '—'}
                />
                <div className="flex items-center justify-center p-2">
                  <a
                    href={
                      data.profileUrl ||
                      `https://www.codechef.com/users/${encodeURIComponent(value)}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[8px] font-bold uppercase underline hover:text-[#e66b3c]"
                  >
                    View CodeChef ↗
                  </a>
                </div>
              </>
            ) : (
              <>
                <ProfileMiniStat label="Rating" value={data.rating || 0} />
                <ProfileMiniStat label="Maximum" value={data.maxRating || 0} />
                <div className="col-span-2 font-mono text-[8px] font-black uppercase">
                  {data.rank}
                </div>
              </>
            )}
          </div>
        ) : platform === 'codechef' && value ? (
          <a
            href={`https://www.codechef.com/users/${encodeURIComponent(value)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block border-2 border-[#20211f] bg-[#f3efe3] p-3 text-center font-mono text-[8px] font-black uppercase"
          >
            Open public profile
          </a>
        ) : (
          <p className="mt-4 text-[9px] leading-4 text-[#777d74]">
            Add your public handle to keep this proof beside your daily work.
          </p>
        )}
      </div>
    </article>
  )
}

function ProfileMiniStat({ label, value }: { label: string; value: number | string }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value
  return (
    <div>
      <strong className="block font-mono text-lg">{displayValue}</strong>
      <small className="font-mono text-[7px] font-bold uppercase text-[#777d74]">{label}</small>
    </div>
  )
}

function TrackersView({
  store,
  setStore,
}: {
  store: Store
  setStore: React.Dispatch<React.SetStateAction<Store>>
}) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const craftsmanXp = store.craftsmanXp ?? 180
  const velocityXp = store.velocityXp ?? 120
  const knowledgeXp = store.knowledgeXp ?? 70

  function getTier(xp: number) {
    if (xp >= 1500) return 'Grandmaster'
    if (xp >= 800) return 'Specialist'
    if (xp >= 400) return 'Practitioner'
    if (xp >= 150) return 'Apprentice'
    return 'Novice'
  }

  function addXp(track: 'craftsman' | 'velocity', amount: number) {
    setStore((current) => ({
      ...current,
      craftsmanXp: (current.craftsmanXp ?? 180) + (track === 'craftsman' ? amount : 0),
      velocityXp: (current.velocityXp ?? 120) + (track === 'velocity' ? amount : 0),
    }))
  }

  return (
    <>
      <PageHeading
        index="07"
        title="Trackers"
        description="A small set of signals. Enough to notice patterns, never enough to become another chore."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="border-2 border-[#20211f] bg-white shadow-[4px_4px_0_#20211f]">
          <div className="border-b-2 border-[#20211f] bg-[#dfe5da] p-4">
            <h2 className="text-[15px] font-black">Weekly rhythm</h2>
            <p className="mt-1 text-[9px] text-[#6d746c]">Tap a square to mark or clear a day.</p>
          </div>
          <div className="p-4 md:p-6">
            <div className="mb-3 grid grid-cols-[1fr_repeat(7,32px)] gap-2 md:grid-cols-[1fr_repeat(7,38px)]">
              <span />
              {days.map((day, index) => (
                <span
                  key={`${day}-${index}`}
                  className="text-center font-mono text-[8px] font-bold"
                >
                  {day}
                </span>
              ))}
            </div>
            <div className="grid gap-3">
              {store.habits.map((habit) => (
                <div
                  key={habit.id}
                  className="grid grid-cols-[1fr_repeat(7,32px)] items-center gap-2 md:grid-cols-[1fr_repeat(7,38px)]"
                >
                  <span className="truncate text-[10px] font-bold">{habit.name}</span>
                  {habit.days.map((done, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        setStore((current) => ({
                          ...current,
                          habits: current.habits.map((item) =>
                            item.id === habit.id
                              ? {
                                  ...item,
                                  days: item.days.map((value, dayIndex) =>
                                    dayIndex === index ? !value : value,
                                  ),
                                }
                              : item,
                          ),
                        }))
                      }
                      className="h-8 border-2 border-[#20211f] md:h-9"
                      style={{ background: done ? habit.color : '#f3efe3' }}
                      aria-label={`${habit.name}, ${days[index]}: ${done ? 'done' : 'not done'}`}
                    >
                      {done && <span className="text-[10px] font-black">✓</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-2 border-[#20211f] bg-[#ffca3a] p-5 shadow-[4px_4px_0_#20211f]">
          <span className="font-mono text-[8px] font-black uppercase tracking-[0.14em]">
            This week
          </span>
          <strong className="mt-5 block text-6xl font-black tracking-[-0.07em]">
            {store.habits.reduce((total, habit) => total + habit.days.filter(Boolean).length, 0)}
          </strong>
          <p className="text-[10px] font-bold">check-ins completed</p>
          <div className="mt-8 border-t-2 border-[#20211f] pt-4">
            <p className="text-[10px] leading-5">
              Consistency is strongest in reading. Your weekend is intentionally lighter.
            </p>
          </div>
        </section>
      </div>

      {/* Authorship Spectrum Card */}
      <div className="mt-8 border-2 border-[#20211f] bg-white shadow-[4px_4px_0_#20211f]">
        <div className="border-b-2 border-[#20211f] bg-[#dfe5da] p-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-black">Authorship spectrum</h2>
            <p className="mt-1 text-[9px] text-[#6d746c]">
              Separating genuine handcrafted engineering from AI-assisted shipping.
            </p>
          </div>
          <span className="font-mono text-[8px] font-black uppercase border border-[#20211f] bg-white px-2 py-0.5">
            Skill Radar
          </span>
        </div>

        <div className="p-4 md:p-6 grid gap-5 md:grid-cols-3">
          {/* Craftsman Track */}
          <div className="border-2 border-[#20211f] bg-[#f3efe3] p-4 shadow-[2px_2px_0_#20211f] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#20211f]">
                  01 · Craftsman XP
                </span>
                <span className="font-mono text-[7px] font-bold bg-[#75a38a] text-white px-1.5 py-0.5 border border-[#20211f]">
                  Handcrafted
                </span>
              </div>
              <strong className="block text-2xl font-black text-[#20211f]">
                {craftsmanXp} <span className="text-xs font-normal font-mono text-[#6d746c]">XP</span>
              </strong>
              <p className="mt-1 text-[9px] text-[#6d746c] leading-4">
                College OS labs, algorithms, manual C/C++ memory, pointer logic, and scratch code.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#20211f]/20">
              <div className="h-2 border border-[#20211f] bg-white mb-2">
                <div
                  className="h-full bg-[#75a38a]"
                  style={{ width: `${Math.min(100, (craftsmanXp % 300) / 3)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] text-[#6d746c]">
                  Tier: <strong className="text-[#20211f]">{getTier(craftsmanXp)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => addXp('craftsman', 30)}
                  className="border border-[#20211f] bg-white px-2 py-1 font-mono text-[8px] font-bold hover:bg-[#dfe5da]"
                >
                  +30 XP Log Lab
                </button>
              </div>
            </div>
          </div>

          {/* Velocity Track */}
          <div className="border-2 border-[#20211f] bg-[#f3efe3] p-4 shadow-[2px_2px_0_#20211f] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#20211f]">
                  02 · Velocity XP
                </span>
                <span className="font-mono text-[7px] font-bold bg-[#7f8fbd] text-white px-1.5 py-0.5 border border-[#20211f]">
                  AI-Assisted
                </span>
              </div>
              <strong className="block text-2xl font-black text-[#20211f]">
                {velocityXp} <span className="text-xs font-normal font-mono text-[#6d746c]">XP</span>
              </strong>
              <p className="mt-1 text-[9px] text-[#6d746c] leading-4">
                Rapid hackathon MVPs, prompt-orchestrated pipelines, and high-velocity shipping.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#20211f]/20">
              <div className="h-2 border border-[#20211f] bg-white mb-2">
                <div
                  className="h-full bg-[#7f8fbd]"
                  style={{ width: `${Math.min(100, (velocityXp % 300) / 3)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] text-[#6d746c]">
                  Tier: <strong className="text-[#20211f]">{getTier(velocityXp)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => addXp('velocity', 30)}
                  className="border border-[#20211f] bg-white px-2 py-1 font-mono text-[8px] font-bold hover:bg-[#dfe5da]"
                >
                  +30 XP Ship
                </button>
              </div>
            </div>
          </div>

          {/* Knowledge Track */}
          <div className="border-2 border-[#20211f] bg-[#f3efe3] p-4 shadow-[2px_2px_0_#20211f] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#20211f]">
                  03 · Knowledge XP
                </span>
                <span className="font-mono text-[7px] font-bold bg-[#ffca3a] text-[#20211f] px-1.5 py-0.5 border border-[#20211f]">
                  Lectures & Docs
                </span>
              </div>
              <strong className="block text-2xl font-black text-[#20211f]">
                {knowledgeXp} <span className="text-xs font-normal font-mono text-[#6d746c]">XP</span>
              </strong>
              <p className="mt-1 text-[9px] text-[#6d746c] leading-4">
                Research papers, architecture deep-dives, and technical YouTube lectures watched.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#20211f]/20">
              <div className="h-2 border border-[#20211f] bg-white mb-2">
                <div
                  className="h-full bg-[#e66b3c]"
                  style={{ width: `${Math.min(100, (knowledgeXp % 300) / 3)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] text-[#6d746c]">
                  Tier: <strong className="text-[#20211f]">{getTier(knowledgeXp)}</strong>
                </span>
                <span className="font-mono text-[8px] text-[#6d746c]">
                  Auto: +35/video
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function cleanForSpeech(text: string): string {
  return text
    .replace(/[*_#`~>]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .trim()
}

function JansView({
  store,
  jansLevel,
  currentUser = 'sidd',
}: {
  store: Store
  jansLevel: number
  currentUser?: 'sidd' | 'jahnavi'
}) {
  const isJahnavi = currentUser === 'jahnavi'
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: isJahnavi
        ? 'Hey Jahnavi! Siddhant built me to be your study partner, organizer, and wingman. How can I help you today?'
        : 'I’m here. Give me the messy version of your day and I’ll help turn it into a realistic plan.',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [selectedVoice, setSelectedVoice] = useState('en-GB-RyanNeural')
  const [jarvisLive, setJarvisLive] = useState(false)
  const [engineState, setEngineState] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'cooldown'>('idle')
  const [micError, setMicError] = useState<string | null>(null)

  // Lifelong Episodic Memory State
  type MemoryItem = {
    id: string
    user_id: string
    category: string
    fact: string
    importance: number
    tags: string
    source: string
    created_at: string
    updated_at: string
  }
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [showMemoryConsole, setShowMemoryConsole] = useState(false)
  const [newFact, setNewFact] = useState('')
  const [newCategory, setNewCategory] = useState('goal')
  const [newImportance, setNewImportance] = useState(4)
  const [savingMemory, setSavingMemory] = useState(false)

  const loadMemories = useCallback(() => {
    fetch(`/api/memories?user=${currentUser}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.memories)) setMemories(d.memories)
      })
      .catch(() => {})
  }, [currentUser])

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  async function handleSaveMemory(e: FormEvent) {
    e.preventDefault()
    if (!newFact.trim() || savingMemory) return
    setSavingMemory(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser,
          category: newCategory,
          fact: newFact.trim(),
          importance: newImportance,
          source: 'manual',
        }),
      })
      const data = await res.json()
      if (data.memory) {
        setMemories((prev) => [data.memory, ...prev.filter((m) => m.id !== data.memory.id)])
        setNewFact('')
      }
    } catch (err) {
      console.error('Failed to save memory', err)
    } finally {
      setSavingMemory(false)
    }
  }

  async function handleDeleteMemory(id: string) {
    try {
      setMemories((prev) => prev.filter((m) => m.id !== id))
      await fetch(`/api/memories?id=${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete memory', err)
      loadMemories()
    }
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<any>(null)
  const accumulatedSpeechRef = useRef<string>('')
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const jarvisLiveRef = useRef(false)
  const engineStateRef = useRef<'idle' | 'listening' | 'thinking' | 'speaking' | 'cooldown'>('idle')

  const isSpeaking = engineState === 'speaking'
  const isListening = engineState === 'listening'
  const isThinking = engineState === 'thinking' || sending

  function setEngine(nextState: 'idle' | 'listening' | 'thinking' | 'speaking' | 'cooldown') {
    engineStateRef.current = nextState
    setEngineState(nextState)
  }

  useEffect(() => {
    jarvisLiveRef.current = jarvisLive
  }, [jarvisLive])

  // Load voice preference on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('jans-voice-enabled')
      if (saved !== null) {
        setVoiceEnabled(saved === 'true')
      }
      const savedVoice = window.localStorage.getItem('jans-neural-voice')
      if (savedVoice) {
        setSelectedVoice(savedVoice)
      } else if (currentUser === 'jahnavi') {
        setSelectedVoice('en-GB-SoniaNeural')
      }
    } catch {}
    return () => {
      stopSpeakingInternal()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }
  }, [currentUser])

  function stopSpeakingInternal() {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
        currentAudioRef.current.src = ''
      } catch {}
      currentAudioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
    activeUtteranceRef.current = null
  }

  function stopSpeaking() {
    stopSpeakingInternal()
    if (engineStateRef.current === 'speaking') {
      setEngine('idle')
    }
  }

  function stopListening() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {}
      recognitionRef.current = null
    }
    if (engineStateRef.current === 'listening') {
      setEngine('idle')
    }
  }

  async function speakText(text: string, onComplete?: () => void) {
    // 1. HARD LOCK: Always terminate listening before playing audio
    stopListening()
    stopSpeakingInternal()

    const clean = cleanForSpeech(text)
    if (!clean) {
      setEngine('idle')
      if (onComplete) onComplete()
      return
    }

    setEngine('speaking')

    try {
      // 1. Primary: Studio-Quality 24kHz Neural Audio via /api/tts
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voice: selectedVoice }),
      })

      if (!response.ok) throw new Error('Neural TTS API failed')

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio

      const cleanup = () => {
        URL.revokeObjectURL(audioUrl)
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null
        }
      }

      audio.onended = () => {
        cleanup()
        setEngine('cooldown')
        if (onComplete) onComplete()
      }

      audio.onerror = () => {
        cleanup()
        setEngine('idle')
        if (onComplete) onComplete()
      }

      await audio.play()
    } catch (err) {
      console.warn('Neural audio fallback to browser synthesis:', err)
      // 2. Resilient Fallback to browser SpeechSynthesis
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(clean)
        activeUtteranceRef.current = utterance
        const voices = window.speechSynthesis.getVoices()
        const jarvisVoice =
          voices.find(
            (v) =>
              v.lang.startsWith('en-GB') ||
              v.name.toLowerCase().includes('daniel') ||
              v.name.toLowerCase().includes('british') ||
              v.name.toLowerCase().includes('oliver') ||
              v.name.toLowerCase().includes('arthur'),
          ) || voices.find((v) => v.lang.startsWith('en'))
        if (jarvisVoice) utterance.voice = jarvisVoice
        utterance.rate = 1.0
        utterance.pitch = 1.0

        utterance.onend = () => {
          activeUtteranceRef.current = null
          setEngine('cooldown')
          if (onComplete) onComplete()
        }
        utterance.onerror = () => {
          activeUtteranceRef.current = null
          setEngine('idle')
          if (onComplete) onComplete()
        }
        window.speechSynthesis.speak(utterance)
      } else {
        setEngine('idle')
        if (onComplete) onComplete()
      }
    }
  }

  async function startListening() {
    if (typeof window === 'undefined') return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMicError(
        'Voice input is not supported in this browser. Please use Chrome, Safari, or Edge.',
      )
      return
    }

    // Guard: Never start microphone while speaking or computing
    if (engineStateRef.current === 'speaking' || engineStateRef.current === 'thinking') {
      return
    }

    stopSpeakingInternal()
    setMicError(null)

    // Immediate 0ms UI feedback
    setEngine('listening')

    // Clean up any lingering recognition session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {}
      recognitionRef.current = null
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setEngine('listening')
      }

      recognition.onresult = (event: any) => {
        if (engineStateRef.current !== 'listening') return

        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          interim += event.results[i][0].transcript
        }

        if (interim) {
          accumulatedSpeechRef.current = interim
          setInput(interim)

          // Auto-submit after natural pause in live duplex mode
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          if (jarvisLiveRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              const spoken = accumulatedSpeechRef.current.trim()
              if (spoken.length > 0 && engineStateRef.current === 'listening') {
                accumulatedSpeechRef.current = ''
                submitQuery(spoken)
              }
            }, 1300)
          }
        }
      }

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event?.error)
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
          setMicError(
            'Microphone access blocked. Please tap the lock icon in your browser address bar to allow mic access.',
          )
          setJarvisLive(false)
          jarvisLiveRef.current = false
          stopListening()
        } else if (event?.error === 'audio-capture') {
          setMicError('Microphone in use by another application or disconnected.')
          stopListening()
        }
      }

      recognition.onend = () => {
        // In continuous Jarvis Live mode, auto-resume listening if still in listening state
        if (jarvisLiveRef.current && engineStateRef.current === 'listening') {
          setTimeout(() => {
            if (jarvisLiveRef.current && engineStateRef.current === 'listening') {
              try {
                recognition.start()
              } catch {}
            }
          }, 200)
        } else if (engineStateRef.current === 'listening' && !jarvisLiveRef.current) {
          setEngine('idle')
        }
      }

      recognition.start()
    } catch (err: any) {
      console.warn('Speech recognition init error:', err)
      setEngine('idle')
    }
  }

  function interruptAndListen() {
    stopSpeakingInternal()
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    accumulatedSpeechRef.current = ''
    setInput('')
    startListening()
  }

  async function toggleJarvisLive() {
    if (jarvisLive) {
      setJarvisLive(false)
      jarvisLiveRef.current = false
      stopListening()
      stopSpeakingInternal()
      setEngine('idle')
    } else {
      setJarvisLive(true)
      jarvisLiveRef.current = true
      setVoiceEnabled(true)
      startListening()
    }
  }

  function toggleManualMic() {
    if (engineStateRef.current === 'speaking') {
      interruptAndListen()
    } else if (engineStateRef.current === 'listening') {
      stopListening()
    } else if (engineStateRef.current === 'thinking') {
      // Backend is computing, wait
    } else {
      // Instant 1-click activation
      startListening()
    }
  }

  function testVoicePlayback() {
    const sample = isJahnavi
      ? 'Hey Jahnavi! All systems nominal. How can I help you today?'
      : 'Jarvis online, Siddhant. Engineering and study telemetry active.'
    speakText(sample)
  }

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: isJahnavi
          ? 'Hey Jahnavi! Siddhant built me to be your study partner, organizer, and wingman. How can I help you today?'
          : 'I’m here. Give me the messy version of your day and I’ll help turn it into a realistic plan.',
      },
    ])
  }, [currentUser, isJahnavi])

  useEffect(() => {
    function check() {
      fetch('/api/jans')
        .then((response) => response.json())
        .then((data) => setOnline(Boolean(data.online)))
        .catch(() => setOnline(false))
    }
    check()
    const timer = setInterval(check, 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function submitQuery(contentToSend: string) {
    if (!contentToSend || engineStateRef.current === 'thinking') return

    // 1. HARD STOP audio input immediately
    stopListening()
    stopSpeakingInternal()
    setEngine('thinking')
    setSending(true)

    const nextMessages: Message[] = [...messages, { role: 'user', content: contentToSend }]
    setMessages(nextMessages)
    setInput('')

    const context = [
      `Mood: ${store.mood}`,
      `Open tasks: ${
        store.tasks
          .filter((task) => !task.done)
          .map((task) => task.title)
          .join(', ') || 'none'
      }`,
      `Habits completed this week: ${store.habits.reduce((total, habit) => total + habit.days.filter(Boolean).length, 0)}`,
      `Recent note: ${store.notes[0]?.title || 'none'}`,
    ].join('\n')

    try {
      const response = await fetch('/api/jans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, context, user: currentUser }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      const reply = data.reply
      setMessages((current) => [...current, { role: 'assistant', content: reply }])
      setOnline(true)
      // Automatically refresh memories consolidated in the background
      setTimeout(loadMemories, 3500)

      // Spoken voice reply
      if (voiceEnabled && reply) {
        speakText(reply, () => {
          // Acoustic decay buffer: wait 350ms so speaker reverb doesn't self-trigger the mic
          if (jarvisLiveRef.current) {
            setTimeout(() => {
              if (jarvisLiveRef.current && engineStateRef.current !== 'thinking') {
                startListening()
              }
            }, 350)
          } else {
            setEngine('idle')
          }
        })
      } else {
        if (jarvisLiveRef.current) {
          setTimeout(() => startListening(), 250)
        } else {
          setEngine('idle')
        }
      }
    } catch {
      setOnline(false)
      const openTasks = store.tasks.filter((task) => !task.done)
      const fallbackReply = openTasks.length
        ? `Jans is offline, so I’m using your local plan. Start with “${openTasks[0].title}”. Give it 25 focused minutes, then decide whether it needs another block.`
        : 'Jans is offline, but your local workspace is available. Your queue is clear—capture one intention for tomorrow and close the day.'
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: fallbackReply,
        },
      ])
      if (voiceEnabled) {
        speakText(fallbackReply, () => {
          if (jarvisLiveRef.current) {
            setTimeout(() => startListening(), 350)
          } else {
            setEngine('idle')
          }
        })
      } else {
        setEngine('idle')
      }
    } finally {
      setSending(false)
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content) return
    await submitQuery(content)
  }

  return (
    <>
      <PageHeading
        index="08"
        title="Jans intelligence"
        description="Your Jarvis-style intelligence console: continuous hands-free voice, research, prioritization, and practical support."
      />

      <div className="grid min-h-[620px] border-2 border-[#20211f] bg-white shadow-[5px_5px_0_#20211f] lg:grid-cols-[290px_1fr]">
        <aside className="border-b-2 border-[#20211f] bg-[#ffca3a] p-5 lg:border-b-0 lg:border-r-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.15em]">
              Jans / Intelligence
            </span>
            <span
              className={`flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase ${
                online ? 'text-[#20211f]' : 'text-[#8b4c36]'
              }`}
            >
              <i className={`h-2.5 w-2.5 border border-[#20211f] ${online ? 'bg-[#75a38a]' : 'bg-[#e66b3c]'}`} />{' '}
              {online === null ? 'Checking' : online ? 'Host Online' : 'Local mode'}
            </span>
          </div>

          <div className="mt-5 flex justify-center">
            <JansCharacter level={jansLevel} />
          </div>

          {/* Dynamic Audio Radar & Equalizer */}
          {isSpeaking ? (
            <div className="mt-3 flex items-center justify-center gap-1.5 border-2 border-[#20211f] bg-[#20211f] px-3 py-2 shadow-[2px_2px_0_#20211f]">
              <span className="mr-1 font-mono text-[8px] font-black uppercase tracking-wider text-[#ffca3a]">
                SPEAKING
              </span>
              <span className="h-3 w-1 animate-pulse bg-[#ffca3a]" />
              <span className="h-5 w-1 animate-pulse bg-[#ffca3a] delay-75" />
              <span className="h-2 w-1 animate-pulse bg-[#ffca3a] delay-150" />
              <span className="h-6 w-1 animate-pulse bg-[#ffca3a] delay-100" />
              <span className="h-4 w-1 animate-pulse bg-[#ffca3a] delay-200" />
            </div>
          ) : isListening ? (
            <div className="mt-3 flex items-center justify-center gap-1.5 border-2 border-[#20211f] bg-[#e66b3c] px-3 py-2 text-white shadow-[2px_2px_0_#20211f]">
              <span className="mr-1 font-mono text-[8px] font-black uppercase tracking-wider">
                LISTENING TO YOU...
              </span>
              <span className="h-2 w-1 animate-pulse bg-white" />
              <span className="h-4 w-1 animate-pulse bg-white delay-100" />
              <span className="h-5 w-1 animate-pulse bg-white delay-150" />
              <span className="h-3 w-1 animate-pulse bg-white delay-75" />
            </div>
          ) : isThinking ? (
            <div className="mt-3 flex items-center justify-center gap-2 border-2 border-[#20211f] bg-[#dfe5da] px-3 py-2 text-[#20211f] shadow-[2px_2px_0_#20211f]">
              <span className="h-2 w-2 animate-ping bg-[#20211f]" />
              <span className="font-mono text-[8px] font-black uppercase tracking-wider">
                REASONING ON CPU...
              </span>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !voiceEnabled
                  setVoiceEnabled(next)
                  if (!next) stopSpeaking()
                  try {
                    window.localStorage.setItem('jans-voice-enabled', String(next))
                  } catch {}
                }}
                className={`flex items-center justify-center gap-1.5 border-2 border-[#20211f] px-3 py-1 font-mono text-[8px] font-black uppercase shadow-[2px_2px_0_#20211f] transition ${
                  voiceEnabled ? 'bg-[#20211f] text-[#ffca3a]' : 'bg-white text-[#737970]'
                }`}
                title="Toggle Voice Output"
              >
                <Icon name={voiceEnabled ? 'speaker' : 'speakerOff'} size={12} />
                <span>{voiceEnabled ? 'VOICE ON' : 'VOICE MUTED'}</span>
              </button>

              <div className="border-2 border-[#20211f] bg-[#f3efe3] p-2 shadow-[2px_2px_0_#20211f]">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="font-mono text-[7px] font-black uppercase tracking-wider text-[#20211f]">
                    Neural Voice:
                  </label>
                  <button
                    type="button"
                    onClick={testVoicePlayback}
                    className="flex items-center gap-1 border border-[#20211f] bg-[#ffca3a] px-1.5 py-0.5 font-mono text-[7px] font-black uppercase text-[#20211f] transition hover:bg-[#ffe380] active:translate-x-[1px] active:translate-y-[1px]"
                    title="Audition selected neural voice"
                  >
                    <Icon name="speaker" size={9} />
                    <span>AUDITION</span>
                  </button>
                </div>
                <select
                  value={selectedVoice}
                  onChange={(e) => {
                    setSelectedVoice(e.target.value)
                    try {
                      window.localStorage.setItem('jans-neural-voice', e.target.value)
                    } catch {}
                  }}
                  className="w-full border-2 border-[#20211f] bg-white px-1.5 py-1 font-mono text-[8px] font-bold text-[#20211f] outline-none"
                >
                  <option value="en-GB-RyanNeural">🇬🇧 Ryan (Jarvis British)</option>
                  <option value="en-GB-SoniaNeural">🇬🇧 Sonia (British Elegant)</option>
                  <option value="en-US-ChristopherNeural">🇺🇸 Christopher (US Deep)</option>
                  <option value="en-US-JennyNeural">🇺🇸 Jenny (US Natural)</option>
                </select>
              </div>
            </div>
          )}

          <div className="mt-4 border-t-2 border-[#20211f] pt-4">
            <p className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#20211f]">
              Conversational Engine
            </p>
            <div className="mt-2.5 space-y-2 text-[10px] leading-4 text-[#20211f]">
              <div className="border-l-2 border-[#20211f] pl-2">
                <span className="font-mono text-[8px] font-black uppercase block">Hands-Free Duplex</span>
                Fluid spoken turns without tapping buttons
              </div>
              <div className="border-l-2 border-[#20211f] pl-2">
                <span className="font-mono text-[8px] font-black uppercase block">Silence Detection</span>
                1.3s pause commits your thought automatically
              </div>
              <div className="border-l-2 border-[#20211f] pl-2">
                <span className="font-mono text-[8px] font-black uppercase block">Instant Barge-In</span>
                Interrupt speech anytime to redirect
              </div>
            </div>
          </div>

          {/* Lifelong Episodic Memory Card */}
          <div className="mt-4 border-t-2 border-[#20211f] pt-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#20211f]">
                Lifelong Brain
              </span>
              <span className="border border-[#20211f] bg-[#20211f] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[#ffca3a]">
                {memories.length} FACTS
              </span>
            </div>
            <p className="mt-1 text-[9px] leading-3 text-[#52564e]">
              Persistent episodic memory stored in local SQLite WAL. Retained across all sessions.
            </p>
            <button
              type="button"
              onClick={() => setShowMemoryConsole((prev) => !prev)}
              className={`mt-2.5 flex w-full items-center justify-center gap-1.5 border-2 border-[#20211f] px-3 py-1.5 font-mono text-[8px] font-black uppercase shadow-[2px_2px_0_#20211f] transition active:translate-x-[1px] active:translate-y-[1px] ${
                showMemoryConsole
                  ? 'bg-[#e66b3c] text-white'
                  : 'bg-[#20211f] text-[#ffca3a] hover:bg-[#343532]'
              }`}
            >
              <span>{showMemoryConsole ? '✕ CLOSE BRAIN' : '🧠 OPEN MEMORY BRAIN'}</span>
            </button>
          </div>
        </aside>

        <div className="flex min-h-[560px] flex-col">
          {/* Continuous Ambient Jarvis Live Mode Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#20211f] bg-[#ffca3a] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 border-2 border-[#20211f] ${
                  jarvisLive
                    ? isListening
                      ? 'animate-ping bg-[#e66b3c]'
                      : isSpeaking
                        ? 'animate-pulse bg-[#75a38a]'
                        : 'bg-[#20211f]'
                    : isListening
                      ? 'animate-ping bg-[#e66b3c]'
                      : 'bg-white'
                }`}
              />
              <span className="font-mono text-[9px] font-black uppercase tracking-wider text-[#20211f]">
                {jarvisLive
                  ? isListening
                    ? '🎙️ DUPLEX LISTENING · SPEAK FREELY...'
                    : isSpeaking
                      ? '🔊 JANS SPEAKING · TAP INTERRUPT TO SPEAK'
                      : isThinking
                        ? '⚡️ JANS REASONING ON RYZEN CPU...'
                        : 'JARVIS DUPLEX ACTIVE'
                  : isListening
                    ? '🎙️ MICROPHONE CAPTURING AUDIO...'
                    : isSpeaking
                      ? '🔊 JANS SPEAKING...'
                      : isThinking
                        ? '⚡️ JANS REASONING...'
                        : 'STANDBY · TAP MIC OR START DUPLEX'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isSpeaking && (
                <button
                  type="button"
                  onClick={interruptAndListen}
                  className="flex items-center gap-1 border-2 border-[#20211f] bg-[#e66b3c] px-2.5 py-1 font-mono text-[8px] font-black uppercase text-white shadow-[2px_2px_0_#20211f] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  title="Cut off Jans and speak immediately"
                >
                  <Icon name="close" size={10} />
                  <span>⚡️ INTERRUPT JANS</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowMemoryConsole((prev) => !prev)}
                className={`flex items-center gap-1 border-2 border-[#20211f] px-2.5 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_#20211f] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                  showMemoryConsole
                    ? 'bg-[#20211f] text-[#ffca3a]'
                    : 'bg-white text-[#20211f] hover:bg-[#dfe5da]'
                }`}
                title="View what Jans remembers about you"
              >
                <span>🧠 BRAIN ({memories.length})</span>
              </button>

              <button
                type="button"
                onClick={toggleJarvisLive}
                className={`flex items-center gap-1.5 border-2 border-[#20211f] px-3 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_#20211f] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                  jarvisLive
                    ? 'bg-[#20211f] text-[#ffca3a]'
                    : 'bg-white text-[#20211f] hover:bg-[#dfe5da]'
                }`}
                title="Toggle continuous hands-free voice loop"
              >
                <Icon name="mic" size={13} />
                <span>{jarvisLive ? '🔴 DUPLEX LIVE: ON' : '▶️ START HANDS-FREE DUPLEX'}</span>
              </button>
            </div>
          </div>

          {/* Transparent Memory Bank Console */}
          {showMemoryConsole && (
            <div className="border-b-2 border-[#20211f] bg-[#f3efe3] p-4">
              <div className="flex items-center justify-between border-b-2 border-[#20211f] pb-3">
                <div>
                  <h4 className="font-mono text-[10px] font-black uppercase tracking-wider text-[#20211f]">
                    🧠 Jans Episodic Brain · {isJahnavi ? 'Jahnavi' : 'Siddhant'}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-[#555a50]">
                    Authoritative lifelong memory bank. Queried via FTS5 full-text indexing before every response.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMemoryConsole(false)}
                  className="border border-[#20211f] bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[#20211f] shadow-[1px_1px_0_#20211f] hover:bg-[#ffca3a]"
                >
                  Close
                </button>
              </div>

              {/* Quick Memory Injection Form */}
              <form onSubmit={handleSaveMemory} className="mt-3 grid gap-2 md:grid-cols-[1fr_120px_110px_auto]">
                <input
                  type="text"
                  placeholder={`Teach Jans a permanent fact about ${isJahnavi ? 'Jahnavi' : 'Siddhant'}...`}
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  className="border-2 border-[#20211f] bg-white px-3 py-1.5 text-[11px] outline-none focus:bg-[#fffdf7]"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="border-2 border-[#20211f] bg-white px-2 py-1.5 font-mono text-[9px] font-bold text-[#20211f] outline-none"
                >
                  <option value="goal">Goal</option>
                  <option value="milestone">Milestone</option>
                  <option value="struggle">Struggle</option>
                  <option value="preference">Preference</option>
                  <option value="study">Study</option>
                  <option value="habit">Habit</option>
                  <option value="project">Project</option>
                  <option value="general">General</option>
                </select>
                <select
                  value={newImportance}
                  onChange={(e) => setNewImportance(Number(e.target.value))}
                  className="border-2 border-[#20211f] bg-white px-2 py-1.5 font-mono text-[9px] font-bold text-[#20211f] outline-none"
                >
                  <option value={5}>★★★★★ (Core)</option>
                  <option value={4}>★★★★ (High)</option>
                  <option value={3}>★★★ (Normal)</option>
                  <option value={2}>★★ (Low)</option>
                  <option value={1}>★ (Minor)</option>
                </select>
                <button
                  type="submit"
                  disabled={savingMemory || !newFact.trim()}
                  className="border-2 border-[#20211f] bg-[#ffca3a] px-3 py-1.5 font-mono text-[9px] font-black uppercase text-[#20211f] shadow-[2px_2px_0_#20211f] transition hover:bg-[#ffe380] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                >
                  {savingMemory ? 'Saving...' : '+ Teach'}
                </button>
              </form>

              {/* Memory List */}
              <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {memories.length === 0 ? (
                  <div className="border border-dashed border-[#20211f] p-4 text-center font-mono text-[10px] text-[#737970]">
                    No memories stored yet. Talk with Jans or manually teach a goal/milestone above!
                  </div>
                ) : (
                  memories.map((mem) => {
                    const badgeBg =
                      mem.category === 'goal'
                        ? 'bg-[#ffca3a] text-[#20211f]'
                        : mem.category === 'milestone'
                        ? 'bg-[#dfe5da] text-[#20211f]'
                        : mem.category === 'struggle'
                        ? 'bg-[#e66b3c] text-white'
                        : mem.category === 'preference'
                        ? 'bg-[#20211f] text-[#ffca3a]'
                        : 'bg-white text-[#20211f]'

                    return (
                      <div
                        key={mem.id}
                        className="flex items-start justify-between gap-3 border-2 border-[#20211f] bg-white p-2.5 shadow-[2px_2px_0_#20211f]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`border border-[#20211f] px-1.5 py-0.5 font-mono text-[7px] font-black uppercase ${badgeBg}`}>
                              {mem.category}
                            </span>
                            <span className="font-mono text-[8px] font-bold text-[#e66b3c]">
                              {'★'.repeat(mem.importance)}
                            </span>
                            <span className="font-mono text-[7px] text-[#858a82]">
                              {mem.source === 'auto' ? '⚡ Auto-Consolidated' : '✍️ Manual'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium leading-4 text-[#20211f]">{mem.fact}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="shrink-0 border border-[#20211f] p-1 text-[#8b4c36] transition hover:bg-[#e66b3c] hover:text-white"
                          title="Purge memory"
                        >
                          <Icon name="trash" size={11} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Permission warning banner if microphone blocked */}
          {micError && (
            <div className="border-b-2 border-[#20211f] bg-[#e66b3c] px-4 py-2 font-mono text-[9px] font-bold text-white">
              ⚠️ {micError}
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-7">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[620px] border-2 border-[#20211f] p-4 text-[11px] leading-5 whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-[#20211f] text-[#f3efe3]'
                      : 'bg-[#dfe5da] shadow-[3px_3px_0_#20211f]'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-mono text-[7px] font-bold uppercase tracking-[0.15em] opacity-60">
                      {message.role === 'user' ? 'You' : 'Jans'}
                    </span>
                    {message.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => speakText(message.content)}
                        className="flex items-center gap-1 border border-[#20211f]/40 bg-white/80 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase text-[#20211f] transition hover:bg-white active:translate-x-[1px] active:translate-y-[1px]"
                        title="Replay Jarvis Voice"
                      >
                        <Icon name="speaker" size={10} />
                        <span>REPLAY</span>
                      </button>
                    )}
                  </div>
                  {message.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 font-mono text-[9px] text-[#737970]">
                <span className="h-2 w-2 animate-ping bg-[#e66b3c]" />
                <span>Jans is reasoning on Ryzen CPU...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t-2 border-[#20211f] bg-[#f3efe3] p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  jarvisLive
                    ? isListening
                      ? 'Listening... speak freely without touching anything...'
                      : isSpeaking
                        ? 'Jans is speaking (tap Interrupt to cut in)...'
                        : isThinking
                          ? 'Jans is reasoning...'
                          : 'Speak your question...'
                    : isListening
                      ? 'Listening... speak your thought...'
                      : isSpeaking
                        ? 'Jans is speaking (tap mic to interrupt)...'
                        : isThinking
                          ? 'Jans is thinking...'
                          : 'Ask Jans to plan, review, research, or organize...'
                }
                className={`min-w-0 flex-1 border-2 border-[#20211f] px-4 text-[11px] outline-none transition ${
                  isListening
                    ? 'border-[#e66b3c] bg-[#fff6f2] placeholder:text-[#e66b3c]'
                    : 'bg-white focus:bg-[#fffdf7]'
                }`}
              />

              {/* Single Mic Tap or Jarvis Live */}
              <button
                type="button"
                onClick={jarvisLive ? interruptAndListen : toggleManualMic}
                className={`grid h-12 w-12 shrink-0 place-items-center border-2 border-[#20211f] shadow-[3px_3px_0_#20211f] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                  isListening
                    ? 'animate-pulse bg-[#e66b3c] text-white ring-2 ring-[#e66b3c]/50'
                    : isSpeaking
                      ? 'bg-[#ffca3a] text-[#20211f] hover:bg-[#e66b3c] hover:text-white'
                      : 'bg-white text-[#20211f] hover:bg-[#edf0e9]'
                }`}
                title={
                  isSpeaking
                    ? 'Interrupt Jans & Speak'
                    : isListening
                      ? 'Stop Listening'
                      : 'Voice Input (Click Once to Speak)'
                }
                aria-label="Microphone"
              >
                <Icon name="mic" size={18} />
              </button>

              <button
                disabled={sending}
                className="grid h-12 w-12 shrink-0 place-items-center border-2 border-[#20211f] bg-[#e66b3c] text-white shadow-[3px_3px_0_#20211f] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                aria-label="Send message"
              >
                <Icon name="up" />
              </button>
            </div>
            <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.1em] text-[#858a82]">
              Ambient Jarvis Duplex · Speak naturally · 1.3s pause commits · Tap mic once to speak anytime
            </p>
          </form>
        </div>
      </div>
    </>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 shrink-0 items-center gap-2 border-2 border-[#20211f] bg-[#ffca3a] px-4 font-mono text-[9px] font-black uppercase shadow-[3px_3px_0_#20211f]"
    >
      <Icon name="plus" size={14} /> <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function CaptureModal({
  initialType,
  onClose,
  onSave,
}: {
  initialType: CaptureType
  onClose: () => void
  onSave: (
    type: CaptureType,
    form: {
      title: string
      body: string
      label: string
      description: string
      date?: string
      priority?: 'High' | 'Normal'
    },
  ) => void
}) {
  const [type, setType] = useState<CaptureType>(initialType)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') || '').trim()
    const body = String(data.get('body') || '').trim()
    if (!title || (type !== 'Task' && !body)) return
    onSave(type, {
      title,
      body,
      label: String(data.get('label') || '').trim(),
      description: String(data.get('description') || '').trim(),
      date: String(data.get('date') || '').trim() || new Date().toISOString().split('T')[0],
      priority: (String(data.get('label') || '').trim() as 'High' | 'Normal') || 'Normal',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#20211f]/60 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-[580px] border-2 border-[#20211f] bg-[#f3efe3] shadow-[7px_7px_0_#20211f]">
        <div className="flex items-center justify-between border-b-2 border-[#20211f] bg-[#dfe5da] p-4">
          <div>
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.16em]">
              Quick capture
            </span>
            <h2 className="mt-1 text-xl font-black tracking-[-0.04em]">Put it somewhere useful.</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center border-2 border-[#20211f] bg-white"
            aria-label="Close capture"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="flex border-b-2 border-[#20211f]">
          {(['Note', 'Diary', 'Task', 'Command'] as CaptureType[]).map((item) => (
            <button
              key={item}
              onClick={() => setType(item)}
              className={`flex-1 border-r border-[#20211f] px-2 py-3 font-mono text-[8px] font-black uppercase last:border-r-0 ${type === item ? 'bg-[#ffca3a]' : 'bg-white'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <form key={type} onSubmit={submit} className="grid gap-4 p-5">
          <label className="grid gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.1em]">
            {type === 'Command' ? 'Command name' : type === 'Task' ? 'Task' : 'Title'}
            <input
              name="title"
              autoFocus
              required
              className="h-11 border-2 border-[#20211f] bg-white px-3 font-sans text-[12px] normal-case tracking-normal outline-none focus:bg-[#fff9dd]"
              placeholder={
                type === 'Command' ? 'e.g. Restart a Docker service' : 'Give it a clear name'
              }
            />
          </label>
          {type !== 'Task' && (
            <label className="grid gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.1em]">
              {type === 'Command' ? 'Command' : type === 'Diary' ? 'What happened?' : 'Note'}
              <textarea
                name="body"
                required
                rows={type === 'Command' ? 3 : 6}
                className={`${type === 'Command' ? 'font-mono' : 'font-sans'} border-2 border-[#20211f] bg-white p-3 text-[12px] normal-case leading-5 tracking-normal outline-none focus:bg-[#fff9dd]`}
                placeholder={
                  type === 'Command'
                    ? 'Enter the exact command...'
                    : 'Write without organizing it first...'
                }
              />
            </label>
          )}
          {type === 'Command' && (
            <label className="grid gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.1em]">
              What it does
              <input
                name="description"
                className="h-11 border-2 border-[#20211f] bg-white px-3 font-sans text-[12px] normal-case tracking-normal outline-none"
                placeholder="A short reminder for future you"
              />
            </label>
          )}
          {(type === 'Note' || type === 'Command' || type === 'Task') && (
            <div className={`grid gap-3 ${type === 'Task' ? 'sm:grid-cols-2' : ''}`}>
              <label className="grid gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.1em]">
                {type === 'Task' ? 'Priority' : 'Label'}
                {type === 'Task' ? (
                  <select
                    name="label"
                    className="h-11 border-2 border-[#20211f] bg-white px-3 font-sans text-[12px] normal-case tracking-normal outline-none"
                  >
                    <option>Normal</option>
                    <option>High</option>
                  </select>
                ) : (
                  <input
                    name="label"
                    className="h-11 border-2 border-[#20211f] bg-white px-3 font-sans text-[12px] normal-case tracking-normal outline-none"
                    placeholder={
                      type === 'Command' ? 'Git, Shell, Network...' : 'Planning, Idea, Reference...'
                    }
                  />
                )}
              </label>
              {type === 'Task' && (
                <label className="grid gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.1em]">
                  Scheduled Date
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="h-11 border-2 border-[#20211f] bg-white px-3 font-sans text-[12px] normal-case tracking-normal outline-none focus:bg-[#fff9dd]"
                  />
                </label>
              )}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-2 border-t-2 border-[#20211f] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-[#20211f] bg-white px-4 py-2.5 font-mono text-[8px] font-black uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="border-2 border-[#20211f] bg-[#e66b3c] px-5 py-2.5 font-mono text-[8px] font-black uppercase text-white shadow-[3px_3px_0_#20211f]"
            >
              Save {type}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type DocumentItem = {
  id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  label?: string
  created_at: string
  chunk_count?: number
}

function LibraryView({
  setStore,
  currentUser = 'sidd',
}: {
  setStore: React.Dispatch<React.SetStateAction<Store>>
  currentUser?: 'sidd' | 'jahnavi'
}) {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadLabel, setUploadLabel] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function loadDocs() {
    setLoading(true)
    fetch(`/api/documents?user=${currentUser}`)
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed to load')))
      .then((data) => setDocuments(data.documents || []))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDocs()
  }, [currentUser])

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const files = fileInputRef.current?.files
    if (!files || !files[0]) return

    const file = files[0]
    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('label', uploadLabel.trim() || 'General')
    formData.append('user', currentUser)

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Upload failed')

      // Award +50 Knowledge XP for indexing a technical document
      setStore((current) => ({
        ...current,
        knowledgeXp: (current.knowledgeXp || 0) + 50,
      }))

      if (fileInputRef.current) fileInputRef.current.value = ''
      setUploadLabel('')
      loadDocs()
    } catch (err: any) {
      setError(err?.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  async function handleEditLabel(doc: DocumentItem) {
    const next = prompt(`Set tag for "${doc.original_name}":`, doc.label || 'General')
    if (next === null) return
    const clean = next.replace(/^#/, '').trim() || 'General'
    try {
      await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: clean }),
      })
      setDocuments((current) =>
        current.map((d) => (d.id === doc.id ? { ...d, label: clean } : d)),
      )
    } catch {
      alert('Failed to update document tag')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" from library and database index?`)) return
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      setDocuments((current) => current.filter((doc) => doc.id !== id))
    } catch {
      alert('Failed to delete document')
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const allTags = Array.from(
    new Set(documents.map((d) => (d.label || 'General').trim())),
  ).filter(Boolean)

  const filtered = documents.filter((doc) => {
    const matchesSearch =
      doc.original_name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.label && doc.label.toLowerCase().includes(search.toLowerCase()))
    const matchesTag = selectedTag ? (doc.label || 'General') === selectedTag : true
    return matchesSearch && matchesTag
  })

  const totalSize = documents.reduce((sum, d) => sum + d.file_size, 0)
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0)

  return (
    <>
      <PageHeading
        index="09"
        title="Document library"
        description="PDF lecture slides, technical textbooks, and research papers organized by tags and indexed in SQLite FTS5 for Jans."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Upload & Tag Section */}
        <section className="border-2 border-[#20211f] bg-white shadow-[4px_4px_0_#20211f]">
          <div className="border-b-2 border-[#20211f] bg-[#dfe5da] p-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-black">Add document (PDF)</h2>
              <p className="mt-1 text-[9px] text-[#6d746c]">
                Assign a tag like #Physics or #OS so Jans can instantly organize and reference it.
              </p>
            </div>
            <span className="font-mono text-[8px] font-black uppercase bg-[#75a38a] text-white px-2 py-0.5 border border-[#20211f]">
              +50 Knowledge XP
            </span>
          </div>

          <form onSubmit={handleUpload} className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                required
                className="flex-1 border-2 border-[#20211f] bg-[#f3efe3] p-2 text-[11px] font-mono file:mr-3 file:border-2 file:border-[#20211f] file:bg-white file:px-3 file:py-1 file:font-mono file:text-[9px] file:font-bold file:uppercase cursor-pointer"
              />
              <input
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                placeholder="Tag (e.g. Physics, OS)"
                className="h-11 border-2 border-[#20211f] bg-white px-3 font-mono text-[10px] outline-none sm:w-44"
              />
              <button
                type="submit"
                disabled={uploading}
                className="h-11 border-2 border-[#20211f] bg-[#ffca3a] px-5 font-mono text-[9px] font-black uppercase shadow-[3px_3px_0_#20211f] disabled:opacity-50 hover:bg-[#ffbe1a]"
              >
                {uploading ? 'Indexing...' : 'Index PDF'}
              </button>
            </div>
            {error && <p className="mt-3 text-[10px] font-bold text-[#b34e2d]">{error}</p>}
          </form>
        </section>

        {/* Storage Telemetry */}
        <section className="border-2 border-[#20211f] bg-[#ffca3a] p-5 shadow-[4px_4px_0_#20211f] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] font-black uppercase tracking-[0.14em]">
                SQLite Telemetry
              </span>
              <span className="font-mono text-[7px] font-bold bg-[#20211f] text-white px-1.5 py-0.5">
                WAL Mode
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t-2 border-[#20211f] pt-4">
              <div>
                <strong className="block text-2xl font-black">{documents.length}</strong>
                <small className="font-mono text-[7px] uppercase font-bold text-[#20211f]/70">
                  Documents
                </small>
              </div>
              <div>
                <strong className="block text-2xl font-black">{formatBytes(totalSize)}</strong>
                <small className="font-mono text-[7px] uppercase font-bold text-[#20211f]/70">
                  Disk Stored
                </small>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#20211f]/30">
            <p className="font-mono text-[8px] leading-4 text-[#20211f]">
              <strong>{totalChunks} text chunks</strong> indexed in FTS5 table for instant semantic recall by tag or query.
            </p>
          </div>
        </section>
      </div>

      {/* Document Library Grid with Tag Filtering */}
      <section className="mt-8 border-2 border-[#20211f] bg-white shadow-[4px_4px_0_#20211f]">
        <div className="border-b-2 border-[#20211f] bg-[#dfe5da] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-black">Indexed documents</h2>
            <span className="font-mono text-[8px] font-bold bg-[#20211f] text-white px-1.5 py-0.5">
              {filtered.length}
            </span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or tag..."
            className="h-9 border-2 border-[#20211f] bg-white px-3 text-[11px] outline-none sm:w-64"
          />
        </div>

        <div className="p-4 md:p-6">
          {/* Tag Filter Pills */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[#20211f]/20 pb-4 mb-5">
              <span className="font-mono text-[8px] uppercase font-bold text-[#6d746c] mr-1">
                Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`border border-[#20211f] px-2.5 py-1 font-mono text-[8px] font-black uppercase ${
                  selectedTag === null ? 'bg-[#20211f] text-white' : 'bg-white hover:bg-[#dfe5da]'
                }`}
              >
                All ({documents.length})
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`border border-[#20211f] px-2.5 py-1 font-mono text-[8px] font-black uppercase ${
                    selectedTag === tag ? 'bg-[#ffca3a] text-[#20211f]' : 'bg-white hover:bg-[#dfe5da]'
                  }`}
                >
                  #{tag} ({documents.filter((d) => (d.label || 'General') === tag).length})
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <p className="py-8 text-center font-mono text-[10px] text-[#737970]">
              Querying SQLite database...
            </p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[13px] font-black text-[#20211f]">No documents found.</p>
              <p className="mt-1 text-[10px] text-[#737970] max-w-md mx-auto">
                {selectedTag
                  ? `No documents found under tag #${selectedTag}.`
                  : 'Upload course lecture slides or papers above with tags like #Physics or #OS.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((doc) => (
                <article
                  key={doc.id}
                  className="border-2 border-[#20211f] bg-[#f3efe3] p-4 shadow-[2px_2px_0_#20211f] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[7px] font-black uppercase bg-[#20211f] text-white px-1.5 py-0.5">
                          PDF
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditLabel(doc)}
                          title="Click to rename tag"
                          className="font-mono text-[8px] font-black uppercase bg-[#ffca3a] text-[#20211f] px-2 py-0.5 border border-[#20211f] hover:bg-[#ffbe1a]"
                        >
                          #{doc.label || 'General'} ✎
                        </button>
                      </div>
                      <span className="font-mono text-[8px] text-[#737970]">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="mt-2 text-[12px] font-black leading-4 text-[#20211f] line-clamp-2">
                      {doc.original_name}
                    </h3>
                    <div className="mt-3 flex items-center gap-2 font-mono text-[8px] text-[#737970]">
                      <span>{formatBytes(doc.file_size)}</span>
                      <span>·</span>
                      <span>{doc.chunk_count || 0} FTS chunks</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#20211f]/20 flex items-center justify-between gap-2">
                    <a
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center border-2 border-[#20211f] bg-white py-1.5 font-mono text-[8px] font-black uppercase hover:bg-[#ffca3a]"
                    >
                      Preview PDF ↗
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id, doc.original_name)}
                      className="grid w-8 h-8 place-items-center border-2 border-[#20211f] bg-white hover:bg-[#e66b3c] hover:text-white"
                      aria-label="Delete document"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function TimetableModal({
  user,
  onClose,
  onSyncComplete,
}: {
  user: string
  onClose: () => void
  onSyncComplete: () => void
}) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setError(null)
    setStatus('Connecting to hub.msot.org...')
    try {
      const res = await fetch('/api/timetable/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), user }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to sync timetable')
      }
      setStatus(`✔ Successfully synchronized ${data.addedCount} classes!`)
      onSyncComplete()
      setTimeout(() => {
        onClose()
      }, 1400)
    } catch (err: any) {
      setError(err?.message || 'Sync failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#20211f]/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg border-2 border-[#20211f] bg-[#f3efe3] p-6 shadow-[8px_8px_0_#20211f]">
        <div className="flex items-center justify-between border-b-2 border-[#20211f] pb-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-[#e66b3c]" />
            <h2 className="font-mono text-sm font-black uppercase tracking-wider text-[#20211f]">
              Sync College Timetable (hub.msot.org)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-6 w-6 place-items-center border border-[#20211f] bg-white font-mono text-xs font-black hover:bg-[#ffca3a]"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-[#555a53]">
            Link your live classes, labs, and lecture schedules from <strong>hub.msot.org/#/timetable</strong> directly into your Daybook calendar.
          </p>

          <div className="border border-[#20211f] bg-white p-3 font-mono text-[10px]">
            <p className="font-bold text-[#20211f]">How to grab your authToken (1-time):</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4 text-[#666]">
              <li>Log in to <span className="font-bold text-[#20211f]">hub.msot.org/#/timetable</span></li>
              <li>Press <kbd className="border bg-[#f3efe3] px-1 font-bold">Cmd + Option + I</kbd> and click <strong>Console</strong></li>
              <li>Paste this command and hit Enter:</li>
            </ol>
            <div className="mt-1.5 flex items-center justify-between border border-[#20211f] bg-[#dfe5da] p-1.5 text-[9px]">
              <code>copy(localStorage.getItem(&apos;flutter.authToken&apos;) || localStorage.getItem(&apos;authToken&apos;))</code>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[9px] font-black uppercase tracking-wider text-[#20211f]">
              Student Auth Token:
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token here (or leave empty if already saved in CLI)..."
              className="mt-1 w-full border-2 border-[#20211f] bg-white p-2 font-mono text-xs focus:bg-[#fff9dd] focus:outline-none"
            />
          </div>

          {error && (
            <div className="border border-red-500 bg-red-100 p-2 font-mono text-[10px] text-red-700">
              {error}
            </div>
          )}

          {status && (
            <div className="border border-green-600 bg-green-100 p-2 font-mono text-[10px] text-green-800">
              {status}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-[#20211f] pt-3">
            <span className="font-mono text-[9px] text-[#777]">
              Terminal shortcut: <code className="font-bold text-[#20211f]">jans timetable sync</code>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border-2 border-[#20211f] bg-white px-3 py-1.5 font-mono text-[9px] font-bold uppercase hover:bg-[#dfe5da]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSync}
                className="border-2 border-[#20211f] bg-[#20211f] px-4 py-1.5 font-mono text-[9px] font-bold uppercase text-[#f3efe3] hover:bg-[#e66b3c] disabled:opacity-50"
              >
                {loading ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
