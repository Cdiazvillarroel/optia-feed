// app/api/auth/signup/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import crypto from 'crypto'
import { seedUserData } from '@/lib/seed-user-data'
import { isDisposableEmail } from '@/lib/disposable-emails'
import { renderVerificationEmail } from '@/emails/verification'

const ALLOWED_ORIGINS = [
  'https://optiafeed.cloud',
  'http://localhost:3000',
]

function corsHeaders(origin: string | null) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin!,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) })
}

interface SignupBody {
  fullName: string
  email: string
  password: string
  phone?: string
  company: string
  species: string[]
  clientRange?: string
  referral?: string
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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

    const normalizedEmail = body.email.toLowerCase().trim()

    // ── Bloquear dominios descartables ──────────
    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Please use a valid business email address. Disposable email services are not allowed.' },
        { status: 400, headers }
      )
    }

    // ── Verificar si el email ya existe ─────────
    const { data: existing } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email_verified')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      // Si existe pero no verificó, podría ser un retry — igual devolvemos el mismo error
      // para no revelar info, pero podrías en el futuro permitir un "resend" aquí.
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409, headers }
      )
    }

    // ── Crear usuario en Auth (SIN confirmar email) ──
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: body.password,
      email_confirm: false, // ← CAMBIO: ahora requiere verificación
      user_metadata: {
        full_name: body.fullName,
        company: body.company,
        phone: body.phone || null,
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

    // ── Crear perfil (pendiente de verificación, trial aún no arranca) ──
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: body.fullName.trim(),
        email: normalizedEmail,
        company: body.company.trim(),
        species: body.species,
        client_range: body.clientRange || null,
        referral: body.referral || null,
        subscription_status: 'pending_verification', // ← CAMBIO: no arranca como 'trialing'
        trial_expires_at: null, // ← CAMBIO: se setea al verificar
        email_verified: false,
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      console.error('Profile creation failed:', profileError)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500, headers }
      )
    }

    // ── Seedear datos según especie (se mantiene) ──
    try {
      await seedUserData(supabaseAdmin, userId, body.species)
    } catch (seedError) {
      console.error('Data seeding failed (non-fatal):', seedError)
    }

    // ── Crear token de verificación ─────────────
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    const { error: tokenError } = await supabaseAdmin
      .from('email_verifications')
      .insert({
        user_id: userId,
        email: normalizedEmail,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (tokenError) {
      // Rollback todo
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      console.error('Token creation failed:', tokenError)
      return NextResponse.json(
        { error: 'Failed to generate verification token' },
        { status: 500, headers }
      )
    }

    // ── Enviar verification email ───────────────
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`

    try {
      if (resend) {
        await resend.emails.send({
          from: 'Optia Feed <hello@optiafeed.cloud>',
          to: normalizedEmail,
          subject: 'Verify your email to activate your free trial',
          html: renderVerificationEmail({
            name: body.fullName.split(' ')[0],
            verifyUrl,
            expiresInHours: 24,
          }),
        })
      }
    } catch (emailError) {
      console.error('Verification email send failed:', emailError)
      // No hacemos rollback — el user puede usar "Resend" desde la landing
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

    await supabaseAdmin.from('onboarding_events').insert({
      user_id: userId,
      event_type: 'verification_email_sent',
    })

    // ── Respuesta ───────────────────────────────
    return NextResponse.json(
      {
        success: true,
        message: 'verification_sent',
        email: normalizedEmail,
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
