import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * POST /api/chat/stream
 * Body: { message, sessionId?, documentId?, caseId? }
 *
 * Flow:
 *  1. Embed the user question via OpenAI text-embedding-3-small
 *  2. Vector-search document_chunks for top-k relevant passages (pgvector)
 *  3. Build a grounded system prompt with the retrieved chunks
 *  4. Stream Anthropic Claude response as SSE
 *  5. Emit citations after the stream ends
 *  6. Persist messages to chat_messages
 *
 * Runtime: Node.js (NOT edge) — @supabase/supabase-js requires Node.js APIs.
 * maxDuration: 60 s — Vercel Pro allows up to 300 s; 60 s covers most chats.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  console.log('[chat/stream] ▶ request received')

  let body: { message: string; sessionId?: string; documentId?: string; caseId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, sessionId, documentId, caseId } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // Validate env vars early — surface clear errors in Vercel logs
  if (!process.env.OPENAI_API_KEY) {
    console.error('[chat/stream] ✗ OPENAI_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfiguration: OPENAI_API_KEY missing' }, { status: 500 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[chat/stream] ✗ ANTHROPIC_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfiguration: ANTHROPIC_API_KEY missing' }, { status: 500 })
  }

  const supabase = serviceClient()

  // ── 1. Embed the question ────────────────────────────────────────────────
  console.log('[chat/stream] embedding question…')
  let embedding: number[] | null = null
  try {
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: message }),
    })
    if (!embRes.ok) {
      const errText = await embRes.text()
      console.error('[chat/stream] OpenAI embed failed:', embRes.status, errText)
    } else {
      const embJson = await embRes.json() as { data: [{ embedding: number[] }] }
      embedding = embJson.data[0].embedding
      console.log('[chat/stream] ✓ embedding done, dims:', embedding.length)
    }
  } catch (e) {
    console.error('[chat/stream] OpenAI embed threw:', e)
  }

  // ── 2. Vector search ─────────────────────────────────────────────────────
  interface ChunkResult { content: string; page_number: number; document_id: string; similarity: number }
  let chunks: ChunkResult[] = []

  if (embedding) {
    try {
      const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: embedding,
        match_count: 6,
        filter_document_id: documentId ?? null,
        filter_case_id: caseId ?? null,
      }) as { data: ChunkResult[]; error: { message: string } | null }

      if (error) {
        console.warn('[chat/stream] vector search RPC error (non-fatal):', error.message)
      } else {
        chunks = data ?? []
        console.log('[chat/stream] ✓ vector search returned', chunks.length, 'chunks')
      }
    } catch (e) {
      console.warn('[chat/stream] vector search threw (non-fatal):', e)
    }
  }

  // ── 3. Build system prompt ───────────────────────────────────────────────
  const contextBlock = chunks.length > 0
    ? chunks.map((c, i) => `[Source ${i + 1} — Page ${c.page_number}]\n${c.content}`).join('\n\n---\n\n')
    : 'No document context available. Answer from general legal knowledge but note that no case documents were found.'

  const systemPrompt = `You are an expert AI legal research assistant for a solo law practice.
Your answers are grounded in the provided document excerpts below.
When answering, cite specific [Source N] and page numbers where relevant.
If the information is not in the provided excerpts, say so clearly.
Be precise, concise, and professional.

DOCUMENT EXCERPTS:
${contextBlock}`

  // ── 4. Stream from Anthropic ─────────────────────────────────────────────
  console.log('[chat/stream] calling Anthropic claude-3-5-sonnet…')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            stream: true,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
          }),
        })

        if (!anthropicRes.ok) {
          const errText = await anthropicRes.text()
          console.error('[chat/stream] ✗ Anthropic returned', anthropicRes.status, ':', errText)
          send({ type: 'error', content: `AI service error (${anthropicRes.status}): ${errText.slice(0, 200)}` })
          send({ type: 'text', content: `I'm sorry, I encountered an error connecting to the AI service. Please try again.` })
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }

        console.log('[chat/stream] ✓ Anthropic stream started')

        const reader = anthropicRes.body!.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const raw = decoder.decode(value, { stream: true })
          for (const line of raw.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const parsed = JSON.parse(payload) as {
                type: string
                delta?: { type: string; text?: string }
              }
              if (
                parsed.type === 'content_block_delta' &&
                parsed.delta?.type === 'text_delta' &&
                parsed.delta.text
              ) {
                fullText += parsed.delta.text
                send({ type: 'text', content: parsed.delta.text })
              }
            } catch { /* partial SSE chunk — skip */ }
          }
        }

        console.log('[chat/stream] ✓ stream complete, chars:', fullText.length)

        // ── 5. Emit citations ──────────────────────────────────────────────
        if (chunks.length > 0) {
          // Emit all top chunks as citations (even if not explicitly cited by name)
          const citations = chunks.slice(0, 4).map(c => ({
            page: c.page_number,
            text: c.content.slice(0, 140).trim() + '…',
          }))
          send({ type: 'citations', citations })
        }

        // ── 6. Persist messages ────────────────────────────────────────────
        if (sessionId) {
          try {
            const { error: msgErr } = await supabase.from('chat_messages').insert([
              {
                session_id: sessionId,
                firm_id: null,  // will be resolved by DB trigger or next RLS pass
                role: 'user',
                content: message,
              },
              {
                session_id: sessionId,
                firm_id: null,
                role: 'assistant',
                content: fullText,
                citations: chunks.slice(0, 4).map(c => ({ page: c.page_number })),
              },
            ])
            if (msgErr) console.warn('[chat/stream] message persist error (non-fatal):', msgErr.message)
          } catch (e) {
            console.warn('[chat/stream] message persist threw (non-fatal):', e)
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        console.error('[chat/stream] ✗ unhandled error in stream:', err)
        send({ type: 'text', content: `An unexpected error occurred: ${String(err).slice(0, 200)}` })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',   // disable Nginx/proxy buffering
      Connection: 'keep-alive',
    },
  })
}
