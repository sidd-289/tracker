import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import fs from 'node:fs'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'jans.db')
export const DOCUMENTS_DIR = path.join(DATA_DIR, 'documents')

// Ensure directories exist on startup
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true })
}

let dbInstance: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH)
    // Write-Ahead Logging (WAL) for high-performance concurrent read/writes
    dbInstance.exec('PRAGMA journal_mode = WAL;')
    dbInstance.exec('PRAGMA foreign_keys = ON;')
    initSchema(dbInstance)
  }
  return dbInstance
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    -- Authoritative workspace state shared between UI, Raycast, and Jans
    CREATE TABLE IF NOT EXISTS workspace_state (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Documents metadata (PDFs, papers, lectures)
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'sidd',
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      label TEXT DEFAULT 'General',
      created_at TEXT NOT NULL
    );

    -- Text chunks for deep context retrieval (RAG)
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    -- Full-Text Search index (FTS5) for instantaneous keyword queries
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_documents USING fts5(
      document_id,
      title,
      label,
      content
    );

    -- Long-term episodic memory for Jans
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'sidd',
      category TEXT NOT NULL DEFAULT 'general',
      fact TEXT NOT NULL,
      importance INTEGER DEFAULT 3,
      tags TEXT DEFAULT '',
      source TEXT DEFAULT 'auto',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Full-Text Search index for episodic memories
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_memories USING fts5(
      memory_id,
      user_id,
      category,
      fact,
      tags
    );
  `)

  // Safe schema migrations for existing databases
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN user_id TEXT DEFAULT 'sidd';`)
  } catch {}
  try {
    db.exec(`ALTER TABLE memories ADD COLUMN user_id TEXT DEFAULT 'sidd';`)
  } catch {}
  try {
    db.exec(`ALTER TABLE memories ADD COLUMN category TEXT DEFAULT 'general';`)
  } catch {}
  try {
    db.exec(`ALTER TABLE memories ADD COLUMN fact TEXT;`)
  } catch {}
  try {
    db.exec(`ALTER TABLE memories ADD COLUMN importance INTEGER DEFAULT 3;`)
  } catch {}
  try {
    db.exec(`ALTER TABLE memories ADD COLUMN tags TEXT DEFAULT '';`)
  } catch {}
  try {
    db.exec(`ALTER TABLE memories ADD COLUMN source TEXT DEFAULT 'auto';`)
  } catch {}
  try {
    db.exec(`ALTER TABLE memories ADD COLUMN updated_at TEXT;`)
  } catch {}
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS fts_memories USING fts5(memory_id, user_id, category, fact, tags);`)
  } catch {}
  try {
    // Backfill any legacy records
    db.exec(`UPDATE memories SET fact = value WHERE fact IS NULL AND value IS NOT NULL;`)
    db.exec(`UPDATE memories SET updated_at = created_at WHERE updated_at IS NULL;`)
  } catch {}
}

export type DocumentRecord = {
  id: string
  user_id?: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  label?: string
  created_at: string
  chunk_count?: number
}

export function listDocuments(userId: string = 'sidd'): DocumentRecord[] {
  const db = getDb()
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const stmt = db.prepare(`
    SELECT d.*, COUNT(c.id) as chunk_count
    FROM documents d
    LEFT JOIN document_chunks c ON d.id = c.document_id
    WHERE COALESCE(d.user_id, 'sidd') = ?
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `)
  return stmt.all(cleanUser) as DocumentRecord[]
}

export function getDocument(id: string): DocumentRecord | undefined {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM documents WHERE id = ?')
  return stmt.get(id) as DocumentRecord | undefined
}

export function updateDocumentLabel(id: string, label: string) {
  const db = getDb()
  const cleanLabel = label.trim() || 'General'
  const stmt = db.prepare('UPDATE documents SET label = ? WHERE id = ?')
  stmt.run(cleanLabel, id)

  try {
    const updateFts = db.prepare('UPDATE fts_documents SET label = ? WHERE document_id = ?')
    updateFts.run(cleanLabel, id)
  } catch {}
}

export function insertDocument(
  doc: {
    id: string
    user_id?: string
    filename: string
    original_name: string
    file_size: number
    mime_type: string
    label?: string
    created_at: string
  },
  chunks: string[],
) {
  const db = getDb()
  const cleanUser = (doc.user_id || 'sidd').toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const docLabel = (doc.label || 'General').trim()
  const insertDoc = db.prepare(`
    INSERT INTO documents (id, user_id, filename, original_name, file_size, mime_type, label, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertDoc.run(
    doc.id,
    cleanUser,
    doc.filename,
    doc.original_name,
    doc.file_size,
    doc.mime_type,
    docLabel,
    doc.created_at,
  )

  const insertChunk = db.prepare(`
    INSERT INTO document_chunks (id, document_id, chunk_index, content)
    VALUES (?, ?, ?, ?)
  `)

  const insertFts = db.prepare(`
    INSERT INTO fts_documents (document_id, title, label, content)
    VALUES (?, ?, ?, ?)
  `)

  chunks.forEach((chunk, index) => {
    const chunkId = `${doc.id}-c${index}`
    insertChunk.run(chunkId, doc.id, index, chunk)
    insertFts.run(doc.id, doc.original_name, docLabel, chunk)
  })
}

export function deleteDocument(id: string) {
  const db = getDb()
  const doc = getDocument(id)
  if (doc) {
    const filePath = path.join(DOCUMENTS_DIR, doc.filename)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch (err) {
        console.error('Failed to unlink PDF file:', err)
      }
    }
  }

  // Delete FTS entries
  const deleteFts = db.prepare('DELETE FROM fts_documents WHERE document_id = ?')
  deleteFts.run(id)

  // Cascades to document_chunks
  const deleteDoc = db.prepare('DELETE FROM documents WHERE id = ?')
  deleteDoc.run(id)
}

export function getSmartDocumentContext(query: string, userId: string = 'sidd'): string {
  const db = getDb()
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const userName = cleanUser === 'jahnavi' ? 'Jahnavi' : 'Siddhant'
  const allDocs = listDocuments(cleanUser)
  let libraryDirectory = ''
  if (allDocs.length > 0) {
    libraryDirectory =
      `\nIndexed Documents & Tags in ${userName}'s Library:\n` +
      allDocs.map((d) => `- "${d.original_name}" [Tag: #${d.label || 'General'}]`).join('\n') +
      '\n'
  }

  const STOPWORDS = new Set([
    'how',
    'many',
    'what',
    'is',
    'are',
    'the',
    'in',
    'of',
    'to',
    'a',
    'an',
    'and',
    'or',
    'for',
    'on',
    'with',
    'about',
    'my',
    'your',
    'tell',
    'me',
    'can',
    'you',
    'give',
    'do',
    'does',
    'did',
    'this',
    'that',
    'there',
    'from',
    'it',
    'its',
    'look',
    'under',
    'check',
  ])

  // Extract meaningful tokens
  const words = query
    .toLowerCase()
    .replace(/[^\w\s#]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^#/, ''))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))

  let matchedChunks: Array<{ title: string; label?: string; content: string }> = []

  // 1. Try smart FTS5 prefix match joined with documents to isolate by user_id
  if (words.length > 0) {
    const ftsQuery = words.map((w) => `${w}*`).join(' OR ')
    try {
      const stmt = db.prepare(`
        SELECT f.title, f.label, f.content
        FROM fts_documents f
        JOIN documents d ON d.id = f.document_id
        WHERE COALESCE(d.user_id, 'sidd') = ? AND fts_documents MATCH ?
        LIMIT 6
      `)
      matchedChunks = stmt.all(cleanUser, ftsQuery) as Array<{
        title: string
        label?: string
        content: string
      }>
    } catch {}
  }

  // 2. Fallback: ONLY if query specifically references documents, PDFs, or a known document tag
  const lowerQ = query.toLowerCase()
  const isDocReference =
    lowerQ.includes('pdf') ||
    lowerQ.includes('assignment') ||
    lowerQ.includes('document') ||
    lowerQ.includes('upload') ||
    lowerQ.includes('question') ||
    lowerQ.includes('qpa') ||
    lowerQ.includes('syllabus') ||
    lowerQ.includes('paper') ||
    lowerQ.includes('tag') ||
    lowerQ.includes('label') ||
    allDocs.some((d) => d.label && lowerQ.includes(d.label.toLowerCase()))

  if (matchedChunks.length === 0 && isDocReference) {
    const fallbackStmt = db.prepare(`
      SELECT d.original_name as title, d.label, c.content
      FROM documents d
      JOIN document_chunks c ON d.id = c.document_id
      WHERE COALESCE(d.user_id, 'sidd') = ?
      ORDER BY d.created_at DESC, c.chunk_index ASC
      LIMIT 8
    `)
    const recentChunks = fallbackStmt.all(cleanUser) as Array<{
      title: string
      label?: string
      content: string
    }>
    if (recentChunks.length > 0) {
      matchedChunks = recentChunks
    }
  }

  // If no chunks matched and the user did not explicitly ask for documents, do NOT inject unrelated documents!
  if (matchedChunks.length === 0) {
    if (isDocReference && libraryDirectory) {
      return `\n\n=== ${userName.toUpperCase()}'S INDEXED DOCUMENTS (Directory) ===\n${libraryDirectory}\n=== END DIRECTORY ===\n`
    }
    return ''
  }

  return (
    `\n\n=== ${userName.toUpperCase()}'S INDEXED DOCUMENTS & RELEVANT EXCERPTS ===\n` +
    libraryDirectory +
    `\nExcerpts:\n` +
    matchedChunks
      .map((c) => `[Source: "${c.title}" | Tag: #${c.label || 'General'}]\n${c.content}`)
      .join('\n---\n') +
    `\n=== END OF DOCUMENT CONTEXT ===\n` +
    `CRITICAL INSTRUCTION ON DOCUMENTS: If the document excerpts above are directly relevant to ${userName}'s current question, cite them. If ${userName}'s question is about a different subject (e.g. asking about Web Development or DSA when the documents are about Physics), DO NOT force connections to these documents. Answer his question directly using your engineering knowledge.`
  )
}

export function searchDocumentChunks(query: string, limit = 5): Array<{
  document_id: string
  title: string
  content: string
}> {
  const db = getDb()
  // Clean query for FTS5 syntax
  const sanitized = query.replace(/[^\w\s]/g, ' ').trim()
  if (!sanitized) return []

  try {
    const stmt = db.prepare(`
      SELECT document_id, title, content
      FROM fts_documents
      WHERE fts_documents MATCH ?
      LIMIT ?
    `)
    return stmt.all(sanitized, limit) as Array<{
      document_id: string
      title: string
      content: string
    }>
  } catch {
    return []
  }
}

export function getWorkspaceState(userId: string = 'sidd'): any | null {
  const db = getDb()
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const key = `state_${cleanUser}`
  const stmt = db.prepare('SELECT data FROM workspace_state WHERE key = ?')
  let row = stmt.get(key) as { data: string } | undefined
  if (!row && cleanUser === 'sidd') {
    // Backwards compatibility for existing state under 'current'
    const legacyStmt = db.prepare("SELECT data FROM workspace_state WHERE key = 'current'")
    row = legacyStmt.get() as { data: string } | undefined
  }
  if (!row) return null
  try {
    return JSON.parse(row.data)
  } catch {
    return null
  }
}

export function saveWorkspaceState(data: any, userId: string = 'sidd') {
  const db = getDb()
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const key = `state_${cleanUser}`
  const stmt = db.prepare(`
    INSERT INTO workspace_state (key, data, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
  `)
  stmt.run(key, JSON.stringify(data), new Date().toISOString())
}

export type MemoryCategory =
  | 'goal'
  | 'milestone'
  | 'struggle'
  | 'preference'
  | 'study'
  | 'habit'
  | 'project'
  | 'relationship'
  | 'general'

export type MemoryRecord = {
  id: string
  user_id: string
  category: MemoryCategory
  fact: string
  importance: number // 1 to 5
  tags: string // comma-separated e.g. "dsa, leetcode"
  source: 'auto' | 'manual'
  created_at: string
  updated_at: string
}

export function listMemories(userId: string = 'sidd', limit: number = 100): MemoryRecord[] {
  const db = getDb()
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const stmt = db.prepare(`
    SELECT id, user_id, category, fact, importance, tags, source, created_at, updated_at
    FROM memories
    WHERE COALESCE(user_id, 'sidd') = ? AND fact IS NOT NULL AND TRIM(fact) != ''
    ORDER BY importance DESC, updated_at DESC
    LIMIT ?
  `)
  return stmt.all(cleanUser, limit) as MemoryRecord[]
}

export function insertMemory(
  userId: string = 'sidd',
  category: string,
  fact: string,
  importance: number = 3,
  tags: string = '',
  source: 'auto' | 'manual' = 'auto',
): MemoryRecord {
  const db = getDb()
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()
  const cleanCategory = (category || 'general').toLowerCase() as MemoryCategory
  const cleanFact = fact.trim()
  const cleanTags = (tags || '').toLowerCase().trim()
  const validImportance = Math.min(5, Math.max(1, Math.round(importance || 3)))

  // Deduplication check: if a memory with identical or very similar fact exists, bump importance & timestamp
  const existing = db.prepare(`
    SELECT id, fact, importance FROM memories
    WHERE COALESCE(user_id, 'sidd') = ? AND category = ?
  `).all(cleanUser, cleanCategory) as Array<{ id: string; fact: string; importance: number }>

  const duplicate = existing.find((m) => {
    if (!m.fact) return false
    const f1 = m.fact.toLowerCase()
    const f2 = cleanFact.toLowerCase()
    return f1 === f2 || (f2.length > 25 && f1.includes(f2)) || (f1.length > 25 && f2.includes(f1))
  })

  if (duplicate) {
    const nextImportance = Math.max(duplicate.importance || 3, validImportance)
    const updateStmt = db.prepare(`
      UPDATE memories
      SET importance = ?, updated_at = ?
      WHERE id = ?
    `)
    updateStmt.run(nextImportance, now, duplicate.id)
    return {
      id: duplicate.id,
      user_id: cleanUser,
      category: cleanCategory,
      fact: duplicate.fact,
      importance: nextImportance,
      tags: cleanTags,
      source,
      created_at: now,
      updated_at: now,
    }
  }

  const insertStmt = db.prepare(`
    INSERT INTO memories (id, user_id, key, value, category, fact, importance, tags, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertStmt.run(id, cleanUser, id, cleanFact, cleanCategory, cleanFact, validImportance, cleanTags, source, now, now)

  try {
    const ftsStmt = db.prepare(`
      INSERT INTO fts_memories (memory_id, user_id, category, fact, tags)
      VALUES (?, ?, ?, ?, ?)
    `)
    ftsStmt.run(id, cleanUser, cleanCategory, cleanFact, cleanTags)
  } catch (err) {
    console.error('Failed to index memory in FTS:', err)
  }

  return {
    id,
    user_id: cleanUser,
    category: cleanCategory,
    fact: cleanFact,
    importance: validImportance,
    tags: cleanTags,
    source,
    created_at: now,
    updated_at: now,
  }
}

export function deleteMemory(id: string): boolean {
  const db = getDb()
  try {
    db.prepare('DELETE FROM fts_memories WHERE memory_id = ?').run(id)
  } catch {}
  const res = db.prepare('DELETE FROM memories WHERE id = ?').run(id)
  return res.changes > 0
}

export function updateMemory(id: string, updates: Partial<MemoryRecord>): boolean {
  const db = getDb()
  const now = new Date().toISOString()
  const current = db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as MemoryRecord | undefined
  if (!current) return false

  const updatedFact = updates.fact !== undefined ? updates.fact.trim() : current.fact
  const updatedCategory = updates.category !== undefined ? (updates.category.toLowerCase() as MemoryCategory) : current.category
  const updatedImportance = updates.importance !== undefined ? Math.min(5, Math.max(1, updates.importance)) : current.importance
  const updatedTags = updates.tags !== undefined ? updates.tags : current.tags

  db.prepare(`
    UPDATE memories
    SET fact = ?, category = ?, importance = ?, tags = ?, updated_at = ?
    WHERE id = ?
  `).run(updatedFact, updatedCategory, updatedImportance, updatedTags, now, id)

  try {
    db.prepare('DELETE FROM fts_memories WHERE memory_id = ?').run(id)
    db.prepare(`
      INSERT INTO fts_memories (memory_id, user_id, category, fact, tags)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, current.user_id, updatedCategory, updatedFact, updatedTags)
  } catch {}

  return true
}

export function getSmartMemoryContext(query: string, userId: string = 'sidd'): string {
  const db = getDb()
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const userName = cleanUser === 'jahnavi' ? 'Jahnavi' : 'Siddhant'

  // 1. Core anchors (Top priority memories with importance >= 4)
  const coreStmt = db.prepare(`
    SELECT * FROM memories
    WHERE COALESCE(user_id, 'sidd') = ? AND fact IS NOT NULL AND TRIM(fact) != '' AND importance >= 4
    ORDER BY importance DESC, updated_at DESC
    LIMIT 4
  `)
  const coreMemories = coreStmt.all(cleanUser) as MemoryRecord[]

  // 2. Tokenize query for contextual FTS match
  const STOPWORDS = new Set([
    'how', 'many', 'what', 'is', 'are', 'the', 'in', 'of', 'to', 'a', 'an', 'and', 'or', 'for', 'on', 'with',
    'about', 'my', 'your', 'tell', 'me', 'can', 'you', 'give', 'do', 'does', 'did', 'this', 'that', 'there',
    'from', 'it', 'its', 'look', 'under', 'check', 'hey', 'jans', 'please', 'know', 'remember'
  ])

  const words = query
    .toLowerCase()
    .replace(/[^\w\s#]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^#/, ''))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))

  let matchedMemories: MemoryRecord[] = []
  if (words.length > 0) {
    const ftsQuery = words.map((w) => `${w}*`).join(' OR ')
    try {
      const ftsStmt = db.prepare(`
        SELECT m.* FROM fts_memories f
        JOIN memories m ON m.id = f.memory_id
        WHERE COALESCE(m.user_id, 'sidd') = ? AND m.fact IS NOT NULL AND fts_memories MATCH ?
        ORDER BY m.importance DESC, m.updated_at DESC
        LIMIT 6
      `)
      matchedMemories = ftsStmt.all(cleanUser, ftsQuery) as MemoryRecord[]
    } catch {}
  }

  // 3. Fallback: recent memories to maintain temporal continuity
  const recentStmt = db.prepare(`
    SELECT * FROM memories
    WHERE COALESCE(user_id, 'sidd') = ? AND fact IS NOT NULL AND TRIM(fact) != ''
    ORDER BY updated_at DESC
    LIMIT 4
  `)
  const recentMemories = recentStmt.all(cleanUser) as MemoryRecord[]

  // Deduplicate and combine into an authoritative memory context
  const memoryMap = new Map<string, MemoryRecord>()
  coreMemories.forEach((m) => memoryMap.set(m.id, m))
  matchedMemories.forEach((m) => memoryMap.set(m.id, m))
  recentMemories.forEach((m) => {
    if (memoryMap.size < 8) memoryMap.set(m.id, m)
  })

  const memoriesList = Array.from(memoryMap.values())
  if (memoriesList.length === 0) return ''

  return (
    `\n\n=== JANS'S LIFELONG MEMORY OF ${userName.toUpperCase()} (Ground Truth Stored Across Sessions) ===\n` +
    memoriesList
      .map((m) => `- [${m.category.toUpperCase()} | Priority ${'★'.repeat(m.importance)}] ${m.fact}`)
      .join('\n') +
    `\n=== END OF MEMORY BANK ===\n` +
    `CRITICAL MEMORY DIRECTIVE: You already know these facts deeply about ${userName}. Reflect them naturally in your advice without asking ${userName} to re-explain things already stored in your memory.`
  )
}

export type TaskRecord = {
  id: string
  title: string
  done: boolean
  priority: 'High' | 'Normal'
  date?: string // 'YYYY-MM-DD'
  time?: string
  createdAt?: string
}

export function addTask(
  userId: string = 'sidd',
  task: { title: string; priority?: 'High' | 'Normal'; date?: string; time?: string },
): TaskRecord {
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const state = getWorkspaceState(cleanUser) || { tasks: [] }
  const tasks: TaskRecord[] = Array.isArray(state.tasks) ? state.tasks : []

  const today = new Date().toISOString().split('T')[0]
  const newTask: TaskRecord = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: task.title.trim(),
    done: false,
    priority: task.priority || 'Normal',
    date: task.date || today,
    time: task.time,
    createdAt: new Date().toISOString(),
  }

  tasks.unshift(newTask)
  state.tasks = tasks
  saveWorkspaceState(state, cleanUser)
  return newTask
}

export function listTasks(userId: string = 'sidd', date?: string): TaskRecord[] {
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const state = getWorkspaceState(cleanUser) || { tasks: [] }
  const tasks: TaskRecord[] = Array.isArray(state.tasks) ? state.tasks : []
  if (!date) return tasks
  const today = new Date().toISOString().split('T')[0]
  return tasks.filter((t) => t.date === date || (!t.date && date === today))
}

export function toggleTask(id: string, userId: string = 'sidd'): TaskRecord | null {
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const state = getWorkspaceState(cleanUser) || { tasks: [] }
  const tasks: TaskRecord[] = Array.isArray(state.tasks) ? state.tasks : []
  const task = tasks.find((t) => t.id === id)
  if (!task) return null
  task.done = !task.done
  saveWorkspaceState(state, cleanUser)
  return task
}

export function deleteTask(id: string, userId: string = 'sidd'): boolean {
  const cleanUser = userId.toLowerCase() === 'jahnavi' ? 'jahnavi' : 'sidd'
  const state = getWorkspaceState(cleanUser) || { tasks: [] }
  const tasks: TaskRecord[] = Array.isArray(state.tasks) ? state.tasks : []
  const prevLen = tasks.length
  state.tasks = tasks.filter((t) => t.id !== id)
  if (state.tasks.length !== prevLen) {
    saveWorkspaceState(state, cleanUser)
    return true
  }
  return false
}

export type DailyQuote = {
  quote: string
  author: string
  date: string
  source?: string
}

export function getCachedDailyQuote(today: string): DailyQuote | null {
  const db = getDb()
  try {
    const stmt = db.prepare("SELECT data FROM workspace_state WHERE key = 'daily_quote'")
    const row = stmt.get() as { data: string } | undefined
    if (!row) return null
    const parsed = JSON.parse(row.data) as DailyQuote
    if (parsed && parsed.date === today && parsed.quote) {
      return parsed
    }
  } catch {}
  return null
}

export function saveCachedDailyQuote(quote: DailyQuote) {
  const db = getDb()
  try {
    const stmt = db.prepare(`
      INSERT INTO workspace_state (key, data, updated_at)
      VALUES ('daily_quote', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `)
    stmt.run(JSON.stringify(quote))
  } catch {}
}
