'use client'

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

type Section =
  | 'Today'
  | 'Diary'
  | 'Notes'
  | 'Commands'
  | 'YouTube'
  | 'Profiles'
  | 'Trackers'
  | 'Jans'
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
}

const DEFAULT_STORE: Store = {
  mood: 'Clear',
  notes: [
    {
      id: 'note-1',
      title: 'Ideas for a calmer week',
      body: 'Protect the first hour. Group shallow work after lunch. Keep Friday open for review.',
      label: 'Planning',
      pinned: true,
      createdAt: '2025-01-15T09:00:00.000Z',
    },
    {
      id: 'note-2',
      title: 'Things worth remembering',
      body: 'Done is a decision, not a feeling. Make the next action obvious.',
      label: 'Thoughts',
      pinned: false,
      createdAt: '2025-01-14T18:00:00.000Z',
    },
  ],
  diary: [
    {
      id: 'diary-1',
      title: 'A quieter start',
      body: 'Left my phone away from the desk and let the morning arrive slowly. I finished the hard thing before opening messages.',
      mood: 'Good',
      createdAt: '2025-01-15T08:30:00.000Z',
    },
    {
      id: 'diary-2',
      title: 'Learning to leave space',
      body: 'Not every open hour needs to become another task. The walk helped me return with a better answer.',
      mood: 'Clear',
      createdAt: '2025-01-13T20:20:00.000Z',
    },
  ],
  commands: [
    {
      id: 'command-1',
      name: 'Clean merged branches',
      command: 'git branch --merged | grep -v "\\*" | xargs -n 1 git branch -d',
      label: 'Git',
      description: 'Remove local branches already merged into the current branch.',
      favorite: true,
    },
    {
      id: 'command-2',
      name: 'Find large files',
      command: 'find . -type f -size +20M -not -path "./.git/*"',
      label: 'Shell',
      description: 'List files larger than 20 MB while ignoring Git internals.',
      favorite: false,
    },
    {
      id: 'command-3',
      name: 'Check listening ports',
      command: 'ss -tulpn',
      label: 'Network',
      description: 'Show TCP and UDP ports currently listening.',
      favorite: true,
    },
  ],
  tasks: [
    { id: 'task-1', title: 'Finish the tracker navigation', done: true, priority: 'High' },
    { id: 'task-2', title: 'Review operating systems notes', done: false, priority: 'High' },
    { id: 'task-3', title: 'Plan tomorrow before 8 PM', done: false, priority: 'Normal' },
  ],
  habits: [
    {
      id: 'habit-1',
      name: 'Deep work',
      days: [true, true, false, true, true, false, false],
      color: '#e66b3c',
    },
    {
      id: 'habit-2',
      name: 'Read 10 pages',
      days: [true, false, true, true, true, true, false],
      color: '#75a38a',
    },
    {
      id: 'habit-3',
      name: 'Walk outside',
      days: [true, true, true, false, true, false, false],
      color: '#7f8fbd',
    },
  ],
  videos: [
    {
      id: 'video-1',
      title: 'But what is a neural network?',
      url: 'https://www.youtube.com/watch?v=aircAruvnKk',
      videoId: 'aircAruvnKk',
      label: 'Machine Learning',
      status: 'queue',
      createdAt: '2025-01-15T09:00:00.000Z',
    },
    {
      id: 'video-2',
      title: 'The missing semester of your CS education',
      url: 'https://www.youtube.com/watch?v=Z56Jmr9Z34Q',
      videoId: 'Z56Jmr9Z34Q',
      label: 'Developer Tools',
      status: 'watched',
      createdAt: '2025-01-12T09:00:00.000Z',
    },
  ],
  profiles: {
    github: 'sidd-289',
    leetcode: '',
    codeforces: '',
    codechef: '',
  },
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

function useLocalStore() {
  const [store, setStore] = useState<Store>(DEFAULT_STORE)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const legacyStorageKey = ['man', 'ager-desk-v1'].join('')
      const saved =
        window.localStorage.getItem('jans-desk-v1') || window.localStorage.getItem(legacyStorageKey)
      if (saved) setStore({ ...DEFAULT_STORE, ...JSON.parse(saved) })
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (loaded) window.localStorage.setItem('jans-desk-v1', JSON.stringify(store))
  }, [loaded, store])

  return { store, setStore, loaded }
}

export function DaybookApp() {
  const { store, setStore } = useLocalStore()
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
    if (!query.trim()) return []
    const needle = query.toLowerCase()
    return [
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
    ].slice(0, 8)
  }, [query, store])

  function chooseSearchResult(section: Section) {
    setActive(section)
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
                <div className="absolute left-0 right-0 top-12 border-2 border-[#20211f] bg-[#f3efe3] p-2 shadow-[5px_5px_0_#20211f]">
                  {searchResults.length ? (
                    searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => chooseSearchResult(result.section)}
                        className="flex w-full items-center justify-between border-b border-[#20211f]/20 px-3 py-3 text-left last:border-0 hover:bg-[#ffca3a]/25"
                      >
                        <span>
                          <strong className="block text-[11px]">{result.title}</strong>
                          <small className="font-mono text-[8px] uppercase text-[#737970]">
                            {result.meta}
                          </small>
                        </span>
                        <Icon name="arrow" size={13} />
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-5 text-center text-[11px] text-[#737970]">
                      No matching records.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setCapture('Note')}
              className="ml-auto flex h-10 items-center gap-2 border-2 border-[#20211f] bg-[#ffca3a] px-3 text-[11px] font-black shadow-[3px_3px_0_#20211f] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none md:px-4"
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
            {active === 'Jans' && <JansView store={store} jansLevel={jansLevel} />}
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
                return {
                  ...current,
                  tasks: [
                    {
                      id,
                      title: form.title,
                      done: false,
                      priority: form.label === 'High' ? 'High' : 'Normal',
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
  onCapture,
  onNavigate,
}: {
  store: Store
  setStore: React.Dispatch<React.SetStateAction<Store>>
  dateLabel: string
  jansLevel: number
  completedTasks: number
  onCapture: (type: CaptureType) => void
  onNavigate: (section: Section) => void
}) {
  const [briefOpen, setBriefOpen] = useState(false)

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
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-[#75a38a]" />
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.18em]">
                Jans / morning brief
              </span>
            </div>
            <h2 className="mt-5 max-w-[660px] text-[24px] font-black leading-tight tracking-[-0.035em] md:text-[31px]">
              You have two important things left. Protect one quiet hour for the OS review, then
              make tomorrow&apos;s plan small.
            </h2>
            <p className="mt-4 max-w-[580px] text-[11px] leading-5 text-[#636a61]">
              Jans uses your open tasks, habits, and recent notes to keep the plan realistic—not
              crowded.
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
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#777d74]">
                Focus queue
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">What matters today</h2>
            </div>
            <button
              onClick={() => onCapture('Task')}
              className="flex items-center gap-1 font-mono text-[9px] font-black uppercase"
            >
              <Icon name="plus" size={13} /> Add task
            </button>
          </div>
          <div className="border-t-2 border-[#20211f]">
            {store.tasks.map((task, index) => (
              <button
                key={task.id}
                onClick={() =>
                  setStore((current) => ({
                    ...current,
                    tasks: current.tasks.map((item) =>
                      item.id === task.id ? { ...item, done: !item.done } : item,
                    ),
                  }))
                }
                className="grid w-full grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-[#20211f] py-4 text-left"
              >
                <span
                  className={`grid h-6 w-6 place-items-center border-2 border-[#20211f] text-[11px] ${task.done ? 'bg-[#75a38a]' : 'bg-white'}`}
                >
                  {task.done && '✓'}
                </span>
                <span>
                  <strong
                    className={`block text-[12px] ${task.done ? 'text-[#81867e] line-through' : ''}`}
                  >
                    {task.title}
                  </strong>
                  <small className="font-mono text-[8px] uppercase text-[#858a82]">
                    0{index + 1} · {task.priority} priority
                  </small>
                </span>
                <Icon name="arrow" size={13} />
              </button>
            ))}
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
    const parsed = new URL(url)
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
  const queued = store.videos.filter((video) => video.status === 'queue')
  const watched = store.videos.filter((video) => video.status === 'watched')

  function addVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const url = String(form.get('url') || '').trim()
    const videoId = extractYouTubeId(url)
    if (!videoId) return
    const title = String(form.get('title') || '').trim() || 'Untitled YouTube video'
    const label = String(form.get('label') || '').trim() || 'Learning'
    setStore((current) => ({
      ...current,
      videos: [
        {
          id: `video-${Date.now()}`,
          title,
          url,
          videoId,
          label,
          status: 'queue',
          createdAt: new Date().toISOString(),
        },
        ...current.videos,
      ],
    }))
    event.currentTarget.reset()
    setShowForm(false)
  }

  function toggleVideo(id: string) {
    setStore((current) => ({
      ...current,
      videos: current.videos.map((video) =>
        video.id === id
          ? { ...video, status: video.status === 'queue' ? 'watched' : 'queue' }
          : video,
      ),
    }))
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
            placeholder="Paste YouTube URL"
            className="h-11 border-2 border-[#20211f] bg-white px-3 text-[11px] outline-none"
          />
          <input
            name="title"
            placeholder="Video title"
            className="h-11 border-2 border-[#20211f] bg-white px-3 text-[11px] outline-none"
          />
          <input
            name="label"
            placeholder="Label"
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
    const handle = (username ?? store.profiles[platform]).trim()
    if (!handle || platform === 'codechef') return
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
    if (store.profiles.github) loadProfile('github')
    // The saved handle is intentionally the only trigger for initial sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function saveHandle(platform: keyof CompetitiveProfiles, username: string) {
    setStore((current) => ({
      ...current,
      profiles: { ...current.profiles, [platform]: username.trim() },
    }))
    if (platform !== 'codechef') loadProfile(platform, username)
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
          loading={false}
          error=""
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
  value: string
  loading: boolean
  onSave: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave(draft)
      }}
      className="flex"
    >
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label={`${platform} username`}
        placeholder={`${platform} username`}
        className="h-11 min-w-0 border-2 border-r-0 border-[#20211f] bg-white px-3 text-[11px] outline-none"
      />
      <button
        disabled={loading || !draft.trim()}
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
  value: string
  data?: ProfileData | null
  loading: boolean
  error: string
  onSave: (value: string) => void
}) {
  return (
    <article className="border-2 border-[#20211f] bg-white shadow-[3px_3px_0_#20211f]">
      <div
        className="flex items-center justify-between border-b-2 border-[#20211f] p-4"
        style={{ background: accent }}
      >
        <strong className="text-[13px]">{name}</strong>
        <span className="font-mono text-[8px] font-black uppercase">
          {data ? 'Verified' : value ? 'Saved' : 'Not linked'}
        </span>
      </div>
      <div className="p-4">
        <ProfileInput platform={platform} value={value} loading={loading} onSave={onSave} />
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

function ProfileMiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong className="block font-mono text-lg">{value.toLocaleString()}</strong>
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
    </>
  )
}

function JansView({ store, jansLevel }: { store: Store; jansLevel: number }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'I’m here. Give me the messy version of your day and I’ll help turn it into a realistic plan.',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/jans')
      .then((response) => response.json())
      .then((data) => setOnline(Boolean(data.online)))
      .catch(() => setOnline(false))
  }, [])

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content || sending) return

    const nextMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setSending(true)

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
        body: JSON.stringify({ messages: nextMessages, context }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }])
      setOnline(true)
    } catch {
      setOnline(false)
      const openTasks = store.tasks.filter((task) => !task.done)
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: openTasks.length
            ? `Jans is offline, so I’m using your local plan. Start with “${openTasks[0].title}”. Give it 25 focused minutes, then decide whether it needs another block.`
            : 'Jans is offline, but your local workspace is available. Your queue is clear—capture one intention for tomorrow and close the day.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <PageHeading
        index="08"
        title="Jans intelligence"
        description="Your Jarvis-style intelligence console: planning, research, prioritization, and practical support in one private room."
      />
      <div className="grid min-h-[620px] border-2 border-[#20211f] bg-white shadow-[5px_5px_0_#20211f] lg:grid-cols-[290px_1fr]">
        <aside className="border-b-2 border-[#20211f] bg-[#ffca3a] p-5 lg:border-b-0 lg:border-r-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.15em]">
              Jans / Intelligence
            </span>
            <span
              className={`flex items-center gap-1 font-mono text-[8px] font-bold uppercase ${online ? 'text-[#416450]' : 'text-[#8b4c36]'}`}
            >
              <i className={`h-2 w-2 ${online ? 'bg-[#75a38a]' : 'bg-[#e66b3c]'}`} />{' '}
              {online === null ? 'Checking' : online ? 'Online' : 'Local mode'}
            </span>
          </div>
          <div className="mt-5 flex justify-center">
            <JansCharacter level={jansLevel} />
          </div>
          <div className="border-t-2 border-[#20211f] pt-4">
            <p className="font-mono text-[8px] font-black uppercase tracking-[0.14em]">
              Jans protocol
            </p>
            <ul className="mt-3 grid gap-2 text-[10px] leading-4">
              <li>01 / Reduce before adding</li>
              <li>02 / Protect the important hour</li>
              <li>03 / End with a clear next step</li>
            </ul>
          </div>
        </aside>

        <div className="flex min-h-[560px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-7">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[620px] border-2 border-[#20211f] p-4 text-[11px] leading-5 ${
                    message.role === 'user'
                      ? 'bg-[#20211f] text-[#f3efe3]'
                      : 'bg-[#dfe5da] shadow-[3px_3px_0_#20211f]'
                  }`}
                >
                  <span className="mb-2 block font-mono text-[7px] font-bold uppercase tracking-[0.15em] opacity-60">
                    {message.role === 'user' ? 'You' : 'Jans'}
                  </span>
                  {message.content}
                </div>
              </div>
            ))}
            {sending && (
              <p className="font-mono text-[9px] text-[#737970]">
                Jans is organizing the thought...
              </p>
            )}
          </div>
          <form onSubmit={sendMessage} className="border-t-2 border-[#20211f] bg-[#f3efe3] p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Jans to plan, review, research, or organize..."
                className="min-w-0 flex-1 border-2 border-[#20211f] bg-white px-4 text-[11px] outline-none focus:bg-[#fffdf7]"
              />
              <button
                disabled={sending}
                className="grid h-12 w-12 place-items-center border-2 border-[#20211f] bg-[#e66b3c] text-white shadow-[3px_3px_0_#20211f] disabled:opacity-50"
                aria-label="Send message"
              >
                <Icon name="up" />
              </button>
            </div>
            <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.1em] text-[#858a82]">
              Local context only · Your diary text is not sent unless you paste it here
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
    form: { title: string; body: string; label: string; description: string },
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
