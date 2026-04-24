import Link from 'next/link'

const EFFECTIVE_DATE = 'April 24, 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '22px', fontWeight: 600, color: '#0F0F0E', letterSpacing: '-0.3px', marginBottom: '14px', marginTop: 0 }}>{title}</h2>
      <div style={{ fontSize: '15px', color: '#3A3A38', lineHeight: 1.75 }}>{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: 'DM Sans, system-ui, sans-serif', color: '#0F0F0E', background: '#fff', minHeight: '100vh' }}>
      <nav style={{ height: '56px', background: 'rgba(255,255,255,0.95)', borderBottom: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', padding: '0 48px', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginRight: 'auto' }}>
          <div style={{ width: '28px', height: '28px', background: '#C9A84C', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '14px' }}>D</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '17px', fontWeight: 600, color: '#0F0F0E' }}>Draftiro</span>
        </Link>
        <Link href="/login" style={{ fontSize: '13px', fontWeight: 600, color: '#1A4FBF', textDecoration: 'none' }}>Sign in →</Link>
      </nav>

      <div style={{ maxWidth: '740px', margin: '0 auto', padding: '64px 48px 96px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#8B6914', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Legal</div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '44px', fontWeight: 400, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '12px', fontStyle: 'italic' }}>Privacy Policy</h1>
          <p style={{ fontSize: '14px', color: '#9A9A96' }}>Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <p style={{ fontSize: '15px', color: '#3A3A38', lineHeight: 1.75, marginBottom: '40px', padding: '18px 22px', background: '#F7F6F3', borderRadius: '14px', borderLeft: '4px solid #C9A84C' }}>
          Your privacy matters. This policy explains what data we collect, why we collect it, and how we protect it. Draftiro does not sell your data and never will.
        </p>

        <Section title="1. Data We Collect">
          <p><strong>Account Information:</strong> When you register, we collect your email address and any profile information you provide.</p>
          <p style={{ marginTop: '12px' }}><strong>Documents & Case Files:</strong> When you upload documents, we store the file content and extract text for AI processing. We store these files in encrypted form in Supabase.</p>
          <p style={{ marginTop: '12px' }}><strong>Usage Data:</strong> We collect information about how you use the Service, including pages visited, features used, and timestamps. This helps us improve the product.</p>
          <p style={{ marginTop: '12px' }}><strong>Payment Information:</strong> Payment details (credit card numbers, etc.) are processed and stored by Stripe. We never see or store your raw payment card data.</p>
          <p style={{ marginTop: '12px' }}><strong>AI Interactions:</strong> We log AI chat messages and responses to provide the Service, improve quality, and debug issues. Chat content is stored in our database, scoped to your firm.</p>
        </Section>

        <Section title="2. How We Use Your Data">
          <p>We use your data exclusively to:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Provide and maintain the Service</li>
            <li>Process your documents through AI models (OpenAI embeddings, Anthropic Claude)</li>
            <li>Enable AI-powered search and document Q&amp;A</li>
            <li>Process billing and subscriptions via Stripe</li>
            <li>Send transactional emails (account confirmations, billing receipts)</li>
            <li>Debug, monitor, and improve the Service</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p style={{ marginTop: '12px' }}>We do not use your data for advertising, and we do not sell, rent, or share your data with third parties for marketing purposes.</p>
        </Section>

        <Section title="3. Third-Party Services">
          <p>We use the following trusted third parties to operate the Service. Each has their own privacy policy:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>Supabase</strong> — Database, authentication, and file storage. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#1A4FBF' }}>Privacy Policy</a></li>
            <li><strong>OpenAI</strong> — Document embedding (text-embedding-3-small). Your document text is sent to OpenAI&apos;s API for vectorization. <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#1A4FBF' }}>Privacy Policy</a></li>
            <li><strong>Anthropic</strong> — AI chat and legal research (Claude 3.5 Sonnet). Your queries and document excerpts are sent to Anthropic&apos;s API. <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#1A4FBF' }}>Privacy Policy</a></li>
            <li><strong>Stripe</strong> — Payment processing and billing. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#1A4FBF' }}>Privacy Policy</a></li>
            <li><strong>Vercel</strong> — Hosting and infrastructure. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#1A4FBF' }}>Privacy Policy</a></li>
          </ul>
        </Section>

        <Section title="4. Data Retention">
          <p><strong>Active accounts:</strong> Data is retained for the life of your account plus 90 days after cancellation.</p>
          <p style={{ marginTop: '12px' }}><strong>Documents:</strong> Uploaded documents and their AI embeddings are retained until you delete them or your account is deleted.</p>
          <p style={{ marginTop: '12px' }}><strong>Chat history:</strong> Retained for the life of your account.</p>
          <p style={{ marginTop: '12px' }}><strong>Deleted data:</strong> When you delete documents or close your account, we begin the deletion process within 30 days. Backups may retain deleted data for up to an additional 90 days.</p>
        </Section>

        <Section title="5. Your Rights">
          <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Portability:</strong> Request an export of your data in a machine-readable format</li>
            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
            <li><strong>Opt-out:</strong> Opt out of non-essential communications</li>
          </ul>
          <p style={{ marginTop: '12px' }}>To exercise these rights, email <a href="mailto:privacy@draftiro.com" style={{ color: '#1A4FBF' }}>privacy@draftiro.com</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="6. Cookies">
          <p>Draftiro uses only essential cookies required to maintain your session and authentication. We do not use tracking cookies, advertising cookies, or third-party analytics that track you across websites.</p>
          <p style={{ marginTop: '12px' }}>Session cookies are deleted when you sign out or when they expire (typically 7 days). You can delete cookies through your browser settings, but this will sign you out of the Service.</p>
        </Section>

        <Section title="7. Data Security">
          <p>We implement industry-standard security measures including:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Encryption at rest and in transit (TLS 1.3)</li>
            <li>Row-level security on all database tables</li>
            <li>Principle of least privilege for internal data access</li>
            <li>Regular security reviews</li>
          </ul>
          <p style={{ marginTop: '12px' }}>Despite these measures, no system is perfectly secure. We cannot guarantee absolute security of your data transmitted over the internet.</p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>The Service is not directed to children under 18. We do not knowingly collect personal information from anyone under 18. If you believe we have inadvertently collected information from a minor, please contact us immediately at <a href="mailto:privacy@draftiro.com" style={{ color: '#1A4FBF' }}>privacy@draftiro.com</a>.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email at least 14 days before they take effect. Your continued use of the Service after changes take effect constitutes acceptance.</p>
        </Section>

        <Section title="10. Contact">
          <p><strong>Draftiro Privacy Team</strong><br />Email: <a href="mailto:privacy@draftiro.com" style={{ color: '#1A4FBF' }}>privacy@draftiro.com</a></p>
        </Section>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '32px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ fontSize: '13px', color: '#1A4FBF', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>
          <Link href="/cancellation" style={{ fontSize: '13px', color: '#1A4FBF', textDecoration: 'none', fontWeight: 600 }}>Cancellation Policy</Link>
          <Link href="/" style={{ fontSize: '13px', color: '#6B6B68', textDecoration: 'none' }}>← Back to Draftiro</Link>
        </div>
      </div>
    </div>
  )
}
