// app/subscribe/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LanguageProvider, useTranslation } from '@/lib/i18n';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    period: '/month',
    descKey: 'subscribe.starter_desc',
    features: [
      'Up to 10 clients',
      'Ruminant formulation (AFRC)',
      'Real-time nutrient balancing',
      'PDF report generation',
      'Email support',
    ],
    ctaKey: 'subscribe.start_starter',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    period: '/month',
    descKey: 'subscribe.professional_desc',
    features: [
      'Unlimited clients',
      'All species (ruminant, pig, poultry)',
      'All models (AFRC, NRC, CNCPS)',
      'AI diet reviews',
      'Least-cost optimisation',
      'Branded PDF reports',
      'Ingredient price tracking',
      'Priority support',
    ],
    ctaKey: 'subscribe.go_professional',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    period: '/month',
    descKey: 'subscribe.enterprise_desc',
    features: [
      'Everything in Professional',
      'Team accounts (up to 5 users)',
      'Custom requirement profiles',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
    ],
    ctaKey: 'subscribe.contact_us',
  },
];

function SubscribeContent() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const cancelled = searchParams?.get('cancelled');

  const handleSubscribe = async (planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@optiafeed.cloud?subject=Enterprise%20inquiry';
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F0E8',
      padding: '40px 20px',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#BE5529',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}>
            {t('subscribe.trial_ended')}
          </p>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#1a1612',
            margin: '0 0 8px',
          }}>
            {t('subscribe.choose_plan')}
          </h1>
          <p style={{ fontSize: 15, color: '#6B6460', margin: 0 }}>
            {t('subscribe.all_plans_include')} <strong style={{ color: '#2E6B42' }}>{t('subscribe.fourteen_days_free')}</strong>.
            {' '}{t('subscribe.data_saved')}
          </p>
          {cancelled && (
            <p style={{
              fontSize: 13,
              color: '#C43D3D',
              marginTop: 12,
              padding: '8px 16px',
              background: '#FDF2F2',
              borderRadius: 8,
              display: 'inline-block',
            }}>
              {t('subscribe.checkout_cancelled')}
            </p>
          )}
        </div>

        {/* Plans grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              style={{
                background: '#ffffff',
                borderRadius: 14,
                padding: '32px 28px',
                border: plan.popular
                  ? '2px solid #BE5529'
                  : '1px solid #E8E0D2',
                position: 'relative' as const,
              }}
            >
              {plan.popular && (
                <span style={{
                  position: 'absolute' as const,
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#BE5529',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 14px',
                  borderRadius: 20,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                }}>
                  {t('subscribe.most_popular')}
                </span>
              )}

              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#1a1612',
                margin: '0 0 4px',
              }}>
                {plan.name}
              </h3>
              <p style={{
                fontSize: 13,
                color: '#9B9590',
                margin: '0 0 20px',
              }}>
                {t(plan.descKey)}
              </p>

              <div style={{ marginBottom: 20 }}>
                <span style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#1a1612',
                }}>
                  ${plan.price}
                </span>
                <span style={{
                  fontSize: 14,
                  color: '#9B9590',
                }}>
                  {plan.period} AUD
                </span>
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  background: plan.popular ? '#BE5529' : '#1a1612',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: loading === plan.id ? 'wait' : 'pointer',
                  marginBottom: 20,
                  opacity: loading === plan.id ? 0.7 : 1,
                }}
              >
                {loading === plan.id ? t('subscribe.redirecting') : t(plan.ctaKey)}
              </button>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}>
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 13,
                      color: '#6B6460',
                      padding: '6px 0',
                      borderTop: i > 0 ? '1px solid #F5F0E8' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ color: '#2E6B42', fontWeight: 700 }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p style={{
          textAlign: 'center',
          fontSize: 13,
          color: '#9B9590',
          marginTop: 32,
        }}>
          {t('subscribe.cancel_anytime')}
          <br />
          {t('subscribe.need_help')}{' '}
          <a href="mailto:support@optiafeed.cloud" style={{ color: '#1E4A5A' }}>
            support@optiafeed.cloud
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <LanguageProvider>
      <Suspense>
        <SubscribeContent />
      </Suspense>
    </LanguageProvider>
  );
}
