// emails/welcome.ts
// ============================================
// OPTIA FEED — Welcome Email Template
// Sent immediately after signup
// ============================================

interface WelcomeEmailProps {
  name: string;
  species: string[];
  trialExpiresAt: Date;
  loginUrl: string;
}

const SPECIES_LABELS: Record<string, string> = {
  dairy: 'Dairy cattle',
  beef: 'Beef cattle',
  sheep: 'Sheep',
  pig: 'Pig',
  poultry: 'Poultry',
};

export function renderWelcomeEmail({ name, species, trialExpiresAt, loginUrl }: WelcomeEmailProps): string {
  const speciesText = species.map(s => SPECIES_LABELS[s] || s).join(', ');
  const expiryTime = trialExpiresAt.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Australia/Melbourne',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Optia Feed</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E8E0D2;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1612;padding:28px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="display:inline-block;">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <!-- Nutrient Hex logo simplified -->
                    <svg width="32" height="32" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 2L36.5 11.5V30.5L20 40L3.5 30.5V11.5L20 2Z" fill="#BE5529" opacity="0.3" stroke="#BE5529" stroke-width="1.5"/>
                      <circle cx="14" cy="17" r="3" fill="#BE5529"/>
                      <circle cx="26" cy="17" r="3" fill="#2E6B42"/>
                      <circle cx="20" cy="28" r="3" fill="#1E4A5A"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.01em;">Optia Feed</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1a1612;letter-spacing:-0.02em;">
                G'day ${name}! 👋
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6B6460;line-height:1.6;">
                Your 24-hour trial of Optia Feed is now active. We've loaded sample data for <strong style="color:#BE5529;">${speciesText}</strong> so you can start exploring straight away.
              </p>

              <!-- Trial countdown box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF8F6;border:1px solid #F0D5C9;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9B9590;text-transform:uppercase;letter-spacing:0.05em;">
                      Trial access expires
                    </p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#BE5529;">
                      ${expiryTime} AEST
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display:inline-block;background-color:#BE5529;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                      Log in to Optia Feed →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Quick start steps -->
              <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1a1612;">
                Quick start — your first formula in 5 minutes
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F5F0E8;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;">
                          <span style="display:inline-block;width:24px;height:24px;background-color:#2E6B42;color:#fff;font-size:12px;font-weight:700;line-height:24px;text-align:center;border-radius:50%;">1</span>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;color:#1a1612;font-weight:500;">Explore the demo formula</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#9B9590;">See how ingredients, nutrients, and constraints work together.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F5F0E8;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;">
                          <span style="display:inline-block;width:24px;height:24px;background-color:#2E6B42;color:#fff;font-size:12px;font-weight:700;line-height:24px;text-align:center;border-radius:50%;">2</span>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;color:#1a1612;font-weight:500;">Add your first real client</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#9B9590;">Create a client, set up animal groups, and assign requirement profiles.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #F5F0E8;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;">
                          <span style="display:inline-block;width:24px;height:24px;background-color:#2E6B42;color:#fff;font-size:12px;font-weight:700;line-height:24px;text-align:center;border-radius:50%;">3</span>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;color:#1a1612;font-weight:500;">Build your first formula</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#9B9590;">Pick ingredients, set constraints, and run the optimiser. Watch nutrients balance in real time.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;">
                          <span style="display:inline-block;width:24px;height:24px;background-color:#C9A043;color:#fff;font-size:12px;font-weight:700;line-height:24px;text-align:center;border-radius:50%;">★</span>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;color:#1a1612;font-weight:500;">Get an AI diet review</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#9B9590;">Let our AI review your formula for nutritional balance, safety, and cost efficiency.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What happens after trial -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E8;border-radius:10px;margin-bottom:16px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a1612;">
                      What happens after 24 hours?
                    </p>
                    <p style="margin:0;font-size:13px;color:#6B6460;line-height:1.6;">
                      Your trial data is saved. To continue, choose a plan — all plans include an additional 14 days free. No data is lost.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9B9590;line-height:1.6;">
                Need help? Reply to this email or reach us at 
                <a href="mailto:support@optiafeed.cloud" style="color:#1E4A5A;">support@optiafeed.cloud</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #F5F0E8;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9B9590;">
                Optia Feed by Agrometrics · Precision nutrition, simplified
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#C5C0B8;">
                <a href="#" style="color:#9B9590;text-decoration:underline;">Unsubscribe</a> · 
                <a href="#" style="color:#9B9590;text-decoration:underline;">Privacy Policy</a>
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
