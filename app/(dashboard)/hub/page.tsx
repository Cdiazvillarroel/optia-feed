import { createClient } from '@/lib/supabase/server'
import { HubView } from '@/components/hub/hub-view'

export default async function HubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch connected farms (clients with FeedFlow)
  const { data: farms } = await supabase
    .from('nutrition_clients')
    .select('*')
    .eq('nutritionist_id', user!.id)
    .eq('active', true)
    .order('name')

  // Fetch mills
  const { data: mills } = await supabase
    .from('hub_mills')
    .select('*')
    .eq('nutritionist_id', user!.id)
    .order('name')

  // Fetch contacts
  const { data: contacts } = await supabase
    .from('hub_contacts')
    .select('*')
    .eq('nutritionist_id', user!.id)

  // Fetch shared formulas
  const { data: shared } = await supabase
    .from('shared_formulas')
    .select('*, formula:formulas(name, species, version)')
    .eq('nutritionist_id', user!.id)
    .order('shared_at', { ascending: false })
    .limit(20)

  // Fetch recent messages
  const { data: messages } = await supabase
    .from('hub_messages')
    .select('*')
    .eq('nutritionist_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <HubView
      farms={farms || []}
      mills={mills || []}
      contacts={contacts || []}
      shared={shared || []}
      messages={messages || []}
    />
  )
}
