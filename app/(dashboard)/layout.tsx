import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { AiPanel } from '@/components/layout/ai-panel'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('nutritionist_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bg">
      <Sidebar
        user={{
          name: profile?.full_name || user.email?.split('@')[0] || 'User',
          plan: profile?.plan || 'starter',
          initials: (profile?.full_name || 'U')
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        }}
      />
      <main className="flex-1 overflow-auto animate-fade-in">
        {children}
      </main>
      <AiPanel />
    </div>
  )
}
