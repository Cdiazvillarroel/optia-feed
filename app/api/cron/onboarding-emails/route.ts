// app/api/cron/onboarding-emails/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import {
  renderTrialExpiringEmail,
  renderTrialExpiredEmail,
  renderDay3CheckInEmail,
} from '@/emails/follow-ups'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const resend = new Resend(process.env.RESEND_API_KEY)
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

  const now = new Date()
  let emailsSent = 0

  // ── 1. Trial expiring (2 hours left) ──────
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const windowStart = new Date(twoHoursFromNow.getTime() - 30 * 60 * 1000)
  const windowEnd = new Date(twoHoursFromNow.getTime() + 30 * 60 * 1000)

  const { data: expiringUsers } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('subscription_status', 'trialing')
    .gte('trial_expires_at', windowStart.toISOString())
    .lte('trial_expires_at', windowEnd.toISOString())

  for (const user of expiringUsers || []) {
    const { data: existing } = await supabaseAdmin
      .from('onboarding_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'trial_expiring_email')
      .single()

    if (!existing) {
      try {
        await resend.emails.send({
          from: 'Optia Feed <hello@optiafeed.cloud>',
          to: user.email,
          subject: 'Your Optia Feed trial expires in 2 hours',
          html: renderTrialExpiringEmail({
            name: user.full_name.split(' ')[0],
            subscribeUrl: `${APP_URL}/subscribe`,
          }),
        })

        await supabaseAdmin.from('onboarding_events').insert({
          user_id: user.id,
          event_type: 'trial_expiring_email',
        })
        emailsSent++
      } catch (err) {
        console.error(`Failed to send trial expiring email to ${user.email}:`, err)
      }
    }
  }

  // ── 2. Trial expired ──────────────────────
  const { data: expiredUsers } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('subscription_status', 'trial_expired')

  for (const user of expiredUsers || []) {
    const { data: existing } = await supabaseAdmin
      .from('onboarding_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'trial_expired_email')
      .single()

    if (!existing) {
      try {
        await resend.emails.send({
          from: 'Optia Feed <hello@optiafeed.cloud>',
          to: user.email,
          subject: 'Your Optia Feed trial has ended — your data is saved',
          html: renderTrialExpiredEmail({
            name: user.full_name.split(' ')[0],
            subscribeUrl: `${APP_URL}/subscribe`,
          }),
        })

        await supabaseAdmin.from('onboarding_events').insert({
          user_id: user.id,
          event_type: 'trial_expired_email',
        })
        emailsSent++
      } catch (err) {
        console.error(`Failed to send trial expired email to ${user.email}:`, err)
      }
    }
  }

  // ── 3. Day 3 check-in (no formula created) ─
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const threeDaysAgoEnd = new Date(threeDaysAgo.getTime() + 30 * 60 * 1000)

  const { data: inactiveUsers } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, full_name')
    .in('subscription_status', ['subscribed_trialing', 'active'])
    .is('first_formula_created_at', null)
    .gte('created_at', threeDaysAgo.toISOString())
    .lte('created_at', threeDaysAgoEnd.toISOString())

  for (const user of inactiveUsers || []) {
    const { data: existing } = await supabaseAdmin
      .from('onboarding_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'day3_checkin_email')
      .single()

    if (!existing) {
      try {
        await resend.emails.send({
          from: 'Optia Feed <hello@optiafeed.cloud>',
          to: user.email,
          subject: 'Need help with your first formula?',
          html: renderDay3CheckInEmail({
            name: user.full_name.split(' ')[0],
            loginUrl: `${APP_URL}/login`,
          }),
        })

        await supabaseAdmin.from('onboarding_events').insert({
          user_id: user.id,
          event_type: 'day3_checkin_email',
        })
        emailsSent++
      } catch (err) {
        console.error(`Failed to send day 3 email to ${user.email}:`, err)
      }
    }
  }

  return NextResponse.json({
    success: true,
    emailsSent,
    timestamp: now.toISOString(),
  })
}
