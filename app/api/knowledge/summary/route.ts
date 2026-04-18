import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/knowledge/summary
 * Body: { clientId }
 * Returns an AI-generated summary of all documents for this client.
 */
export async function POST(req: Request) {
  const { clientId } = await req.json() as { clientId: string }
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch up to 20 of the most relevant chunks for this client's documents
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('content, page_number, documents!inner(client_id, name)')
    .eq('documents.client_id', clientId)
    .order('chunk_index')
    .limit(20)

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ summary: 'No documents have been indexed for this client yet. Upload and index documents to generate a summary.' })
  }

  const contextText = chunks
    .map(c => c.content)
    .join('\n\n')
    .slice(0, 8000) // keep under context limit

  const prompt = `You are an expert legal AI assistant. Based on the following document excerpts for a client, provide a concise professional case summary in 3–5 bullet points. Focus on: key facts, legal issues, risks, and recommended actions.

DOCUMENT EXCERPTS:
${contextText}

Respond with a bullet-point summary only. Be direct and professional.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: `AI request failed: ${res.status}` }, { status: 500 })
  }

  const json = await res.json() as { content: [{ text: string }] }
  const summary = json.content[0]?.text ?? 'Could not generate summary.'

  return NextResponse.json({ summary })
}
