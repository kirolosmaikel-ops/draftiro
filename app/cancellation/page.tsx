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

export default function CancellationPage() {
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
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '44px', fontWeight: 400, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '12px', fontStyle: 'italic' }}>Cancellation & Refund Policy</h1>
          <p style={{ fontSize: '14px', color: '#9A9A96' }}>Effective date: {EFFECTIVE_DATE}</p>
        </div>

        {/* TL;DR */}
        <div style={{ background: '#F7F6F3', borderRadius: '16px', padding: '20px 24px', marginBottom: '40px', borderLeft: '4px solid #C9A84C' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Summary</div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '14px', color: '#3A3A38', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>Cancel anytime from your Billing page — no phone calls needed</li>
            <li>Access continues until your billing period ends</li>
            <li>Your data stays available for 90 days after cancellation</li>
            <li>The 14-day trial is completely free — no charges until you subscribe</li>
            <li>No refunds on paid subscription periods</li>
          </ul>
        </div>

        <Section title="1. How to Cancel">
          <p>You can cancel your Draftiro subscription at any time, entirely self-service:</p>
          <ol style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Go to <Link href="/billing" style={{ color: '#1A4FBF' }}>Billing &amp; Subscription</Link> in your account</li>
            <li>Click &quot;Manage Billing&quot;</li>
            <li>In the Stripe Customer Portal, select &quot;Cancel subscription&quot;</li>
            <li>Confirm your cancellation</li>
          </ol>
          <p style={{ marginTop: '12px' }}>Cancellation takes effect at the end of your current billing period. You will not be charged again after that date.</p>
          <p style={{ marginTop: '12px' }}>If you have trouble canceling, email <a href="mailto:support@draftiro.com" style={{ color: '#1A4FBF' }}>support@draftiro.com</a> and we will cancel it for you within one business day.</p>
        </Section>

        <Section title="2. Effect of Cancellation">
          <p>When you cancel your subscription:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>Immediate:</strong> Your subscription is scheduled to cancel. No further charges will be made.</li>
            <li><strong>Until period end:</strong> You retain full access to all features until the last day of your current billing period.</li>
            <li><strong>After period end:</strong> Your account moves to a read-only state. You can still view and export your existing data but cannot upload new documents, start new AI chats, or create new cases.</li>
          </ul>
        </Section>

        <Section title="3. Your Data After Cancellation">
          <p>We do not immediately delete your data when you cancel. Here&apos;s what happens:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>90-day grace period:</strong> Your data (cases, documents, drafts, chat history) remains accessible for 90 days after your subscription ends.</li>
            <li><strong>Export your data:</strong> During the grace period, you can download your drafts and export your data.</li>
            <li><strong>Permanent deletion:</strong> After 90 days, your data is permanently and irreversibly deleted from our systems.</li>
            <li><strong>Immediate deletion:</strong> If you would like your data deleted immediately, email <a href="mailto:privacy@draftiro.com" style={{ color: '#1A4FBF' }}>privacy@draftiro.com</a> and we will process your request within 7 business days.</li>
          </ul>
        </Section>

        <Section title="4. Free Trial">
          <p>The 14-day free trial is completely free — no credit card is required, and no charges are made during the trial.</p>
          <p style={{ marginTop: '12px' }}>If you do not subscribe before your trial expires, your account simply becomes inactive. You can reactivate at any time by subscribing. Your data is retained during inactivity for 90 days after trial expiration.</p>
        </Section>

        <Section title="5. Refund Policy">
          <p><strong>No refunds on paid subscription periods.</strong> When you subscribe, you pay for access to the Service for a defined period. We do not offer prorated refunds for unused portions of subscription periods.</p>
          <p style={{ marginTop: '12px' }}>However, we may issue refunds at our sole discretion in exceptional circumstances, such as:</p>
          <ul style={{ margin: '12px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Accidental duplicate charges</li>
            <li>Documented technical outages that materially prevented use for an extended period</li>
            <li>Other extraordinary circumstances reviewed on a case-by-case basis</li>
          </ul>
          <p style={{ marginTop: '12px' }}>To request a refund, email <a href="mailto:billing@draftiro.com" style={{ color: '#1A4FBF' }}>billing@draftiro.com</a> within 14 days of the charge, with your account email and a description of the issue.</p>
        </Section>

        <Section title="6. Reactivation">
          <p>If you&apos;ve canceled, you can reactivate your subscription at any time by visiting <Link href="/pricing" style={{ color: '#1A4FBF' }}>our pricing page</Link> and choosing a plan.</p>
          <p style={{ marginTop: '12px' }}>If your account data is still within the 90-day grace period, it will be fully restored upon reactivation. After 90 days, reactivated accounts start fresh with no historical data.</p>
        </Section>

        <Section title="7. Plan Changes">
          <p><strong>Upgrading:</strong> Plan upgrades take effect immediately. You will be charged a prorated amount for the remainder of your current billing period at the new plan rate.</p>
          <p style={{ marginTop: '12px' }}><strong>Downgrading:</strong> Plan downgrades take effect at the start of your next billing period. No refund is issued for the difference in the current period.</p>
        </Section>

        <Section title="8. Contact">
          <p>For billing questions or cancellation assistance:</p>
          <p style={{ marginTop: '12px' }}>
            <strong>Email:</strong> <a href="mailto:support@draftiro.com" style={{ color: '#1A4FBF' }}>support@draftiro.com</a><br />
            <strong>Billing:</strong> <a href="mailto:billing@draftiro.com" style={{ color: '#1A4FBF' }}>billing@draftiro.com</a><br />
            We respond within one business day.
          </p>
        </Section>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '32px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ fontSize: '13px', color: '#1A4FBF', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>
          <Link href="/privacy" style={{ fontSize: '13px', color: '#1A4FBF', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>
          <Link href="/" style={{ fontSize: '13px', color: '#6B6B68', textDecoration: 'none' }}>← Back to Draftiro</Link>
        </div>
      </div>
    </div>
  )
}
