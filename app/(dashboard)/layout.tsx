import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { AiPanel } from '@/components/layout/ai-panel'
import { LanguageProvider } from '@/lib/i18n'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('full_name, subscription_plan')
    .eq('id', user.id)
    .single()

  const displayName = userProfile?.full_name || user.email?.split('@')[0] || 'User'

  return (
    <LanguageProvider>
      <div className="flex h-screen overflow-hidden bg-surface-bg">
        <Sidebar
          user={{
            name: displayName,
            plan: userProfile?.subscription_plan || 'starter',
            initials: displayName
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
    </LanguageProvider>
  )
}
