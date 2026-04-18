import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/chat/stream
 * Body: { message, sessionId, documentId?, caseId? }
 *
 * Flow:
 *  1. Embed the user's question
 *  2. Vector-search document_chunks for top-k relevant passages
 *  3. Build a grounded prompt and stream Anthropic Claude response
 *  4. Emit SSE: data: {"type":"text","content":"..."} and data: {"type":"citations","citations":[...]}
 *  5. Persist user + assistant messages to chat_messages
 */
export const runtime = 'edge'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const body = await req.json() as { message: string; sessionId?: string; documentId?: string; caseId?: string }
  const { message, sessionId, documentId, caseId } = body

  if (!message) return new Response('Missing message', { status: 400 })

  const supabase = serviceClient()

  // ── 1. Embed the question ────────────────────────────────────────────────
  const embRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: message }),
  })
  const embJson = await embRes.json() as { data: [{ embedding: number[] }] }
  const embedding = embJson.data[0].embedding

  // ── 2. Vector search ─────────────────────────────────────────────────────
  interface ChunkResult { content: string; page_number: number; document_id: string; similarity: number }
  let chunks: ChunkResult[] = []

  try {
    const { data } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_count: 6,
      filter_document_id: documentId ?? null,
      filter_case_id: caseId ?? null,
    }) as { data: ChunkResult[] }
    chunks = data ?? []
  } catch {
    // RPC may not exist yet — proceed without RAG context
  }

  // ── 3. Build system prompt ───────────────────────────────────────────────
  const contextBlock = chunks.length > 0
    ? chunks.map((c, i) => `[Source ${i + 1} — Page ${c.page_number}]\n${c.content}`).join('\n\n---\n\n')
    : 'No document context available.'

  const systemPrompt = `You are an expert AI legal research assistant for a solo law practice.
Your answers are grounded ONLY in the provided document excerpts below.
When answering, always cite the specific [Source N] and page number.
If the information is not in the provided excerpts, say so clearly.
Be precise, concise, and professional.

DOCUMENT EXCERPTS:
${contextBlock}`

  // ── 4. Stream from Anthropic ─────────────────────────────────────────────
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
          send({ type: 'text', content: `Error from AI: ${errText}` })
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }

        const reader = anthropicRes.body!.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const raw = decoder.decode(value, { stream: true })
          for (const line of raw.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6)
            if (payload === '[DONE]') continue
            try {
              const parsed = JSON.parse(payload) as { type: string; delta?: { type: string; text?: string } }
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta' && parsed.delta.text) {
                fullText += parsed.delta.text
                send({ type: 'text', content: parsed.delta.text })
              }
            } catch { /* partial */ }
          }
        }

        // Emit citations
        if (chunks.length > 0) {
          const usedCitations = chunks
            .filter((_, i) => fullText.includes(`[Source ${i + 1}]`))
            .map(c => ({ page: c.page_number, text: c.content.slice(0, 120) + '…' }))
          if (usedCitations.length > 0) {
            send({ type: 'citations', citations: usedCitations })
          }
        }

        // Persist messages to DB
        if (sessionId) {
          try {
            await supabase.from('chat_messages').insert([
              { session_id: sessionId, firm_id: null, role: 'user', content: message },
              { session_id: sessionId, firm_id: null, role: 'assistant', content: fullText, citations: chunks.slice(0, 3).map(c => ({ page: c.page_number })) },
            ])
          } catch { /* non-fatal */ }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        send({ type: 'text', content: `Unexpected error: ${err}` })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
