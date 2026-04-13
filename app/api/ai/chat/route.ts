import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are Optia, an AI assistant for livestock nutritionists. You help with 
feed formulation, diet optimization, ingredient substitution, and nutritional 
analysis for all livestock species (cattle, pigs, poultry, sheep).

You reference established feeding standards: NRC (Nutrient Requirements of 
Domestic Animals), CSIRO Feeding Standards for Australian Livestock, INRA 
(European), and breed-specific guidelines.

You NEVER replace the nutritionist's judgment. You provide analysis, 
suggestions, and flag potential issues. The nutritionist makes all final 
decisions.

You work in the context of Australian agriculture: AUD pricing, Australian 
feed ingredients, local suppliers, and Australian regulatory requirements.

When reviewing formulas, always check:
1. Nutrient balance vs targets (flag deficiencies and excesses)
2. Cost optimization opportunities
3. Anti-nutritional factors and ingredient interactions
4. Species-specific max inclusion rates
5. Amino acid balance (especially for monogastrics)
6. Mineral ratios (Ca:P, DCAD for dairy)
7. Practical mixing considerations

Keep responses concise, technical, and actionable. Use markdown formatting.`

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, context } = await request.json()

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: prompt }
    ]

    // Add formula context if provided
    if (context) {
      messages[0] = {
        role: 'user',
        content: `Context: ${JSON.stringify(context)}\n\nQuestion: ${prompt}`
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => {
        if (block.type === 'text') return block.text
        return ''
      })
      .join('\n')

    // Log the session
    await supabase.from('ai_sessions').insert({
      nutritionist_id: user.id,
      context_type: context?.type || 'chat',
      context_id: context?.id || null,
      prompt,
      response: text,
      model: 'claude-sonnet-4-20250514',
      tokens_used: response.usage?.input_tokens + response.usage?.output_tokens,
    })

    return NextResponse.json({ response: text })
  } catch (error: any) {
    console.error('AI Chat Error:', error)
    return NextResponse.json(
      { error: error.message || 'AI request failed' },
      { status: 500 }
    )
  }
}
