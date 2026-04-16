// emails/verification.ts

interface VerificationEmailParams {
  name: string
  verifyUrl: string
  expiresInHours?: number
}

export function renderVerificationEmail({
  name,
  verifyUrl,
  expiresInHours = 24,
}: VerificationEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verify your email — Optia Feed</title>
</head>
<body style="margin:0;padding:0;background:#F4EFE9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2C2420;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F4EFE9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#BE5529;padding:28px 32px;text-align:left;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">Optia<span style="opacity:0.8;">Feed</span></div>
                    <div style="color:rgba(255,255,255,0.7);font-size:10px;text-transform:uppercase;letter-spacing:0.18em;margin-top:2px;">by Agrometrics</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px 24px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;line-height:1.2;letter-spacing:-0.02em;color:#2C2420;">
                Verify your email, ${escapeHtml(name)}
              </h1>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#5A5149;">
                Welcome to Optia Feed. To activate your 24-hour free trial and start formulating, please confirm your email address by clicking the button below.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style="background:#BE5529;border-radius:8px;">
                    <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:16px;font-weight:600;text-decoration:none;">
                      Verify Email &amp; Start Trial
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 8px;font-size:13px;color:#A69D93;">
                Or paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;color:#5A5149;word-break:break-all;padding:10px 12px;background:#F4EFE9;border-radius:6px;">
                ${verifyUrl}
              </p>

              <p style="margin:24px 0 0;font-size:14px;color:#5A5149;">
                Your trial will begin the moment you verify — giving you 24 full hours of access to the full Professional feature set, no credit card required.
              </p>
            </td>
          </tr>

          <!-- Warning / Expiration -->
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="background:#FDFBF8;border-left:3px solid #C9A043;padding:14px 16px;border-radius:4px;">
                <p style="margin:0;font-size:13px;color:#5A5149;line-height:1.5;">
                  <strong style="color:#2C2420;">This link expires in ${expiresInHours} hours.</strong>
                  If you didn't create an Optia Feed account, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FDFBF8;padding:24px 32px;border-top:1px solid #E6DDD0;">
              <p style="margin:0 0 8px;font-size:12px;color:#A69D93;line-height:1.5;">
                Optia Feed — AI-powered livestock nutrition platform.<br>
                Part of the Agrometrics ecosystem.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#A69D93;">
                Need help? Reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
