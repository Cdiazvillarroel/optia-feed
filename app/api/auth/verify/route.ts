// app/api/auth/verify/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { renderWelcomeEmail } from '@/emails/welcome'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/login?error=missing_token`)
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  try {
    // ── Buscar el token ─────────────────────────
    const { data: verification, error: lookupError } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('token', token)
      .is('verified_at', null)
      .maybeSingle()

    if (lookupError) {
      console.error('Verification lookup error:', lookupError)
      return NextResponse.redirect(`${APP_URL}/login?error=server_error`)
    }

    if (!verification) {
      return NextResponse.redirect(`${APP_URL}/login?error=invalid_token`)
    }

    // ── Validar expiración ──────────────────────
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.redirect(`${APP_URL}/login?error=expired_token`)
    }

    const userId = verification.user_id
    const now = new Date()
    const trialExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // ── Confirmar email en auth ─────────────────
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (confirmError) {
      console.error('Auth confirm error:', confirmError)
      return NextResponse.redirect(`${APP_URL}/login?error=server_error`)
    }

    // ── Marcar verification como usada ──────────
    await supabaseAdmin
      .from('email_verifications')
      .update({ verified_at: now.toISOString() })
      .eq('id', verification.id)

    // ── Activar el trial y marcar perfil como verificado ──
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        email_verified: true,
        email_verified_at: now.toISOString(),
        subscription_status: 'trialing',
        trial_expires_at: trialExpiresAt.toISOString(),
      })
      .eq('id', userId)
      .select('full_name, email, species, welcome_email_sent')
      .single()

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.redirect(`${APP_URL}/login?error=server_error`)
    }

    // ── Enviar welcome email (AHORA, no antes) ──
    if (resend && profile && !profile.welcome_email_sent) {
      try {
        await resend.emails.send({
          from: 'Optia Feed <hello@optiafeed.cloud>',
          to: profile.email,
          subject: 'Welcome to Optia Feed — Your 24-hour trial is active',
          html: renderWelcomeEmail({
            name: profile.full_name.split(' ')[0],
            species: profile.species,
            trialExpiresAt,
            loginUrl: `${APP_URL}/login`,
          }),
        })

        await supabaseAdmin
          .from('user_profiles')
          .update({ welcome_email_sent: true })
          .eq('id', userId)
      } catch (emailError) {
        console.error('Welcome email failed (non-fatal):', emailError)
      }
    }

    // ── Log del evento ──────────────────────────
    await supabaseAdmin.from('onboarding_events').insert({
      user_id: userId,
      event_type: 'email_verified',
    })

    // ── Redirigir al login con flag de éxito ────
    return NextResponse.redirect(`${APP_URL}/login?verified=true`)

  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.redirect(`${APP_URL}/login?error=server_error`)
  }
}
