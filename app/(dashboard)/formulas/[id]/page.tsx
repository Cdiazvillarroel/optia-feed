import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FormulaBuilder } from '@/components/formulas/builder'

export default async function FormulaDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: formula } = await supabase
    .from('formulas')
    .select(`
      *,
      client:nutrition_clients(id, name, species, location),
      ingredients:formula_ingredients(
        *,
        ingredient:ingredients(*)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!formula) notFound()

  // Fetch requirements for this species/stage
  const { data: requirements } = await supabase
    .from('animal_requirements')
    .select('*')
    .or(`nutritionist_id.is.null,nutritionist_id.eq.${user!.id}`)
    .eq('species', formula.species)

  // Fetch safety rules
  const { data: safetyRules } = await supabase
    .from('safety_rules')
    .select('*')
    .or(`nutritionist_id.is.null,nutritionist_id.eq.${user!.id}`)
    .eq('species', formula.species)
    .eq('active', true)

  return (
    <FormulaBuilder
      formula={formula}
      requirements={requirements || []}
      safetyRules={safetyRules || []}
    />
  )
}
