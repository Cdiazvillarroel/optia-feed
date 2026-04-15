// app/api/auth/signup/route.ts
// ============================================
// OPTIA FEED — Signup Handler
// Called from the landing page form (Netlify → Vercel)
// Includes CORS for cross-origin requests
// ============================================

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { seedUserData } from '@/lib/seed-user-data'
import { renderWelcomeEmail } from '@/emails/welcome'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const resend = new Resend(process.env.RESEND_API_KEY)

// Dominios permitidos (tu landing page)
const ALLOWED_ORIGINS = [
  'https://optiafeed.cloud',
  'http://localhost:3000', // para desarrollo local
]

function corsHeaders(origin: string | null) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin!,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

// Preflight request (el browser lo envía antes del POST)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) })
}

interface SignupBody {
  fullName: string
  email: string
  password: string
  company: string
  species: string[]
  clientRange?: string
  referral?: string
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  try {
    const body: SignupBody = await req.json()

    // ── Validación ──────────────────────────────
    const errors: Record<string, string> = {}
    if (!body.fullName?.trim()) errors.fullName = 'Full name is required'
    if (!body.email?.trim()) errors.email = 'Email is required'
    if (!body.password || body.password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (!body.company?.trim()) errors.company = 'Company name is required'
    if (!body.species?.length) errors.species = 'Select at least one species'

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400, headers }
      )
    }

    // ── Verificar si el email ya existe ─────────
    const { data: existing } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', body.email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409, headers }
      )
    }

    // ── Crear usuario en Auth ───────────────────
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName,
        company: body.company,
      }
    })

    if (authError) {
      console.error('Auth creation failed:', authError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500, headers }
      )
    }

    const userId = authData.user.id
    const trialExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // ── Crear perfil ────────────────────────────
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: body.fullName.trim(),
        email: body.email.toLowerCase(),
        company: body.company.trim(),
        species: body.species,
        client_range: body.clientRange || null,
        referral: body.referral || null,
        subscription_status: 'trialing',
        trial_expires_at: trialExpiresAt.toISOString(),
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      console.error('Profile creation failed:', profileError)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500, headers }
      )
    }

    // ── Seedear datos según especie ─────────────
    try {
      await seedUserData(supabaseAdmin, userId, body.species)
    } catch (seedError) {
      console.error('Data seeding failed (non-fatal):', seedError)
    }

    // ── Log del evento ──────────────────────────
    await supabaseAdmin.from('onboarding_events').insert({
      user_id: userId,
      event_type: 'signup',
      metadata: {
        species: body.species,
        client_range: body.clientRange,
        referral: body.referral,
      }
    })

    // ── Enviar welcome email ────────────────────
    try {
      await resend.emails.send({
        from: 'Optia Feed <hello@optiafeed.cloud>',
        to: body.email,
        subject: 'Welcome to Optia Feed — Your 24-hour trial is active',
        html: renderWelcomeEmail({
          name: body.fullName.split(' ')[0],
          species: body.species,
          trialExpiresAt,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        }),
      })

      await supabaseAdmin
        .from('user_profiles')
        .update({ welcome_email_sent: true })
        .eq('id', userId)
    } catch (emailError) {
      console.error('Welcome email failed (non-fatal):', emailError)
    }

    // ── Respuesta exitosa ───────────────────────
    return NextResponse.json(
      {
        success: true,
        userId,
        trialExpiresAt: trialExpiresAt.toISOString(),
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      },
      { status: 200, headers }
    )

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    )
  }
}
