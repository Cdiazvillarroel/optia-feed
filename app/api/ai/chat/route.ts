import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are Optia, an expert AI co-pilot for livestock nutritionists working in Australian agriculture.

ROLE: You assist with ration formulation, diet optimization, ingredient substitution, nutritional analysis, and troubleshooting for all livestock species (dairy cattle, beef cattle, pigs, poultry, sheep). You NEVER replace the nutritionist's judgment — you provide analysis, flag issues, and suggest improvements.

KNOWLEDGE BASE:
- CSIRO Feeding Standards for Australian Livestock (primary reference)
- NRC Nutrient Requirements of Domestic Animals
- Australian feed ingredient profiles and market pricing (AUD)

WHEN REVIEWING A FORMULA, systematically check:
1. NUTRIENT BALANCE vs REQUIREMENTS — compare each nutrient against target range, flag deficiencies and excesses, highlight CRITICAL violations
2. PRODUCTION LEVEL ADEQUACY — verify energy supports stated production target, check protein matches production level
3. SAFETY RULE COMPLIANCE — check max inclusion rates, anti-nutritional factors, mineral ratios (Ca:P), dangerous interactions
4. COST OPTIMIZATION — identify expensive ingredients that could be replaced, suggest alternatives with savings in $/tonne
5. PRACTICAL CONSIDERATIONS — mixing feasibility, ingredient availability in Australia, palatability, adaptation needs

FORMAT: Use markdown with bold headers and specific numbers. Always state the actual value vs the target. Use Australian units (MJ/kg, AUD).
TONE: Professional, direct, technically precise. Talking to an experienced nutritionist.`

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({ 
        response: '**Error:** ANTHROPIC_API_KEY is not configured in environment variables. Go to Vercel → Settings → Environment Variables and add your API key from console.anthropic.com' 
      })
    }

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ response: '**Error:** No prompt received.' })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ 
        response: `**AI Error (${res.status}):** ${errText}\n\nCheck your ANTHROPIC_API_KEY in Vercel environment variables.` 
      })
    }

    const data = await res.json()
    const text = data.content
      ?.filter((b: any) => b.type === 'text')
      ?.map((b: any) => b.text)
      ?.join('\n') || 'No response generated.'

    return NextResponse.json({ response: text })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      response: `**Connection Error:** ${message}` 
    })
  }
}
