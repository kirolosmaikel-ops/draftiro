import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createCookieClient } from '@/lib/supabase/server'
import { checkChatLimit, maxTokensForPlan } from '@/lib/rate-limit'
import { log, logError, logWarn } from '@/lib/log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Resolve firm_id from session → document → case, in that order. */
async function resolveFirmId(
  supabase: ReturnType<typeof serviceClient>,
  sessionId?: string,
  documentId?: string,
  caseId?: string
): Promise<string | null> {
  if (sessionId) {
    const { data } = await supabase
      .from('chat_sessions')
      .select('firm_id')
      .eq('id', sessionId)
      .single()
    if (data?.firm_id) return data.firm_id
  }
  if (documentId) {
    const { data } = await supabase
      .from('documents')
      .select('firm_id')
      .eq('id', documentId)
      .single()
    if (data?.firm_id) return data.firm_id
  }
  if (caseId) {
    const { data } = await supabase
      .from('cases')
      .select('firm_id')
      .eq('id', caseId)
      .single()
    if (data?.firm_id) return data.firm_id
  }
  return null
}

export async function POST(req: Request) {
  log('[chat/stream] ▶ request received')

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

  if (!process.env.OPENAI_API_KEY) {
    logError('[chat/stream] ✗ OPENAI_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfiguration: OPENAI_API_KEY missing' }, { status: 500 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    logError('[chat/stream] ✗ ANTHROPIC_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfiguration: ANTHROPIC_API_KEY missing' }, { status: 500 })
  }

  // ── AUTH: require a logged-in user, resolve their firm_id from cookies ───
  const cookieClient = await createCookieClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = serviceClient()

  const { data: userRow } = await supabase
    .from('users')
    .select('firm_id')
    .eq('id', user.id)
    .single()
  const userFirmId: string | null = userRow?.firm_id ?? null
  if (!userFirmId) {
    return NextResponse.json({ error: 'No firm associated with user' }, { status: 403 })
  }

  // Resolve firm_id from the referenced session/document/case
  const refFirmId = await resolveFirmId(supabase, sessionId, documentId, caseId)
  log('[chat/stream] user firm:', userFirmId, '| ref firm:', refFirmId)

  // If a session/doc/case was specified, it must belong to the caller's firm
  if (refFirmId && refFirmId !== userFirmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const firmId: string = userFirmId

  // ── RATE LIMIT (plan-aware) ──────────────────────────────────────────────
  const { data: firmRow } = await supabase
    .from('firms')
    .select('stripe_plan, subscription_status')
    .eq('id', firmId)
    .single()
  const plan = firmRow?.stripe_plan as string | null | undefined
  const limitRes = checkChatLimit(firmId, plan)
  if (!limitRes.ok) {
    logWarn('[chat/stream] rate limited firm', firmId, 'retry in', limitRes.retryAfterSec, 's')
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${limitRes.retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(limitRes.retryAfterSec) } }
    )
  }

  // ── 1. Embed the question ────────────────────────────────────────────────
  log('[chat/stream] embedding question…')
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
      logError('[chat/stream] OpenAI embed failed:', embRes.status, errText)
    } else {
      const embJson = await embRes.json() as { data: [{ embedding: number[] }] }
      embedding = embJson.data[0].embedding
      log('[chat/stream] ✓ embedding done, dims:', embedding.length)
    }
  } catch (e) {
    logError('[chat/stream] OpenAI embed threw:', e)
  }

  // ── 2. Vector search ─────────────────────────────────────────────────────
  interface ChunkResult { content: string; page_number: number; document_id: string; similarity: number }
  let chunks: ChunkResult[] = []

  if (embedding && firmId) {
    try {
      const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: embedding,
        match_count: 6,
        filter_document_id: documentId ?? null,
        filter_case_id: caseId ?? null,
        filter_firm_id: firmId,
      }) as { data: ChunkResult[]; error: { message: string } | null }

      if (error) {
        logWarn('[chat/stream] vector search RPC error (non-fatal):', error.message)
      } else {
        chunks = data ?? []
        log('[chat/stream] ✓ vector search returned', chunks.length, 'chunks')
      }
    } catch (e) {
      logWarn('[chat/stream] vector search threw (non-fatal):', e)
    }
  }

  // ── 2b. Guard: document selected but zero chunks found ───────────────────
  if (documentId && chunks.length === 0) {
    const encoder0 = new TextEncoder()
    const zeroStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder0.encode(
          `data: ${JSON.stringify({ type: 'text', content: "This document hasn't been indexed yet. Please wait for processing to complete, then try again." })}\n\n`
        ))
        controller.enqueue(encoder0.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new Response(zeroStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        Connection: 'keep-alive',
      },
    })
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
  log('[chat/stream] calling Anthropic claude-3-5-sonnet…')
  const maxTokens = maxTokensForPlan(plan)

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
            max_tokens: maxTokens,
            stream: true,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
          }),
        })

        if (!anthropicRes.ok) {
          const errText = await anthropicRes.text()
          logError('[chat/stream] ✗ Anthropic returned', anthropicRes.status, ':', errText)
          send({ type: 'error', content: `AI service error (${anthropicRes.status}): ${errText.slice(0, 200)}` })
          send({ type: 'text', content: `I'm sorry, I encountered an error connecting to the AI service. Please try again.` })
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }

        log('[chat/stream] ✓ Anthropic stream started')

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

        log('[chat/stream] ✓ stream complete, chars:', fullText.length)

        // ── 5. Emit citations ──────────────────────────────────────────────
        if (chunks.length > 0) {
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
                firm_id: firmId,
                role: 'user',
                content: message,
              },
              {
                session_id: sessionId,
                firm_id: firmId,
                role: 'assistant',
                content: fullText,
                citations: chunks.slice(0, 4).map(c => ({ page: c.page_number })),
              },
            ])
            if (msgErr) logWarn('[chat/stream] message persist error (non-fatal):', msgErr.message)
            else log('[chat/stream] ✓ messages persisted')
          } catch (e) {
            logWarn('[chat/stream] message persist threw (non-fatal):', e)
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        logError('[chat/stream] ✗ unhandled error in stream:', err)
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
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}
