import { NextRequest } from 'next/server'
import path from 'node:path'
import fs from 'node:fs'
import { getDocument, deleteDocument, updateDocumentLabel, DOCUMENTS_DIR } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const doc = getDocument(id)
    if (!doc) {
      return Response.json({ error: 'Document not found.' }, { status: 404 })
    }

    const filePath = path.join(DOCUMENTS_DIR, doc.filename)
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'File missing from storage disk.' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': doc.mime_type || 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.original_name)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to serve document.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    deleteDocument(id)
    return Response.json({ success: true, id })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to delete document.' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const rawLabel = String(body.label || 'General').trim()
    const label = rawLabel.replace(/^#/, '').trim() || 'General'
    updateDocumentLabel(id, label)
    return Response.json({ success: true, id, label })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to update document label.' }, { status: 500 })
  }
}
