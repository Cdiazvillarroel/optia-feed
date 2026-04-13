import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { formula_id } = await request.json()

    // Fetch formula with ingredients
    const { data: formula } = await supabase
      .from('formulas')
      .select(`
        *,
        client:nutrition_clients(*),
        ingredients:formula_ingredients(
          *,
          ingredient:ingredients(*)
        )
      `)
      .eq('id', formula_id)
      .single()

    if (!formula) {
      return NextResponse.json({ error: 'Formula not found' }, { status: 404 })
    }

    // Fetch safety rules for the species
    const { data: safetyRules } = await supabase
      .from('safety_rules')
      .select('*')
      .or(`nutritionist_id.is.null,nutritionist_id.eq.${user.id}`)
      .eq('species', formula.species)
      .eq('active', true)

    // Fetch requirements for the species/stage
    const { data: requirements } = await supabase
      .from('animal_requirements')
      .select('*')
      .or(`nutritionist_id.is.null,nutritionist_id.eq.${user.id}`)
      .eq('species', formula.species)
      .eq('production_stage', formula.production_stage)
      .limit(1)
      .single()

    const prompt = `Review this ${formula.species} ${formula.production_stage} formula:

Formula: ${formula.name} (v${formula.version})
Client: ${formula.client?.name || 'Unassigned'}
Batch size: ${formula.batch_size_kg}kg

Ingredients:
${formula.ingredients?.map((fi: any) => `- ${fi.ingredient?.name}: ${fi.inclusion_pct}% (${fi.locked ? 'LOCKED' : 'flexible'})`).join('\n')}

${requirements ? `\nNutritional requirements for ${formula.production_stage}:\n${JSON.stringify(requirements.requirements, null, 2)}` : ''}

${safetyRules?.length ? `\nSafety rules to check:\n${safetyRules.map((r: any) => `[${r.severity}] ${r.title}: ${r.detail}`).join('\n')}` : ''}

Provide a structured review covering:
1. Nutrient balance vs requirements
2. Safety rule violations
3. Cost optimization opportunities  
4. Suggested improvements`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: 'You are Optia, an expert livestock nutritionist AI. Review formulas against requirements and safety rules. Be specific with numbers. Australian context (AUD, CSIRO standards).',
      messages: [{ role: 'user', content: prompt }],
    })

    const review = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.type === 'text' ? b.text : '')
      .join('\n')

    // Save review to formula
    await supabase
      .from('formulas')
      .update({ ai_review: review, ai_reviewed_at: new Date().toISOString() })
      .eq('id', formula_id)

    // Log session
    await supabase.from('ai_sessions').insert({
      nutritionist_id: user.id,
      context_type: 'formula_review',
      context_id: formula_id,
      prompt,
      response: review,
      model: 'claude-sonnet-4-20250514',
      tokens_used: response.usage?.input_tokens + response.usage?.output_tokens,
    })

    return NextResponse.json({ review })
  } catch (error: any) {
    console.error('AI Review Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
