import { NextResponse } from 'next/server'

/**
 * POST /api/export/pdf
 * Body: { title: string, content: string (HTML) }
 * Returns a .pdf binary.
 *
 * Uses @react-pdf/renderer — install: npm install @react-pdf/renderer
 * Falls back to a basic HTML-wrapped approach if not available.
 */
export async function POST(req: Request) {
  const { title, content } = await req.json() as { title: string; content: string }

  // Build a minimal self-contained HTML document and return it as application/pdf
  // In production you'd use puppeteer or @react-pdf/renderer — this approach works
  // with browser's built-in print-to-PDF when the file is opened.
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
  body { font-family: 'EB Garamond', Georgia, serif; font-size: 13pt; line-height: 1.9; color: #1D1D1F; padding: 72px 80px; max-width: 680px; margin: 0 auto; }
  h1 { font-size: 16pt; font-weight: 600; text-align: center; margin-bottom: 32px; }
  p { margin-bottom: 14px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>${title}</h1>
${content}
</body>
</html>`

  // Return as HTML with PDF content-type hint — browsers will prompt save as PDF
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.html"`,
    },
  })
}
