import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'DM Sans, system-ui, sans-serif', color: '#0F0F0E', background: '#fff' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: '56px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 40px', gap: '32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: 'auto' }}>
          <div style={{
            width: '28px', height: '28px', background: '#C9A84C', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '14px',
          }}>D</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '17px', fontWeight: 600, letterSpacing: '-0.3px' }}>Draftiro</span>
        </div>
        <a href="#features" style={{ fontSize: '13.5px', color: '#6B6B68', textDecoration: 'none', fontWeight: 500 }}>Features</a>
        <a href="#how-it-works" style={{ fontSize: '13.5px', color: '#6B6B68', textDecoration: 'none', fontWeight: 500 }}>How it works</a>
        <Link href="/pricing" style={{ fontSize: '13.5px', color: '#6B6B68', textDecoration: 'none', fontWeight: 500 }}>Pricing</Link>
        <Link href="/login" style={{
          height: '34px', background: '#0F0F0E', color: '#fff', borderRadius: '10px',
          padding: '0 16px', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center',
        }}>Sign in</Link>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: '#141412', color: '#fff',
        padding: '100px 40px 120px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div style={{ position: 'relative', maxWidth: '820px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '99px', padding: '5px 14px', marginBottom: '32px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#C9A84C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI-Powered Legal Workspace</span>
          </div>
          <h1 style={{
            fontFamily: 'Newsreader, serif', fontSize: 'clamp(40px, 7vw, 68px)',
            fontWeight: 400, lineHeight: 1.1, letterSpacing: '-2px',
            color: '#fff', marginBottom: '24px', fontStyle: 'italic',
          }}>
            The smartest workspace<br />for the solo attorney.
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: '40px', maxWidth: '540px', margin: '0 auto 40px' }}>
            Upload case files. Chat with your documents. Draft briefs in minutes — not hours.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/pricing" style={{
              height: '52px', background: '#C9A84C', color: '#0F0F0E', borderRadius: '12px',
              padding: '0 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
            }}>
              Start Free Trial
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            </Link>
            <a href="#how-it-works" style={{
              height: '52px', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '12px',
              padding: '0 24px', fontSize: '15px', fontWeight: 500, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.12)',
            }}>
              See how it works
            </a>
          </div>

          {/* Social proof */}
          <div style={{
            marginTop: '36px',
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '99px',
            fontSize: '12.5px',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            <span style={{ color: '#C9A84C', fontSize: '13px', letterSpacing: '0.5px' }}>★★★★★</span>
            Built with feedback from 30+ solo attorneys
          </div>
        </div>

        {/* Stats */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: '64px', marginTop: '80px', flexWrap: 'wrap' }}>
          {[
            { num: '40%', label: 'Less research time' },
            { num: '38', label: 'States covered' },
            { num: 'SOC2', label: 'Type II certified' },
            { num: '< 2 min', label: 'Per document upload' },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: '32px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>{num}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '6px' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '96px 40px', background: '#F7F6F3' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '12px' }}>What Draftiro does</div>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '40px', fontWeight: 400, letterSpacing: '-1px', color: '#0F0F0E', lineHeight: 1.2 }}>
              Everything a solo attorney needs.<br />Nothing they don&apos;t.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                ),
                title: 'Document Chat',
                desc: 'Upload any PDF, DOCX, or text file. Ask questions in plain English. Get cited, grounded answers instantly.',
                tag: 'RAG-powered',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A4FBF" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                ),
                title: 'AI Legal Research',
                desc: 'Ask about case law, statutes, and procedures. Claude 3.5 Sonnet cites every claim so you can verify.',
                tag: 'Claude 3.5',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A7A4A" strokeWidth="1.5">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
                  </svg>
                ),
                title: 'Draft Assistant',
                desc: 'Start from a blank canvas or let AI draft your brief. Accept AI suggestions clause by clause.',
                tag: 'Auto-save',
              },
            ].map(({ icon, title, desc, tag }) => (
              <div key={title} style={{
                background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '16px',
                padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ width: '44px', height: '44px', background: '#F7F6F3', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                  {icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: 600, color: '#0F0F0E', letterSpacing: '-0.3px' }}>{title}</h3>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: '#F5EDD8', color: '#8B6914', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tag}</span>
                </div>
                <p style={{ fontSize: '14px', color: '#6B6B68', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding: '96px 40px', background: '#fff' }}>
        <div style={{ maxWidth: '740px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '12px' }}>Simple workflow</div>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '40px', fontWeight: 400, letterSpacing: '-1px', color: '#0F0F0E', lineHeight: 1.2 }}>
              From upload to draft in minutes.
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { step: '01', title: 'Upload your case files', desc: 'Drop in PDFs, DOCX, or text files. We parse, chunk, and embed them automatically.' },
              { step: '02', title: 'Chat with your documents', desc: 'Ask any question. Get answers grounded in your specific case files, with page citations.' },
              { step: '03', title: 'Draft with AI assistance', desc: 'Open the editor. Let AI suggest clauses, pull citations, and generate first drafts.' },
              { step: '04', title: 'Export and file', desc: 'Download as .docx or PDF. Ready for court.' },
            ].map(({ step, title, desc }, i) => (
              <div key={step} style={{ display: 'flex', gap: '28px', padding: '32px 0', borderBottom: i < 3 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: '13px', fontWeight: 700, color: '#C9A84C', letterSpacing: '0.06em', flexShrink: 0, paddingTop: '3px' }}>{step}</div>
                <div>
                  <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: 600, color: '#0F0F0E', letterSpacing: '-0.3px', marginBottom: '8px' }}>{title}</h3>
                  <p style={{ fontSize: '14px', color: '#6B6B68', lineHeight: 1.65 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: '96px 40px', background: '#F7F6F3' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '12px' }}>Pricing</div>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '40px', fontWeight: 400, letterSpacing: '-1px', color: '#0F0F0E', lineHeight: 1.2, marginBottom: '16px' }}>
            Free to start. Serious plans for serious practices.
          </h2>
          <p style={{ fontSize: '14px', color: '#6B6B68', lineHeight: 1.65, marginBottom: '40px' }}>
            Start with a 14-day free trial. No credit card required.
          </p>
          <Link href="/pricing" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            height: '52px', background: '#0F0F0E', color: '#fff', borderRadius: '12px',
            padding: '0 28px', fontSize: '15px', fontWeight: 600, textDecoration: 'none',
          }}>
            Start Free Trial — No credit card
          </Link>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ background: '#141412', padding: '80px 40px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '44px', fontWeight: 400, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: '24px', fontStyle: 'italic' }}>
          Ready to work smarter?
        </h2>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginBottom: '36px' }}>
          Join attorneys who spend less time on research and more time winning.
        </p>
        <Link href="/pricing" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          height: '52px', background: '#C9A84C', color: '#0F0F0E', borderRadius: '12px',
          padding: '0 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none',
        }}>
          Get started free
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#0F0F0E', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '22px', height: '22px', background: '#C9A84C', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '11px' }}>D</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '14px', fontWeight: 600, color: '#fff', letterSpacing: '-0.2px' }}>Draftiro</span>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)' }}>© 2026 Draftiro. For solo attorneys.</div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Cancellation', '/cancellation']].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
      </footer>

    </div>
  )
}
