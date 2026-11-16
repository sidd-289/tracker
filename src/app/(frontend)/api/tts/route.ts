import { NextRequest } from 'next/server'
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = String(body.text || '').trim()
    const voice = String(body.voice || 'en-GB-RyanNeural')

    if (!text) {
      return Response.json({ error: 'Text is required.' }, { status: 400 })
    }

    const venvPython = path.resolve(process.cwd(), '.venv/bin/python3')
    const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python3'
    const scriptPath = path.resolve(process.cwd(), 'src/lib/generate-speech.py')

    const child = spawn(pythonPath, [scriptPath, text.slice(0, 1500), voice])

    const chunks: Buffer[] = []
    child.stdout.on('data', (chunk) => chunks.push(chunk))

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) resolve(true)
        else reject(new Error(`TTS process exited with code ${code}`))
      })
      child.on('error', reject)
    })

    const audioBuffer = Buffer.concat(chunks)
    if (audioBuffer.length === 0) {
      return Response.json({ error: 'No audio generated.' }, { status: 500 })
    }

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error('TTS route error:', error?.message)
    return Response.json({ error: error?.message || 'TTS generation failed.' }, { status: 500 })
  }
}
