// app/api/auth/resend-verification/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import crypto from 'crypto'
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

// Rate limit config
const MAX_RESENDS = 5
const MIN_SECONDS_BETWEEN_RESENDS = 60

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  try {
    const body = await req.json()
    const email = body.email?.toLowerCase().trim()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

    // ── Buscar el perfil ────────────────────────
    // Por seguridad (anti-enumeration), SIEMPRE devolvemos 200 al final,
    // aunque el email no exista o ya esté verificado.
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email_verified')
      .eq('email', email)
      .maybeSingle()

    if (!profile || profile.email_verified) {
      // Usuario no existe O ya verificó — respondemos OK sin hacer nada
      return NextResponse.json({ success: true }, { status: 200, headers })
    }

    // ── Buscar el último token activo ───────────
    const { data: lastVerification } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('user_id', profile.id)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ── Rate limit: min 60s entre resends ───────
    if (lastVerification?.last_resend_at) {
      const secondsSinceLast = Math.floor(
        (Date.now() - new Date(lastVerification.last_resend_at).getTime()) / 1000
      )
      if (secondsSinceLast < MIN_SECONDS_BETWEEN_RESENDS) {
        return NextResponse.json(
          {
            error: 'Please wait before requesting another email.',
            retryAfterSeconds: MIN_SECONDS_BETWEEN_RESENDS - secondsSinceLast,
          },
          { status: 429, headers }
        )
      }
    }

    // ── Rate limit: max 5 resends por token ─────
    if (lastVerification && lastVerification.resend_count >= MAX_RESENDS) {
      return NextResponse.json(
        { error: 'Too many resend attempts. Please contact support.' },
        { status: 429, headers }
      )
    }

    // ── Invalidar tokens previos y crear uno nuevo ──
    // (invalidamos marcándolos como expirados con verified_at a NULL y expires_at en el pasado)
    // Mejor: simplemente creamos uno nuevo y dejamos que el viejo expire naturalmente.
    // Pero sí actualizamos resend_count para tracking.

    const newToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const now = new Date()

    // Invalidar tokens previos del usuario
    await supabaseAdmin
      .from('email_verifications')
      .update({ expires_at: now.toISOString() })
      .eq('user_id', profile.id)
      .is('verified_at', null)

    // Crear token nuevo con resend_count heredado
    const newResendCount = (lastVerification?.resend_count || 0) + 1

    const { error: insertError } = await supabaseAdmin
      .from('email_verifications')
      .insert({
        user_id: profile.id,
        email,
        token: newToken,
        expires_at: expiresAt.toISOString(),
        resend_count: newResendCount,
        last_resend_at: now.toISOString(),
      })

    if (insertError) {
      console.error('Failed to create new verification token:', insertError)
      return NextResponse.json(
        { error: 'Failed to resend email. Please try again.' },
        { status: 500, headers }
      )
    }

    // ── Enviar email ────────────────────────────
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${newToken}`

    if (resend) {
      await resend.emails.send({
        from: 'Optia Feed <hello@optiafeed.cloud>',
        to: email,
        subject: 'Your Optia Feed verification link',
        html: renderVerificationEmail({
          name: profile.full_name.split(' ')[0],
          verifyUrl,
          expiresInHours: 24,
        }),
      })
    }

    // ── Log del evento ──────────────────────────
    await supabaseAdmin.from('onboarding_events').insert({
      user_id: profile.id,
      event_type: 'verification_email_resent',
      metadata: { resend_count: newResendCount },
    })

    return NextResponse.json({ success: true }, { status: 200, headers })

  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    )
  }
}
