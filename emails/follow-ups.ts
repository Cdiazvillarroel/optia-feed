// emails/follow-ups.ts
// ============================================
// OPTIA FEED — Follow-up Email Templates
// All onboarding sequence emails
// ============================================

// ── Shared email wrapper ─────────────────────

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E8E0D2;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #F5F0E8;">
              <span style="font-size:16px;font-weight:600;color:#1a1612;">Optia Feed</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:36px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #F5F0E8;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9B9590;">
                Optia Feed by Agrometrics · <a href="#" style="color:#9B9590;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email 1: Trial Expiring (sent at ~22 hours) ─

export function renderTrialExpiringEmail({ name, subscribeUrl }: {
  name: string;
  subscribeUrl: string;
}): string {
  return emailWrapper(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1612;">
      Your trial expires in 2 hours
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6B6460;line-height:1.6;">
      Hey ${name}, just a heads up — your 24-hour Optia Feed trial is almost up. 
      Your data is safe and won't be deleted.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6460;line-height:1.6;">
      To keep your access, choose a plan. All plans include <strong style="color:#BE5529;">14 additional days free</strong> — 
      so you won't be charged until day 15.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${subscribeUrl}" style="display:inline-block;background-color:#BE5529;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
            Choose a plan →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#9B9590;">
      Questions? Reply to this email — we read every one.
    </p>
  `);
}

// ── Email 2: Trial Expired ──────────────────

export function renderTrialExpiredEmail({ name, subscribeUrl }: {
  name: string;
  subscribeUrl: string;
}): string {
  return emailWrapper(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1612;">
      Your trial has ended
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6B6460;line-height:1.6;">
      Hey ${name}, your 24-hour trial has expired, but all your data — clients, 
      formulas, ingredient prices — is safely stored and waiting for you.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E8;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a1612;">
            Subscribe to pick up where you left off
          </p>
          <p style="margin:0;font-size:13px;color:#6B6460;line-height:1.6;">
            All plans start with 14 days free. Your first charge won't happen until day 15.
          </p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${subscribeUrl}" style="display:inline-block;background-color:#BE5529;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
            Subscribe now →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#9B9590;">
      Not ready yet? No worries — your data will be kept for 30 days.
    </p>
  `);
}

// ── Email 3: Subscription Confirmed ─────────

export function renderSubscriptionConfirmedEmail({ name, plan, trialEndDate, dashboardUrl }: {
  name: string;
  plan: string;
  trialEndDate: Date;
  dashboardUrl: string;
}): string {
  const chargeDate = trialEndDate.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Australia/Melbourne',
  });

  return emailWrapper(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1612;">
      You're all set! 🎉
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6B6460;line-height:1.6;">
      Hey ${name}, thanks for subscribing to the <strong style="color:#2E6B42;">${plan}</strong> plan. 
      You've got full access — no restrictions.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF3DE;border:1px solid #C0DD97;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#3B6D11;text-transform:uppercase;letter-spacing:0.05em;">
            First payment
          </p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#2E6B42;">
            ${chargeDate}
          </p>
          <p style="margin:4px 0 0;font-size:13px;color:#6B6460;">
            You can cancel anytime before this date at no cost.
          </p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${dashboardUrl}" style="display:inline-block;background-color:#2E6B42;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
            Go to dashboard →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#9B9590;">
      Manage your subscription anytime in Account → Billing.
    </p>
  `);
}

// ── Email 4: Day 3 Check-in (if no formula created) ─

export function renderDay3CheckInEmail({ name, loginUrl }: {
  name: string;
  loginUrl: string;
}): string {
  return emailWrapper(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1612;">
      Need a hand getting started?
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6B6460;line-height:1.6;">
      Hey ${name}, we noticed you haven't created your first formula yet. 
      No rush — but if you'd like, we're here to help.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6460;line-height:1.6;">
      Here are a few things you can try:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:10px 0;">
          <p style="margin:0;font-size:14px;color:#1a1612;">
            <strong>→</strong> Open the demo formula and click <em>Edit</em> — change an ingredient, 
            watch the nutrients update in real time.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <p style="margin:0;font-size:14px;color:#1a1612;">
            <strong>→</strong> Try the <em>Optimise</em> button — let the solver find the 
            least-cost formulation within your constraints.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <p style="margin:0;font-size:14px;color:#1a1612;">
            <strong>→</strong> Run an <em>AI Review</em> on any formula — get instant feedback 
            on nutritional balance and safety.
          </p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E8;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1a1612;">
            Want a personal walkthrough?
          </p>
          <p style="margin:0;font-size:13px;color:#6B6460;">
            Reply to this email and we'll set up a 15-minute call.
          </p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td align="center">
          <a href="${loginUrl}" style="display:inline-block;background-color:#BE5529;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
            Log in now →
          </a>
        </td>
      </tr>
    </table>
  `);
}
