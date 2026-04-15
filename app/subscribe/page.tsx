// app/subscribe/page.tsx
// ============================================
// OPTIA FEED — Subscribe Page
// Shown when 24hr trial expires
// ============================================

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    period: '/month',
    description: 'For independent consultants starting out',
    features: [
      'Up to 10 clients',
      'Ruminant formulation (AFRC)',
      'Real-time nutrient balancing',
      'PDF report generation',
      'Email support',
    ],
    cta: 'Start with Starter',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    period: '/month',
    description: 'Full-featured platform for growing practices',
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
    cta: 'Go Professional',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    period: '/month',
    description: 'For large practices and feedlot consultants',
    features: [
      'Everything in Professional',
      'Team accounts (up to 5 users)',
      'Custom requirement profiles',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
    ],
    cta: 'Contact us',
  },
];

export default function SubscribePage() {
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
            Your 24-hour trial has ended
          </p>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#1a1612',
            margin: '0 0 8px',
          }}>
            Choose your plan to continue
          </h1>
          <p style={{ fontSize: 15, color: '#6B6460', margin: 0 }}>
            All plans include <strong style={{ color: '#2E6B42' }}>14 days free</strong>. 
            Your data is saved — pick up right where you left off.
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
              Checkout was cancelled. Choose a plan when you're ready.
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
                  Most popular
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
                {plan.description}
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
                {loading === plan.id ? 'Redirecting...' : plan.cta}
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
          All prices in AUD. Cancel anytime during your 14-day free period at no cost. 
          <br />
          Need help? <a href="mailto:support@optiafeed.cloud" style={{ color: '#1E4A5A' }}>
            support@optiafeed.cloud
          </a>
        </p>
      </div>
    </div>
  );
}
