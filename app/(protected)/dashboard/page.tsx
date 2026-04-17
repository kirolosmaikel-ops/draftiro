import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '36px', fontWeight: 600, color: '#1D1D1F', marginBottom: '8px' }}>
          Good morning.
        </h1>
        <p style={{ fontSize: '14px', color: '#6B6B68' }}>Dashboard coming soon. Signed in as {user.email}</p>
      </div>
    </div>
  )
}
