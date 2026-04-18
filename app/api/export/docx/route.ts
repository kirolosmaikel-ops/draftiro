import { NextResponse } from 'next/server'

/**
 * POST /api/export/docx
 * Body: { title: string, content: string (HTML) }
 * Returns a .docx file as a binary stream.
 *
 * Uses the docx npm package (installed on first call via dynamic import).
 * Install: npm install docx
 */
export async function POST(req: Request) {
  const { title, content } = await req.json() as { title: string; content: string }

  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

    // Strip HTML tags and convert to plain paragraphs
    const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const paragraphs = plainText.split(/\n+/).filter(Boolean)

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
          }),
          ...paragraphs.map(p =>
            new Paragraph({
              children: [new TextRun({ text: p, size: 24, font: 'Garamond' })],
              spacing: { after: 200 },
            })
          ),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    return new Response(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.docx"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `docx generation failed. Install: npm install docx. Error: ${err}` },
      { status: 500 }
    )
  }
}
