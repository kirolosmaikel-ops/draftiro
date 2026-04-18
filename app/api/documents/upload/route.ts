import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service-role client for server-side uploads (bypasses RLS / storage policies)
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/documents/upload
 * multipart/form-data: file, caseId?, clientId?
 *
 * Flow:
 *  1. Upload raw file to Supabase Storage
 *  2. Parse text via LlamaParse (PDF/DOCX) or read directly (TXT)
 *  3. Chunk the text into ~500-token pieces
 *  4. Embed each chunk via OpenAI text-embedding-3-small (1536-dim)
 *  5. Insert document + chunks rows in Postgres
 */
export async function POST(req: Request) {
  const supabase = serviceClient()

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const caseId = formData.get('caseId') as string | null
  const clientId = formData.get('clientId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // ── 1. Get auth user from Authorization header ──────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  let userId: string | null = null
  let firmId: string | null = null

  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      userId = user.id
      const { data: userData } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
      firmId = userData?.firm_id ?? null
    }
  }

  // ── 2. Upload to Supabase Storage ───────────────────────────────────────
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'documents'
  const fileBytes = await file.arrayBuffer()
  const storagePath = `${firmId ?? 'public'}/${Date.now()}_${file.name}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBytes, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // ── 3. Insert document row (status: processing) ─────────────────────────
  const { data: docRow, error: docError } = await supabase.from('documents').insert({
    firm_id: firmId,
    case_id: caseId || null,
    client_id: clientId || null,
    name: file.name,
    storage_path: storagePath,
    mime_type: file.type,
    size_bytes: file.size,
    status: 'processing',
    uploaded_by: userId,
  }).select('id').single()

  if (docError || !docRow) {
    return NextResponse.json({ error: `DB insert failed: ${docError?.message}` }, { status: 500 })
  }

  const documentId = docRow.id

  // ── 4. Parse text ────────────────────────────────────────────────────────
  let fullText = ''
  let pageCount = 1

  try {
    if (file.name.toLowerCase().endsWith('.txt')) {
      fullText = await file.text()
    } else {
      // Use LlamaParse for PDF / DOCX
      const llamaForm = new FormData()
      llamaForm.append('file', file)

      const llamaRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY}`,
          Accept: 'application/json',
        },
        body: llamaForm,
      })

      if (!llamaRes.ok) throw new Error(`LlamaParse upload: ${llamaRes.status}`)

      const { id: jobId } = await llamaRes.json() as { id: string }

      // Poll for result (up to 60 s)
      let attempts = 0
      while (attempts < 30) {
        await new Promise(r => setTimeout(r, 2000))
        const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
          headers: { Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY}` },
        })
        const statusJson = await statusRes.json() as { status: string; num_pages?: number }
        if (statusJson.status === 'SUCCESS') {
          pageCount = statusJson.num_pages ?? 1
          const textRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/text`, {
            headers: { Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY}` },
          })
          const textJson = await textRes.json() as { text: string }
          fullText = textJson.text
          break
        }
        if (statusJson.status === 'ERROR') throw new Error('LlamaParse job failed')
        attempts++
      }
    }
  } catch (parseErr) {
    await supabase.from('documents').update({ status: 'error', error_message: String(parseErr) }).eq('id', documentId)
    return NextResponse.json({ error: `Parsing failed: ${parseErr}` }, { status: 500 })
  }

  if (!fullText) {
    await supabase.from('documents').update({ status: 'error', error_message: 'Empty text after parsing' }).eq('id', documentId)
    return NextResponse.json({ error: 'No text extracted' }, { status: 422 })
  }

  // ── 5. Chunk text (~500 tokens ≈ ~2000 chars) ────────────────────────────
  const CHUNK_SIZE = 2000
  const CHUNK_OVERLAP = 200
  const chunks: string[] = []
  let start = 0
  while (start < fullText.length) {
    chunks.push(fullText.slice(start, start + CHUNK_SIZE))
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }

  // ── 6. Embed chunks via OpenAI ───────────────────────────────────────────
  const BATCH = 20
  const allEmbeddings: number[][] = []

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
    })
    if (!embRes.ok) {
      await supabase.from('documents').update({ status: 'error', error_message: 'Embedding failed' }).eq('id', documentId)
      return NextResponse.json({ error: 'Embedding failed' }, { status: 500 })
    }
    const embJson = await embRes.json() as { data: { embedding: number[] }[] }
    allEmbeddings.push(...embJson.data.map(d => d.embedding))
  }

  // ── 7. Insert document_chunks ────────────────────────────────────────────
  const chunkRows = chunks.map((text, i) => ({
    document_id: documentId,
    firm_id: firmId,
    content: text,
    chunk_index: i,
    page_number: Math.floor((i / chunks.length) * pageCount) + 1,
    embedding: JSON.stringify(allEmbeddings[i]),
  }))

  // Insert in batches of 100 to avoid request size limits
  for (let i = 0; i < chunkRows.length; i += 100) {
    const { error: chunkErr } = await supabase.from('document_chunks').insert(chunkRows.slice(i, i + 100))
    if (chunkErr) {
      await supabase.from('documents').update({ status: 'error', error_message: chunkErr.message }).eq('id', documentId)
      return NextResponse.json({ error: `Chunk insert failed: ${chunkErr.message}` }, { status: 500 })
    }
  }

  // ── 8. Mark indexed ──────────────────────────────────────────────────────
  await supabase.from('documents').update({ status: 'indexed', page_count: pageCount }).eq('id', documentId)

  return NextResponse.json({ id: documentId, chunks: chunkRows.length, pages: pageCount })
}
