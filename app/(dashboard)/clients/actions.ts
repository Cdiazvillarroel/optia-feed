'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createClientAction(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const speciesRaw = formData.get('species') as string
  const species = speciesRaw ? speciesRaw.split(',').map(s => s.trim()).filter(Boolean) : []

  const { data, error } = await supabase
    .from('nutrition_clients')
    .insert({
      nutritionist_id: user.id,
      name: formData.get('name') as string,
      species,
      contact_name: formData.get('contact_name') as string || null,
      contact_email: formData.get('contact_email') as string || null,
      contact_phone: formData.get('contact_phone') as string || null,
      location: formData.get('location') as string || null,
      notes: formData.get('notes') as string || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/clients')
  redirect(`/clients/${data.id}`)
}

export async function updateClientAction(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const speciesRaw = formData.get('species') as string
  const species = speciesRaw ? speciesRaw.split(',').map(s => s.trim()).filter(Boolean) : []

  const { error } = await supabase
    .from('nutrition_clients')
    .update({
      name: formData.get('name') as string,
      species,
      contact_name: formData.get('contact_name') as string || null,
      contact_email: formData.get('contact_email') as string || null,
      contact_phone: formData.get('contact_phone') as string || null,
      location: formData.get('location') as string || null,
      notes: formData.get('notes') as string || null,
    })
    .eq('id', id)
    .eq('nutritionist_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  redirect(`/clients/${id}`)
}

export async function deleteClientAction(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('nutrition_clients')
    .update({ active: false })
    .eq('id', id)
    .eq('nutritionist_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/clients')
  redirect('/clients')
}

export async function createAnimalGroupAction(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clientId = formData.get('client_id') as string

  const { error } = await supabase
    .from('client_animals')
    .insert({
      client_id: clientId,
      name: formData.get('name') as string,
      species: formData.get('species') as string,
      breed: formData.get('breed') as string || null,
      production_stage: formData.get('production_stage') as string,
      count: parseInt(formData.get('count') as string) || 0,
      avg_weight_kg: parseFloat(formData.get('avg_weight_kg') as string) || null,
      target_adg_kg: parseFloat(formData.get('target_adg_kg') as string) || null,
      target_milk_yield_l: parseFloat(formData.get('target_milk_yield_l') as string) || null,
      dmi_kg: parseFloat(formData.get('dmi_kg') as string) || null,
      notes: formData.get('notes') as string || null,
    })

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}`)
}

export async function deleteAnimalGroupAction(id: string, clientId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('client_animals')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${clientId}`)
}
