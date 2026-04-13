import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientsList } from '@/components/clients/clients-list'

export default async function ClientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clients } = await supabase
    .from('nutrition_clients')
    .select('*')
    .eq('nutritionist_id', user.id)
    .eq('active', true)
    .order('name')

  const { data: animalRows } = await supabase
    .from('client_animals')
    .select('client_id, count')

  const { data: formulaRows } = await supabase
    .from('formulas')
    .select('client_id')
    .eq('nutritionist_id', user.id)
    .not('status', 'eq', 'archived')

  const animalCounts: Record<string, number> = {}
  const formulaCounts: Record<string, number> = {}

  animalRows?.forEach((r: { client_id: string; count: number }) => {
    animalCounts[r.client_id] = (animalCounts[r.client_id] || 0) + (r.count || 0)
  })
  formulaRows?.forEach((r: { client_id: string | null }) => {
    if (r.client_id) formulaCounts[r.client_id] = (formulaCounts[r.client_id] || 0) + 1
  })

  return (
    <ClientsList
      clients={clients || []}
      animalCounts={animalCounts}
      formulaCounts={formulaCounts}
    />
  )
}
