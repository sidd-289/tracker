import { NextRequest } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { listDocuments, insertDocument, DOCUMENTS_DIR } from '@/lib/db'

const execFileAsync = promisify(execFile)

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user') || 'sidd'
    const docs = listDocuments(userId)
    return Response.json({ documents: docs })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to list documents.' }, { status: 500 })
  }
}

function chunkText(text: string, chunkSize = 1200, overlap = 200): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= chunkSize) return [clean]

  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length)
    chunks.push(clean.slice(start, end))
    start += chunkSize - overlap
  }
  return chunks
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    const originalName = file.name || 'document.pdf'
    const mimeType = file.type || 'application/pdf'
    const rawUser = String(formData.get('user') || formData.get('userId') || 'sidd').toLowerCase()
    const userId = rawUser === 'jahnavi' ? 'jahnavi' : 'sidd'
    const rawLabel = String(formData.get('label') || 'General').trim()
    const label = rawLabel.replace(/^#/, '').trim() || 'General'
    const docId = `doc-${Date.now()}`
    const filename = `${docId}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const diskPath = path.join(DOCUMENTS_DIR, filename)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Write the raw PDF file directly to disk
    await fs.writeFile(diskPath, buffer)

    // 2. Extract plain text using standalone Node extraction worker (avoids bundler worker-path issues)
    let extractedText = ''
    try {
      const scriptPath = path.resolve(process.cwd(), 'src/lib/extract-pdf.cjs')
      const { stdout } = await execFileAsync(process.execPath, [scriptPath, diskPath], {
        timeout: 20000,
        maxBuffer: 15 * 1024 * 1024,
      })
      extractedText = stdout.trim()
    } catch (parseError: any) {
      console.error('PDF extraction failed:', parseError?.message)
      extractedText = `Document: ${originalName}`
    }

    // 3. Chunk text into segments for FTS5 and Jans context retrieval
    const chunks = chunkText(extractedText)

    // 4. Save metadata and index in SQLite
    insertDocument(
      {
        id: docId,
        user_id: userId,
        filename,
        original_name: originalName,
        file_size: file.size,
        mime_type: mimeType,
        label,
        created_at: new Date().toISOString(),
      },
      chunks,
    )

    return Response.json({
      success: true,
      document: {
        id: docId,
        user_id: userId,
        filename,
        original_name: originalName,
        file_size: file.size,
        mime_type: mimeType,
        label,
        created_at: new Date().toISOString(),
        chunk_count: chunks.length,
      },
    })
  } catch (error: any) {
    console.error('Document upload error:', error)
    return Response.json({ error: error?.message || 'Failed to process document.' }, { status: 500 })
  }
}
