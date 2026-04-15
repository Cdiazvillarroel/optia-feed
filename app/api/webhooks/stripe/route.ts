// app/api/webhooks/stripe/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { renderSubscriptionConfirmedEmail } from '@/emails/follow-ups'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!,
  })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const resend = new Resend(process.env.RESEND_API_KEY)

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id
        const plan = subscription.metadata.plan

        if (!userId) break

        await supabaseAdmin
          .from('user_profiles')
          .update({
            subscription_status: 'subscribed_trialing',
            stripe_subscription_id: subscription.id,
            subscription_plan: plan,
            subscription_started_at: new Date().toISOString(),
          })
          .eq('id', userId)

        await supabaseAdmin.from('onboarding_events').insert({
          user_id: userId,
          event_type: 'subscribed',
          metadata: { plan, stripe_subscription_id: subscription.id },
        })

        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (profile) {
          const trialEnd = new Date(subscription.trial_end! * 1000)
          await resend.emails.send({
            from: 'Optia Feed <hello@optiafeed.cloud>',
            to: profile.email,
            subject: `You're subscribed — 14 days free on the ${plan} plan`,
            html: renderSubscriptionConfirmedEmail({
              name: profile.full_name.split(' ')[0],
              plan,
              trialEndDate: trialEnd,
              dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            }),
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id

        if (!userId) break

        if (subscription.status === 'active') {
          await supabaseAdmin
            .from('user_profiles')
            .update({ subscription_status: 'active' })
            .eq('id', userId)
        } else if (subscription.status === 'past_due') {
          await supabaseAdmin
            .from('user_profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id

        if (!userId) break

        await supabaseAdmin
          .from('user_profiles')
          .update({
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
          })
          .eq('id', userId)

        await supabaseAdmin.from('onboarding_events').insert({
          user_id: userId,
          event_type: 'cancelled',
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
