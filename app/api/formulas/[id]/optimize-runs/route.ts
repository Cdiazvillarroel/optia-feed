// =====================================================
// POST /api/formulas/[id]/optimize-runs
// Persists optimization run for analytics, audit, future undo
// Fire-and-forget from client — never blocks UI
// =====================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify formula ownership
  const { data: formula } = await supabase
    .from('formulas')
    .select('id, nutritionist_id')
    .eq('id', params.id)
    .eq('nutritionist_id', user.id)
    .maybeSingle()

  if (!formula) {
    return NextResponse.json({ error: 'Formula not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const {
    status,
    method,
    cost_before_af,
    cost_after_af,
    constraints_used,
    solution,
    diagnostics,
    applied,
  } = body

  const savings =
    typeof cost_before_af === 'number' && typeof cost_after_af === 'number'
      ? cost_before_af - cost_after_af
      : null

  const { data, error } = await supabase
    .from('optimization_runs')
    .insert({
      formula_id: params.id,
      nutritionist_id: user.id,
      status: status ?? 'feasible',
      method: method ?? 'lp',
      cost_before_af: cost_before_af ?? null,
      cost_after_af: cost_after_af ?? null,
      savings_per_tonne: savings,
      constraints_used: constraints_used ?? null,
      solution: solution ?? null,
      diagnostics: diagnostics ?? null,
      applied: !!applied,
      applied_at: applied ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('optimization_runs insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
