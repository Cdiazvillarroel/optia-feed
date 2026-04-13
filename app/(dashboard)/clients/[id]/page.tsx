import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ClientDetail } from '@/components/clients/client-detail'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('nutrition_clients')
    .select('*')
    .eq('id', params.id)
    .eq('nutritionist_id', user.id)
    .single()

  if (!client) notFound()

  const { data: animals } = await supabase
    .from('client_animals')
    .select('*, formula:formulas(id, name, status)')
    .eq('client_id', client.id)
    .order('name')

  const { data: formulas } = await supabase
    .from('formulas')
    .select('*')
    .eq('client_id', client.id)
    .eq('nutritionist_id', user.id)
    .not('status', 'eq', 'archived')
    .order('updated_at', { ascending: false })

  return (
    <ClientDetail
      client={client}
      animals={animals || []}
      formulas={formulas || []}
    />
  )
}
