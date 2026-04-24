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

export default function TermsPage() {
  return (
    <div style={{ fontFamily: 'DM Sans, system-ui, sans-serif', color: '#0F0F0E', background: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
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
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '44px', fontWeight: 400, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '12px', fontStyle: 'italic' }}>Terms of Service</h1>
          <p style={{ fontSize: '14px', color: '#9A9A96' }}>Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using Draftiro (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy. If you do not agree to these Terms, do not use the Service.</p>
          <p style={{ marginTop: '12px' }}>These Terms apply to all users, including attorneys, paralegals, and any other individuals who access the Service. By creating an account, you represent that you are at least 18 years old and have the legal authority to enter into a binding agreement.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>Draftiro is an AI-powered legal research and document drafting tool designed for solo attorneys and small law practices. The Service includes:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Document upload, parsing, and AI-powered question-and-answer</li>
            <li>AI legal research assistance (not a substitute for independent professional judgment)</li>
            <li>Draft document generation and editing</li>
            <li>Case and client management tools</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            <strong>Important:</strong> Draftiro is not a law firm and does not provide legal advice. AI-generated content is provided for research and drafting assistance only. You, as a licensed attorney, are solely responsible for reviewing, verifying, and taking professional responsibility for any work product generated or assisted by Draftiro.
          </p>
        </Section>

        <Section title="3. Account Registration & Security">
          <p>You must provide accurate, current, and complete information when registering for an account. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account.</p>
          <p style={{ marginTop: '12px' }}>You agree to notify us immediately at <a href="mailto:security@draftiro.com" style={{ color: '#1A4FBF' }}>security@draftiro.com</a> of any unauthorized use of your account. We will not be liable for any loss or damage arising from your failure to protect your account credentials.</p>
        </Section>

        <Section title="4. Subscription & Billing">
          <p><strong>Free Trial:</strong> New accounts receive a 14-day free trial with full access to the Service. No credit card is required during the trial period.</p>
          <p style={{ marginTop: '12px' }}><strong>Paid Subscriptions:</strong> After your trial expires, continued use requires a paid subscription. Subscriptions are billed monthly or annually in advance. Prices are listed on our pricing page and may change upon 30 days&apos; notice.</p>
          <p style={{ marginTop: '12px' }}><strong>Auto-Renewal:</strong> Subscriptions automatically renew at the end of each billing period unless canceled before the renewal date.</p>
          <p style={{ marginTop: '12px' }}><strong>Refunds:</strong> We do not offer refunds for paid subscription periods. You may cancel at any time, and access will continue until the end of the current billing period. Exceptions may be made at our sole discretion for extenuating circumstances.</p>
          <p style={{ marginTop: '12px' }}><strong>Taxes:</strong> Prices are exclusive of applicable taxes. You are responsible for any sales tax, VAT, or similar taxes applicable to your jurisdiction.</p>
        </Section>

        <Section title="5. Acceptable Use Policy">
          <p>You agree not to use the Service to:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Violate any applicable law, regulation, or professional ethics rules</li>
            <li>Upload documents you do not have the legal right to process</li>
            <li>Attempt to circumvent security measures or access systems without authorization</li>
            <li>Reverse engineer, decompile, or extract proprietary AI models or algorithms</li>
            <li>Resell, sublicense, or commercially exploit the Service without written consent</li>
            <li>Upload content that is illegal, harmful, or violates third-party rights</li>
            <li>Use the Service to assist in unauthorized practice of law</li>
          </ul>
          <p style={{ marginTop: '12px' }}>Violation of this policy may result in immediate account suspension or termination.</p>
        </Section>

        <Section title="6. Intellectual Property">
          <p><strong>Your Content:</strong> You retain all intellectual property rights in the documents, data, and other content you upload to the Service (&quot;Your Content&quot;). By uploading Your Content, you grant Draftiro a limited, non-exclusive license to process, store, and analyze it solely to provide the Service to you.</p>
          <p style={{ marginTop: '12px' }}><strong>Our Platform:</strong> Draftiro retains all rights in the platform, software, AI models, and generated interfaces. Nothing in these Terms transfers ownership of our intellectual property to you.</p>
          <p style={{ marginTop: '12px' }}><strong>AI-Generated Content:</strong> Outputs generated by our AI system are provided to you as tools to assist your work. You take full professional responsibility for any AI-generated content you review, edit, and use in your practice.</p>
        </Section>

        <Section title="7. AI Disclaimer">
          <p>The artificial intelligence features of Draftiro are provided &quot;as is&quot; for research and drafting assistance only. AI outputs:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>May contain errors, hallucinations, or outdated information</li>
            <li>Do not constitute legal advice</li>
            <li>Must be independently verified before reliance</li>
            <li>May not reflect the most current case law, statutes, or regulations</li>
          </ul>
          <p style={{ marginTop: '12px' }}>Always exercise independent professional judgment. Draftiro is not responsible for any professional or legal consequences arising from reliance on AI-generated content.</p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, DRAFTIRO AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.</p>
          <p style={{ marginTop: '12px' }}>Our total liability to you for any claim arising from your use of the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim.</p>
        </Section>

        <Section title="9. Indemnification">
          <p>You agree to indemnify and hold harmless Draftiro and its affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from: (a) your use of the Service; (b) Your Content; (c) your violation of these Terms; or (d) your violation of any rights of a third party.</p>
        </Section>

        <Section title="10. Termination">
          <p>We may suspend or terminate your account at any time for violation of these Terms, non-payment, or any other reason at our sole discretion. Upon termination, your right to access the Service ceases immediately. We will retain your data for 90 days following termination, after which it may be permanently deleted.</p>
          <p style={{ marginTop: '12px' }}>You may cancel your subscription at any time via the Billing page. Cancellation takes effect at the end of your current billing period.</p>
        </Section>

        <Section title="11. Governing Law">
          <p>These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in Delaware.</p>
        </Section>

        <Section title="12. Changes to Terms">
          <p>We may update these Terms from time to time. We will notify you of material changes via email or in-app notice at least 14 days before they take effect. Your continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section title="13. Contact">
          <p>For questions about these Terms, contact us at:</p>
          <p style={{ marginTop: '12px' }}><strong>Draftiro Legal</strong><br />Email: <a href="mailto:legal@draftiro.com" style={{ color: '#1A4FBF' }}>legal@draftiro.com</a></p>
        </Section>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '32px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ fontSize: '13px', color: '#1A4FBF', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>
          <Link href="/cancellation" style={{ fontSize: '13px', color: '#1A4FBF', textDecoration: 'none', fontWeight: 600 }}>Cancellation Policy</Link>
          <Link href="/" style={{ fontSize: '13px', color: '#6B6B68', textDecoration: 'none' }}>← Back to Draftiro</Link>
        </div>
      </div>
    </div>
  )
}
