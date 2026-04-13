import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'
import { IngredientsTable } from '@/components/ingredients/table'

export default async function IngredientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .or(`nutritionist_id.is.null,nutritionist_id.eq.${user!.id}`)
    .order('name')

  // Get latest prices for each ingredient
  const { data: prices } = await supabase
    .from('ingredient_prices')
    .select('*')
    .eq('nutritionist_id', user!.id)
    .order('effective_date', { ascending: false })

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-text">Ingredient Database</h1>
        <button className="btn btn-primary"><Plus size={14} /> Add Ingredient</button>
      </div>

      <IngredientsTable
        ingredients={ingredients || []}
        prices={prices || []}
      />
    </div>
  )
}
