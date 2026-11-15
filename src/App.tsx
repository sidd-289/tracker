import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

type Mood = "Great" | "Good" | "Okay" | "Low";
type Entry = {
  id: number;
  title: string;
  body: string;
  mood: Mood;
  tag: string;
  createdAt: string;
};

const moodMap: Record<Mood, { face: string; color: string }> = {
  Great: { face: "●‿●", color: "#de6b3b" },
  Good: { face: "•‿•", color: "#de6b3b" },
  Okay: { face: "•—•", color: "#848c78" },
  Low: { face: "•︵•", color: "#71839b" },
};

const starterEntries: Entry[] = [
  {
    id: 1,
    title: "A slower morning",
    body: "Made coffee, left my phone in the other room, and read for twenty minutes. I want more mornings that begin this quietly.",
    mood: "Good",
    tag: "Reflection",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Small win at work",
    body: "Finished the outline I had been putting off. Starting with the messiest version made it feel much easier.",
    mood: "Great",
    tag: "Win",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const initialHabits = [
  { id: 1, name: "Morning walk", detail: "20 minutes outside", done: true, streak: 6, icon: "sun" },
  { id: 2, name: "Read", detail: "At least 10 pages", done: false, streak: 12, icon: "book" },
  {
    id: 3,
    name: "No phone after 10",
    detail: "Wind down slowly",
    done: false,
    streak: 3,
    icon: "moon",
  },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    journal: (
      <>
        <path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2V4Z" />
        <path d="M8 4v16M11 8h5M11 12h4" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    flame: (
      <path d="M13.5 3.5c.6 3.6-2.3 4.6-2.3 7.1 0 1.2.8 2 1.8 2.5-.2-1.9 1.2-3.1 2-3.8.1 2.5 3.4 3.6 3.4 7.1A6.4 6.4 0 0 1 12 22a6.4 6.4 0 0 1-6.4-5.6c0-3.5 2.4-5.4 4.4-7.3.1 1.3.5 2.4 1.1 3.1-.5-3.8.6-6.3 2.4-8.7Z" />
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" />
      </>
    ),
    moon: <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5a8.5 8.5 0 1 0 11.7 11.7Z" />,
    dots: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function App() {
  const [active, setActive] = useState("Today");
  const [entries, setEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem("daybook-entries");
    return saved ? JSON.parse(saved) : starterEntries;
  });
  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem("daybook-habits");
    return saved ? JSON.parse(saved) : initialHabits;
  });
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [mood, setMood] = useState<Mood>("Good");
  const [energy, setEnergy] = useState(7);

  useEffect(() => localStorage.setItem("daybook-entries", JSON.stringify(entries)), [entries]);
  useEffect(() => localStorage.setItem("daybook-habits", JSON.stringify(habits)), [habits]);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        `${entry.title} ${entry.body} ${entry.tag}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [entries, search],
  );

  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const completed = habits.filter((habit: (typeof initialHabits)[number]) => habit.done).length;

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    const body = String(data.get("body")).trim();
    if (!title || !body) return;
    setEntries([
      {
        id: Date.now(),
        title,
        body,
        mood,
        tag: String(data.get("tag")),
        createdAt: new Date().toISOString(),
      },
      ...entries,
    ]);
    setModal(false);
    event.currentTarget.reset();
  }

  const nav = [
    ["Today", "grid"],
    ["Journal", "journal"],
    ["Insights", "chart"],
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActive("Today")} aria-label="Daybook home">
          <span className="brand-mark">
            <span />
          </span>
          <span>daybook</span>
        </button>

        <nav className="nav-list" aria-label="Main navigation">
          {nav.map(([label, icon]) => (
            <button
              key={label}
              className={active === label ? "nav-item active" : "nav-item"}
              onClick={() => setActive(label)}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-streak">
            <span className="streak-icon">
              <Icon name="flame" size={17} />
            </span>
            <div>
              <strong>6 day streak</strong>
              <small>Keep showing up</small>
            </div>
          </div>
          <button className="nav-item" onClick={() => setActive("Settings")}>
            <Icon name="settings" />
            <span>Settings</span>
          </button>
          <div className="profile">
            <div className="avatar">A</div>
            <div>
              <strong>Alex Morgan</strong>
              <small>Your space</small>
            </div>
            <Icon name="dots" />
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="mobile-brand brand" onClick={() => setActive("Today")}>
            <span className="brand-mark">
              <span />
            </span>
            <span>daybook</span>
          </button>
          <div className="search-wrap">
            <Icon name="search" size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your entries..."
              aria-label="Search entries"
            />
            <kbd>⌘ K</kbd>
          </div>
          <button className="primary-btn" onClick={() => setModal(true)}>
            <Icon name="plus" size={17} /> New entry
          </button>
        </header>

        <div className="content">
          {active === "Settings" ? (
            <section className="simple-page">
              <span className="eyebrow">PREFERENCES</span>
              <h1>Your space, your way.</h1>
              <p>Daybook stores everything privately in this browser.</p>
              <div className="settings-card">
                <div>
                  <strong>Local data</strong>
                  <span>{entries.length} journal entries saved</span>
                </div>
                <button
                  onClick={() => {
                    localStorage.clear();
                    setEntries(starterEntries);
                    setHabits(initialHabits);
                  }}
                >
                  Reset demo data
                </button>
              </div>
            </section>
          ) : active === "Insights" ? (
            <Insights entries={entries} habits={habits} />
          ) : (
            <>
              <section className="welcome">
                <div>
                  <span className="date-label">{today.toUpperCase()}</span>
                  <h1>{active === "Journal" ? "Your journal." : "Good morning, Alex."}</h1>
                  <p>
                    {active === "Journal"
                      ? "All your thoughts, moments, and small wins in one place."
                      : "Take a moment to check in with yourself."}
                  </p>
                </div>
                {active === "Today" && (
                  <div className="week-strip">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                      <div
                        key={`${day}-${i}`}
                        className={i === 3 ? "day current" : i < 3 ? "day complete" : "day"}
                      >
                        <span>{day}</span>
                        <b>{i + 10}</b>
                        <i />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {active === "Today" && (
                <>
                  <section className="checkin-card">
                    <div className="checkin-copy">
                      <span className="card-kicker">DAILY CHECK-IN</span>
                      <h2>How are you feeling?</h2>
                      <p>There’s no right answer. Just notice.</p>
                    </div>
                    <div className="moods" role="group" aria-label="Select your mood">
                      {(Object.keys(moodMap) as Mood[]).map((item) => (
                        <button
                          key={item}
                          className={mood === item ? "mood selected" : "mood"}
                          onClick={() => setMood(item)}
                        >
                          <span style={{ color: moodMap[item].color }}>{moodMap[item].face}</span>
                          <small>{item}</small>
                        </button>
                      ))}
                    </div>
                    <div className="energy">
                      <div>
                        <span>Energy level</span>
                        <b>{energy}/10</b>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={energy}
                        onChange={(e) => setEnergy(Number(e.target.value))}
                        style={{ "--progress": `${energy * 10}%` } as React.CSSProperties}
                      />
                      <div className="energy-labels">
                        <small>Running low</small>
                        <small>Fully charged</small>
                      </div>
                    </div>
                  </section>

                  <section className="section-block">
                    <div className="section-title">
                      <div>
                        <h2>Today’s habits</h2>
                        <p>
                          {completed} of {habits.length} completed
                        </p>
                      </div>
                      <span className="progress-pill">
                        {Math.round((completed / habits.length) * 100)}%
                      </span>
                    </div>
                    <div className="habit-list">
                      {habits.map((habit: (typeof initialHabits)[number]) => (
                        <button
                          className={habit.done ? "habit done" : "habit"}
                          key={habit.id}
                          onClick={() =>
                            setHabits(
                              habits.map((item: (typeof initialHabits)[number]) =>
                                item.id === habit.id ? { ...item, done: !item.done } : item,
                              ),
                            )
                          }
                        >
                          <span className="habit-symbol">
                            <Icon name={habit.icon} size={19} />
                          </span>
                          <span className="habit-copy">
                            <strong>{habit.name}</strong>
                            <small>{habit.detail}</small>
                          </span>
                          <span className="habit-streak">
                            <Icon name="flame" size={14} /> {habit.streak}
                          </span>
                          <span className="check">{habit.done && "✓"}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              <section className="section-block entries-section">
                <div className="section-title">
                  <div>
                    <h2>{active === "Journal" ? "All entries" : "Recent reflections"}</h2>
                    <p>
                      {search
                        ? `${filteredEntries.length} matching entries`
                        : "Notes from your days"}
                    </p>
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => setActive(active === "Journal" ? "Today" : "Journal")}
                  >
                    {active === "Journal" ? "Back to today" : "View journal"}{" "}
                    <Icon name="arrow" size={14} />
                  </button>
                </div>
                <div className="entries-grid">
                  {filteredEntries.map((entry) => (
                    <article className="entry-card" key={entry.id}>
                      <div className="entry-meta">
                        <span className="tag">{entry.tag}</span>
                        <span>
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(entry.createdAt))}
                        </span>
                      </div>
                      <h3>{entry.title}</h3>
                      <p>{entry.body}</p>
                      <div className="entry-footer">
                        <span className="tiny-mood" style={{ color: moodMap[entry.mood].color }}>
                          {moodMap[entry.mood].face}
                        </span>
                        <span>Feeling {entry.mood.toLowerCase()}</span>
                      </div>
                    </article>
                  ))}
                  {!filteredEntries.length && (
                    <div className="empty-state">
                      <Icon name="search" />
                      <strong>No entries found</strong>
                      <span>Try another search or write something new.</span>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-entry-title">
            <div className="modal-head">
              <div>
                <span className="card-kicker">NEW REFLECTION</span>
                <h2 id="new-entry-title">What’s on your mind?</h2>
              </div>
              <button className="icon-btn" onClick={() => setModal(false)}>
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={addEntry}>
              <label>
                Title
                <input name="title" autoFocus placeholder="Give this moment a name" required />
              </label>
              <label>
                Your thoughts
                <textarea
                  name="body"
                  placeholder="Write without editing yourself..."
                  rows={6}
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  Category
                  <select name="tag">
                    <option>Reflection</option>
                    <option>Win</option>
                    <option>Gratitude</option>
                    <option>Idea</option>
                  </select>
                </label>
                <label>
                  Mood
                  <select value={mood} onChange={(e) => setMood(e.target.value as Mood)}>
                    {Object.keys(moodMap).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setModal(false)}>
                  Cancel
                </button>
                <button className="primary-btn" type="submit">
                  Save reflection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Insights({ entries, habits }: { entries: Entry[]; habits: typeof initialHabits }) {
  const bars = [42, 58, 45, 72, 65, 88, 76];
  return (
    <section className="simple-page insights-page">
      <span className="eyebrow">YOUR PATTERNS</span>
      <h1>A little more clarity.</h1>
      <p>Small signals from the way you’ve been showing up.</p>
      <div className="stat-grid">
        <div className="stat-card">
          <small>JOURNAL ENTRIES</small>
          <strong>{entries.length}</strong>
          <span>This week</span>
        </div>
        <div className="stat-card">
          <small>HABITS COMPLETE</small>
          <strong>
            {habits.filter((h) => h.done).length}/{habits.length}
          </strong>
          <span>Today</span>
        </div>
        <div className="stat-card">
          <small>LONGEST STREAK</small>
          <strong>12</strong>
          <span>days reading</span>
        </div>
      </div>
      <div className="chart-card">
        <div>
          <h2>Energy rhythm</h2>
          <p>Your last seven check-ins</p>
        </div>
        <div className="bar-chart">
          {bars.map((bar, i) => (
            <div key={i}>
              <span style={{ height: `${bar}%` }} />
              <small>{["M", "T", "W", "T", "F", "S", "S"][i]}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default App;
