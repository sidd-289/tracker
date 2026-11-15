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
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  // Safe schema migrations for existing databases
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN user_id TEXT DEFAULT 'sidd';`)
  } catch {}
  try {
    db.exec(`ALTER TABLE memories ADD COLUMN user_id TEXT DEFAULT 'sidd';`)
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

  // 2. Fallback: if query mentions document/pdf/assignment or a document tag, pull relevant chunks
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

  if (matchedChunks.length === 0 || isDocReference) {
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

  if (matchedChunks.length === 0 && !libraryDirectory) return ''

  return (
    `\n\n=== ${userName.toUpperCase()}'S INDEXED DOCUMENTS & PDF CONTENT (Authoritative Ground Truth) ===\n` +
    libraryDirectory +
    `\nExcerpts:\n` +
    matchedChunks
      .map((c) => `[Source: "${c.title}" | Tag: #${c.label || 'General'}]\n${c.content}`)
      .join('\n---\n') +
    `\n=== END OF DOCUMENT CONTEXT ===\n` +
    `CRITICAL INSTRUCTION: Answer ${userName}'s question strictly using the document content above. If ${userName} asks for a tag (e.g. #Physics or #Notes), reference the documents under that tag. Cite exact numbers, questions, and topics from the document without guessing or hallucinating.`
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
