import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/documents/upload
 * multipart/form-data: file, caseId?, clientId?
 *
 * Flow:
 *  1. Identify user via cookie session (primary) or Authorization header (fallback)
 *  2. Upload raw file to Supabase Storage
 *  3. Parse text via LlamaParse (with 25 s timeout) → fallback to pdf-parse for PDFs
 *  4. Chunk text (~2 000 chars with overlap)
 *  5. Embed chunks via OpenAI text-embedding-3-small
 *  6. Insert document + document_chunks rows
 *
 * maxDuration: Vercel Pro allows up to 300 s, free tier ~60 s.
 * Setting 60 s is the maximum safe value on the hobby plan.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function serviceClientDirect() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  console.log('[upload] ▶ request received')

  // ── 0. Validate env ────────────────────────────────────────────────────
  const missingEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']
    .filter(k => !process.env[k])
  if (missingEnv.length) {
    console.error('[upload] ✗ missing env vars:', missingEnv)
    return NextResponse.json({ error: `Server misconfiguration: ${missingEnv.join(', ')} not set` }, { status: 500 })
  }

  const supabase = serviceClientDirect()

  // ── 1. Parse form data ─────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch (e) {
    return NextResponse.json({ error: `Invalid form data: ${e}` }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const caseId = (formData.get('caseId') as string | null) || null
  const clientId = (formData.get('clientId') as string | null) || null

  if (!file || !file.name) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  console.log('[upload] file:', file.name, 'size:', file.size, 'type:', file.type)

  // ── 2. Resolve user identity (cookie session first, then Bearer token) ──
  let userId: string | null = null
  let firmId: string | null = null

  try {
    // Prefer cookie-based auth (standard for browser requests)
    const cookieClient = await createServerClient()
    const { data: { user } } = await cookieClient.auth.getUser()
    if (user) {
      userId = user.id
      const { data: userData } = await supabase
        .from('users')
        .select('firm_id')
        .eq('id', user.id)
        .single()
      firmId = userData?.firm_id ?? null
      console.log('[upload] auth via cookie — user:', userId, 'firm:', firmId)
    }
  } catch (e) {
    console.warn('[upload] cookie auth failed, trying bearer:', e)
  }

  // Fallback: Authorization header (e.g. from onboarding page fetch)
  if (!userId) {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        userId = user.id
        const { data: userData } = await supabase
          .from('users')
          .select('firm_id')
          .eq('id', user.id)
          .single()
        firmId = userData?.firm_id ?? null
        console.log('[upload] auth via bearer — user:', userId, 'firm:', firmId)
      }
    }
  }

  if (!userId) {
    console.warn('[upload] ⚠ no user identity resolved — proceeding without firm_id')
  }
  if (!firmId) {
    console.warn('[upload] ⚠ firm_id is null — document will be stored without firm association')
  }

  // ── 3. Upload file to Supabase Storage ────────────────────────────────
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'documents'
  const fileBytes = await file.arrayBuffer()
  const storagePath = `${firmId ?? 'public'}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  console.log('[upload] uploading to storage:', bucket, storagePath)
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBytes, { contentType: file.type || 'application/octet-stream', upsert: false })

  if (uploadError) {
    console.error('[upload] ✗ storage upload failed:', uploadError.message)
    return NextResponse.json({
      error: `Storage upload failed: ${uploadError.message}`,
      hint: 'Make sure the "documents" bucket exists in Supabase Storage and has the correct policies.',
    }, { status: 500 })
  }
  console.log('[upload] ✓ file stored at', storagePath)

  // ── 4. Insert document row (status: processing) ────────────────────────
  const { data: docRow, error: docError } = await supabase.from('documents').insert({
    firm_id: firmId,
    case_id: caseId,
    client_id: clientId,
    name: file.name,
    storage_path: storagePath,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    status: 'processing',
    uploaded_by: userId,
  }).select('id').single()

  if (docError || !docRow) {
    console.error('[upload] ✗ DB insert failed:', docError?.message)
    return NextResponse.json({ error: `DB insert failed: ${docError?.message}` }, { status: 500 })
  }

  const documentId = docRow.id
  console.log('[upload] ✓ document row created:', documentId)

  // ── 5. Parse text from file ────────────────────────────────────────────
  let fullText = ''
  let pageCount = 1
  let parseMethod = 'unknown'

  try {
    const filename = file.name.toLowerCase()

    if (filename.endsWith('.txt')) {
      // Plain text — read directly
      fullText = await file.text()
      pageCount = 1
      parseMethod = 'text'
      console.log('[upload] ✓ read plain text, chars:', fullText.length)

    } else if (process.env.LLAMAPARSE_API_KEY) {
      // Try LlamaParse with a hard 25-second timeout
      console.log('[upload] trying LlamaParse…')
      const timeoutMs = 25_000

      try {
        const llamaForm = new FormData()
        llamaForm.append('file', file)

        // Race LlamaParse upload against timeout
        const llamaRes = await Promise.race([
          fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY}`,
              Accept: 'application/json',
            },
            body: llamaForm,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('LlamaParse upload timed out')), timeoutMs)
          ),
        ])

        if (!llamaRes.ok) {
          throw new Error(`LlamaParse upload returned ${llamaRes.status}: ${await llamaRes.text()}`)
        }

        const { id: jobId } = await llamaRes.json() as { id: string }
        console.log('[upload] LlamaParse job queued:', jobId)

        // Poll with 15-second total budget (upload already took some of the 25 s)
        const pollDeadline = Date.now() + 15_000
        let parsed = false

        while (Date.now() < pollDeadline) {
          await new Promise(r => setTimeout(r, 2000))
          const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
            headers: { Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY}` },
          })
          const statusJson = await statusRes.json() as { status: string; num_pages?: number }
          console.log('[upload] LlamaParse status:', statusJson.status)

          if (statusJson.status === 'SUCCESS') {
            pageCount = statusJson.num_pages ?? 1
            const textRes = await fetch(
              `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/text`,
              { headers: { Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY}` } }
            )
            const textJson = await textRes.json() as { text: string }
            fullText = textJson.text ?? ''
            parseMethod = 'llamaparse'
            parsed = true
            console.log('[upload] ✓ LlamaParse done, pages:', pageCount, 'chars:', fullText.length)
            break
          }
          if (statusJson.status === 'ERROR') {
            throw new Error('LlamaParse job returned ERROR status')
          }
        }

        if (!parsed) {
          throw new Error('LlamaParse polling timed out — falling back to pdf-parse')
        }

      } catch (llamaErr) {
        console.warn('[upload] LlamaParse failed:', String(llamaErr), '— falling back to pdf-parse')
        // Fall through to pdf-parse below
      }
    }

    // Fallback: pdf-parse for PDFs, plain extraction for DOCX
    if (!fullText) {
      const filename2 = file.name.toLowerCase()
      if (filename2.endsWith('.pdf')) {
        console.log('[upload] using pdf-parse fallback…')
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfParseModule = await import('pdf-parse') as any
          const pdfParse = pdfParseModule.default ?? pdfParseModule
          const buffer = Buffer.from(fileBytes)
          const result = await pdfParse(buffer)
          fullText = result.text ?? ''
          pageCount = result.numpages ?? 1
          parseMethod = 'pdf-parse'
          console.log('[upload] ✓ pdf-parse done, pages:', pageCount, 'chars:', fullText.length)
        } catch (pdfErr) {
          console.error('[upload] pdf-parse also failed:', pdfErr)
          throw new Error(`All parsers failed for ${file.name}: ${pdfErr}`)
        }
      } else if (filename2.endsWith('.docx')) {
        // DOCX: read raw text between XML tags (very basic — no images)
        const text = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes)
        fullText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        parseMethod = 'docx-raw'
        console.log('[upload] ✓ docx raw extraction, chars:', fullText.length)
      } else {
        // Unknown type — try reading as text
        fullText = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes)
        parseMethod = 'raw-text'
      }
    }

  } catch (parseErr) {
    console.error('[upload] ✗ all parsing failed:', parseErr)
    await supabase.from('documents').update({
      status: 'error',
      error_message: `Parsing failed: ${String(parseErr).slice(0, 500)}`,
    }).eq('id', documentId)
    return NextResponse.json({
      error: `Document parsing failed: ${String(parseErr).slice(0, 300)}`,
      documentId,
    }, { status: 500 })
  }

  if (!fullText?.trim()) {
    console.warn('[upload] ⚠ empty text after parsing')
    await supabase.from('documents').update({
      status: 'error',
      error_message: 'No text extracted from document',
    }).eq('id', documentId)
    return NextResponse.json({
      error: 'No text could be extracted from this document. Try a different format.',
      documentId,
    }, { status: 422 })
  }

  console.log('[upload] parse method:', parseMethod, '| text length:', fullText.length)

  // ── 6. Chunk text (~2 000 chars, 200-char overlap) ─────────────────────
  const CHUNK_SIZE = 2000
  const CHUNK_OVERLAP = 200
  const rawChunks: string[] = []
  let start = 0
  while (start < fullText.length) {
    rawChunks.push(fullText.slice(start, start + CHUNK_SIZE).trim())
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  const chunks = rawChunks.filter(c => c.length > 50)  // skip near-empty chunks
  console.log('[upload] ✓ chunked into', chunks.length, 'chunks')

  // ── 7. Embed chunks via OpenAI ─────────────────────────────────────────
  const BATCH = 20
  const allEmbeddings: number[][] = []
  console.log('[upload] embedding', chunks.length, 'chunks in batches of', BATCH)

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
      const errText = await embRes.text()
      console.error('[upload] ✗ OpenAI embedding failed:', embRes.status, errText)
      await supabase.from('documents').update({
        status: 'error',
        error_message: `Embedding failed (batch ${i / BATCH}): ${errText.slice(0, 200)}`,
      }).eq('id', documentId)
      return NextResponse.json({ error: `Embedding failed: ${errText.slice(0, 200)}` }, { status: 500 })
    }

    const embJson = await embRes.json() as { data: { embedding: number[] }[] }
    allEmbeddings.push(...embJson.data.map(d => d.embedding))
    console.log('[upload] embedded batch', Math.floor(i / BATCH) + 1, '— total so far:', allEmbeddings.length)
  }

  // ── 8. Insert document_chunks ──────────────────────────────────────────
  const chunkRows = chunks.map((text, i) => ({
    document_id: documentId,
    firm_id: firmId,
    content: text,
    chunk_index: i,
    page_number: Math.max(1, Math.floor((i / Math.max(1, chunks.length)) * pageCount) + 1),
    embedding: allEmbeddings[i],  // pgvector accepts array directly
  }))

  for (let i = 0; i < chunkRows.length; i += 100) {
    const { error: chunkErr } = await supabase.from('document_chunks').insert(chunkRows.slice(i, i + 100))
    if (chunkErr) {
      console.error('[upload] ✗ chunk insert failed:', chunkErr.message)
      await supabase.from('documents').update({
        status: 'error',
        error_message: `Chunk insert failed: ${chunkErr.message}`,
      }).eq('id', documentId)
      return NextResponse.json({ error: `Chunk insert failed: ${chunkErr.message}` }, { status: 500 })
    }
  }

  // ── 9. Mark indexed ────────────────────────────────────────────────────
  await supabase.from('documents').update({
    status: 'indexed',
    page_count: pageCount,
    metadata: { parseMethod, chunkCount: chunks.length },
  }).eq('id', documentId)

  console.log('[upload] ✓ complete — document', documentId, '| chunks:', chunks.length, '| pages:', pageCount)

  return NextResponse.json({
    id: documentId,
    chunks: chunks.length,
    pages: pageCount,
    parseMethod,
  })
}
