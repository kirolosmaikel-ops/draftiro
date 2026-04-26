import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F6F3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: 'DM Sans, system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid rgba(0,0,0,0.07)',
        padding: '56px 40px',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
      }}>
        {/* Logomark */}
        <div style={{
          width: '40px',
          height: '40px',
          background: '#C9A84C',
          borderRadius: '10px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Newsreader, serif',
          fontWeight: 700,
          color: '#fff',
          fontSize: '18px',
          marginBottom: '24px',
        }}>D</div>

        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#8B6914',
          marginBottom: '12px',
        }}>
          404 · Page not found
        </div>

        <h1 style={{
          fontFamily: 'Newsreader, serif',
          fontSize: '32px',
          fontWeight: 600,
          letterSpacing: '-0.5px',
          color: '#0F0F0E',
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}>
          We couldn&apos;t find that page.
        </h1>

        <p style={{
          fontSize: '14.5px',
          color: '#6B6B68',
          lineHeight: 1.6,
          margin: '0 0 32px',
        }}>
          The link may be broken, or the page may have been moved. Try one of these instead.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
          <Link
            href="/dashboard"
            style={{
              height: '46px',
              background: '#0F0F0E',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14.5px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            Back to Dashboard →
          </Link>
          <Link
            href="/"
            style={{
              height: '46px',
              background: 'rgba(0,0,0,0.04)',
              color: '#0F0F0E',
              borderRadius: '12px',
              fontSize: '14.5px',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Go to home page
          </Link>
        </div>

        <div style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          fontSize: '12.5px',
          color: '#9A9A96',
          display: 'flex',
          gap: '14px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Link href="/cases" style={{ color: '#9A9A96', textDecoration: 'none' }}>Cases</Link>
          <span style={{ opacity: 0.5 }}>·</span>
          <Link href="/chat" style={{ color: '#9A9A96', textDecoration: 'none' }}>Chat</Link>
          <span style={{ opacity: 0.5 }}>·</span>
          <Link href="/knowledge" style={{ color: '#9A9A96', textDecoration: 'none' }}>Knowledge</Link>
          <span style={{ opacity: 0.5 }}>·</span>
          <Link href="/billing" style={{ color: '#9A9A96', textDecoration: 'none' }}>Billing</Link>
        </div>
      </div>
    </div>
  )
}
