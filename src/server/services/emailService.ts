import dotenv from 'dotenv';

dotenv.config();

// Lazy-load nodemailer dynamically so routes won't crash Express startup if nodemailer isn't installed yet
let _nodemailer: any = null;
async function getNodemailer(): Promise<any> {
  if (_nodemailer) return _nodemailer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _nodemailer = require('nodemailer');
    return _nodemailer;
  } catch {
    try {
      const mod = await import('nodemailer');
      _nodemailer = mod.default || mod;
      return _nodemailer;
    } catch {
      return null;
    }
  }
}

export interface AccountDeletionEmailParams {
  toEmail: string;
  displayName: string;
  username: string;
  requestedAt: Date;
  scheduledDeletionAt: Date;
  ipAddress?: string;
  dashboardUrl?: string;
}

export interface ProPlanUpgradeEmailParams {
  toEmail: string;
  displayName?: string;
  username: string;
  planDurationDays: number;
  planExpiresAt?: string | Date | null;
  planStartedAt?: string | Date | null;
  action?: 'upgrade' | 'extend' | string;
  dashboardUrl?: string;
}

export interface WelcomeEmailParams {
  toEmail: string;
  displayName?: string;
  username: string;
  dashboardUrl?: string;
}

export interface ProPlanExpiringSoonEmailParams {
  toEmail: string;
  displayName?: string;
  username: string;
  daysLeft: number;
  planExpiresAt: string | Date;
  dashboardUrl?: string;
}

export interface ProPlanExpiredEmailParams {
  toEmail: string;
  displayName?: string;
  username: string;
  planExpiresAt: string | Date;
  dashboardUrl?: string;
}

function getSmtpConfig(customFromName?: string) {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465;
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const fromName = (customFromName || process.env.SMTP_FROM_NAME || 'StreamWidgets').trim();
  const fromEmail = (process.env.SMTP_FROM_EMAIL || user || 'notifications@streamwidgets.com').trim();

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: `"${fromName}" <${fromEmail}>`,
    isConfigured:
      Boolean(user) &&
      Boolean(pass) &&
      user !== 'your_email@gmail.com' &&
      pass !== 'your_16_char_app_password'
  };
}

/**
 * Centralized mail sender that verifies SMTP configuration & nodemailer availability safely
 */
async function sendMailSafely(
  smtp: ReturnType<typeof getSmtpConfig>,
  options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  },
  label: string
): Promise<{ sent: boolean; simulated?: boolean; error?: string }> {
  if (!smtp.isConfigured) {
    console.warn(`⚠️ [Nodemailer] SMTP credentials not configured in .env. Simulated ${label} for ${options.to}.`);
    return {
      sent: false,
      simulated: true,
      error: 'SMTP credentials not configured in .env'
    };
  }

  const nodemailer = await getNodemailer();
  if (!nodemailer) {
    console.warn(`⚠️ [Nodemailer] "nodemailer" package not found in node_modules. Simulated ${label} for ${options.to}. Run "npm install nodemailer" on VPS.`);
    return {
      sent: false,
      simulated: true,
      error: 'nodemailer module not installed on server'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass
      }
    });

    await transporter.sendMail({
      from: smtp.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });

    console.log(`📧 [Nodemailer] Successfully sent ${label} to ${options.to}`);
    return { sent: true };
  } catch (err: any) {
    console.error(`❌ [Nodemailer] Failed to send ${label} to ${options.to}:`, err?.message || err);
    return {
      sent: false,
      error: err?.message || 'Failed to send email via SMTP'
    };
  }
}

/**
 * Sends a security alert email using Nodemailer when a user requests account deletion.
 * Warns the user about the 7-day countdown and instructs them to take immediate action
 * if they did not initiate the request.
 */
export async function sendAccountDeletionRequestEmail(
  params: AccountDeletionEmailParams
): Promise<{ sent: boolean; simulated?: boolean; error?: string }> {
  const {
    toEmail,
    displayName,
    username,
    requestedAt,
    scheduledDeletionAt,
    ipAddress,
    dashboardUrl
  } = params;

  const appUrl = (
    dashboardUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
  const accountSettingsUrl = `${appUrl}/creator?tab=account`;

  const formattedRequestedAt = requestedAt.toUTCString();
  const formattedScheduledAt = scheduledDeletionAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const subject = `⚠️ [Security Alert] Account Deletion Requested for @${username} — Action Required if Unauthorized`;

  const textBody = `
STREAMWIDGETS SECURITY ALERT — ACCOUNT DELETION REQUESTED
=======================================================

Hello ${displayName || username} (@${username}),

We received a request to permanently delete your StreamWidgets creator account associated with ${toEmail}.

YOUR ACCOUNT IS NOW IN A 7-DAY DELETION WAITING PERIOD:
• Account Handle: @${username}
• Requested On: ${formattedRequestedAt}
• Request IP: ${ipAddress || 'Authenticated Web Session'}
• Scheduled Permanent Deletion Date: ${formattedScheduledAt} (7 days from request)

WHAT HAPPENS AFTER 7 DAYS:
Once the 7-day waiting period expires, all of your account data—including your creator profile, username (@${username}), OBS overlay tokens, donation ledger history, subscriber tiers, media library uploads, and widget settings—will be permanently deleted from our database (only your email address record is retained). If you sign in again after deletion, you will start with a brand-new account.

-------------------------------------------------------
🚨 DID NOT MAKE THIS REQUEST? TAKE SERIOUS ACTION NOW!
-------------------------------------------------------
If you did NOT request to delete your account, someone may have unauthorized access to your account or Google session. Please take serious action immediately:

1. Cancel the Deletion Request Right Now:
   Sign in to your StreamWidgets Dashboard and click "Cancel Request Deletion" in My Account -> Danger Zone before ${formattedScheduledAt}:
   ${accountSettingsUrl}

2. Secure Your Google Account:
   Change your Google password immediately, enable 2-Step Verification, and revoke any unfamiliar signed-in devices.

3. Rotate Your Stream Keys:
   Regenerate your OBS Overlay Token in your StreamWidgets Dashboard.

If you intentionally requested this deletion, no further action is needed. Your account will be automatically removed after the 7-day grace period.

Stay safe,
StreamWidgets Security & Trust Team
${appUrl}
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account Deletion Requested</title>
</head>
<body style="margin:0;padding:0;background-color:#05070E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#05070E;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#090D18;border:1px solid #1E293B;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.8);">
          
          <!-- Top Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#7F1D1D 0%,#450A0A 100%);padding:24px 28px;border-bottom:1px solid rgba(239,68,68,0.35);">
              <div style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:rgba(239,68,68,0.2);border:1px solid rgba(248,113,113,0.4);color:#FCA5A5;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">
                ⚠️ Critical Security Alert
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.3px;">
                Account Deletion Requested
              </h1>
              <p style="margin:6px 0 0 0;font-size:13px;color:#FECACA;">
                7-Day Grace Period Active for <strong>@${username}</strong>
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#CBD5E1;">
                Hello <strong style="color:#FFFFFF;">${displayName || username}</strong>,
              </p>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#CBD5E1;">
                We received a request to permanently delete your <strong>StreamBotKH</strong> creator account associated with <span style="color:#38BDF8;font-family:monospace;">${toEmail}</span>. Your account has been placed into a <strong>7-day deletion waiting period</strong>.
              </p>

              <!-- Details Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0F172A;border:1px solid #1E293B;border-radius:12px;padding:16px;margin-bottom:22px;">
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#94A3B8;">Account Handle:</td>
                  <td style="padding:6px 0;font-size:12px;color:#F8FAFC;font-weight:700;font-family:monospace;text-align:right;">@${username}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#94A3B8;border-top:1px solid #1E293B;">Requested At:</td>
                  <td style="padding:6px 0;font-size:12px;color:#E2E8F0;font-family:monospace;text-align:right;border-top:1px solid #1E293B;">${formattedRequestedAt}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#94A3B8;border-top:1px solid #1E293B;">Permanent Deletion Date:</td>
                  <td style="padding:6px 0;font-size:12px;color:#F87171;font-weight:700;font-family:monospace;text-align:right;border-top:1px solid #1E293B;">${formattedScheduledAt}</td>
                </tr>
              </table>

              <!-- Serious Warning Callout -->
              <div style="background-color:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.4);border-left:4px solid #EF4444;border-radius:12px;padding:18px;margin-bottom:24px;">
                <h3 style="margin:0 0 8px 0;font-size:14px;font-weight:800;color:#FCA5A5;text-transform:uppercase;letter-spacing:0.4px;">
                  🚨 Did Not Request This? Take Serious Action Immediately!
                </h3>
                <p style="margin:0 0 12px 0;font-size:13px;line-height:1.6;color:#FECACA;">
                  If you <strong>did NOT</strong> initiate this account deletion request, your account or Google session may be compromised. Please take immediate action before the 7-day countdown expires:
                </p>
                <ol style="margin:0 0 16px 0;padding-left:20px;font-size:13px;line-height:1.7;color:#E2E8F0;">
                  <li>Click the button below to sign in to your dashboard and click <strong>"Cancel Request Deletion"</strong> immediately.</li>
                  <li>Change your Google Account password and review your active security sessions.</li>
                  <li>Regenerate your OBS Overlay Token inside the Security tab.</li>
                </ol>
                <div style="text-align:center;margin-top:14px;">
                  <a href="${accountSettingsUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(90deg,#EF4444 0%,#DC2626 100%);color:#FFFFFF;font-size:13px;font-weight:800;text-decoration:none;border-radius:10px;letter-spacing:0.3px;">
                    Cancel Account Deletion Request →
                  </a>
                </div>
              </div>

              <!-- What happens after 7 days -->
              <div style="background-color:#0B1120;border:1px solid #1E293B;border-radius:12px;padding:16px;margin-bottom:20px;">
                <h4 style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">
                  What Happens After 7 Days?
                </h4>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;">
                  Once the 7-day grace period passes without cancellation, all of your profile details, @${username} handle, donation ledger records, OBS overlay URLs, subscriber tiers, media library files, and interactive widget configurations will be permanently wiped from our database (retaining only your email address on record). You may recreate a fresh account anytime in the future by signing in again.
                </p>
              </div>

              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;text-align:center;">
                If you intentionally requested to delete your account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#060911;padding:16px 28px;border-top:1px solid #1E293B;text-align:center;">
              <p style="margin:0;font-size:11px;color:#475569;font-family:monospace;">
                StreamBotKH Security Notification • Automated Account Protection
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const smtp = getSmtpConfig();
  return sendMailSafely(
    smtp,
    { to: toEmail, subject, text: textBody, html: htmlBody },
    `account deletion security alert email (@${username})`
  );
}

/**
 * Sends a notification email to the client when upgraded to the Pro Plan.
 * Provides complete breakdown of Pro perks: 20,000 daily tokens (10x boost),
 * 20MB cloud storage, watermark-free broadcast, and zero fees on Bakong KHQR.
 */
export async function sendProPlanUpgradeEmail(
  params: ProPlanUpgradeEmailParams
): Promise<{ sent: boolean; simulated?: boolean; error?: string }> {
  const {
    toEmail,
    displayName,
    username,
    planDurationDays,
    planExpiresAt,
    planStartedAt,
    action,
    dashboardUrl
  } = params;

  if (!toEmail || !toEmail.includes('@')) {
    return { sent: false, error: 'Invalid recipient email address' };
  }

  const appUrl = (
    dashboardUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://streambotkh.com'
  ).replace(/\/$/, '');
  const creatorUrl = `${appUrl}/creator`;

  const isExtend = action === 'extend';
  const isTrial = action === 'trial';
  const expiresDate = planExpiresAt ? new Date(planExpiresAt) : null;
  const formattedExpiresAt =
    expiresDate && !isNaN(expiresDate.getTime())
      ? expiresDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Permanent / Unlimited';

  const startedDate = planStartedAt ? new Date(planStartedAt) : new Date();
  const formattedStartedAt =
    !isNaN(startedDate.getTime())
      ? startedDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Today';

  const subject = isExtend
    ? `⚡ [StreamWidgets] Your Pro Plan has been extended (+${planDurationDays} Days)`
    : isTrial
    ? `⚡ [StreamWidgets] Your Pro Free Trial is Active (${planDurationDays} Days)`
    : `🎉 Welcome to StreamWidgets Pro — Your 10x Upgrade is Active!`;

  const badgeText = isExtend
    ? '⚡ PRO PLAN EXTENDED'
    : isTrial
    ? '⚡ PRO TRIAL ACTIVATED'
    : '⚡ PRO PLAN ACTIVATED';

  const heading = isExtend
    ? 'Pro Plan Extended'
    : isTrial
    ? 'Welcome to StreamWidgets Pro Trial'
    : 'Welcome to StreamWidgets Pro';

  const heroSub = isExtend
    ? `Your subscription has been extended by ${planDurationDays} days. Valid until ${formattedExpiresAt}.`
    : isTrial
    ? `Your account now has full access to StreamWidgets Pro for ${planDurationDays} days on us.`
    : `Your creator account has been upgraded with 10x daily tokens, 20MB cloud storage, and watermark-free overlays.`;

  const textBody = `
STREAMWIDGETS — PRO PLAN ${isExtend ? 'EXTENDED' : 'ACTIVATED'}
============================================================

Hello ${displayName || username} (@${username}),

${
  isExtend
    ? `Your StreamWidgets Pro subscription has been successfully extended for ${planDurationDays} days!`
    : `Congratulations! Your StreamWidgets account has been upgraded to the Pro Plan.`
}

PLAN DETAILS:
• Account Handle: @${username}
• Plan Status: PRO CREATOR (Active)
• Duration: ${planDurationDays} Days
• Activated On: ${formattedStartedAt}
• Valid Until: ${formattedExpiresAt}
• Daily Usage Limit: 20,000 Tokens / day (10x Boost)
• Storage Quota: 20 MB Cloud Storage (4x Boost)
• Overlay Branding: 100% Watermark Free

WHAT IS UNLOCKED WITH PRO:
1. 10x Daily Usage Limit (20,000 Tokens/Day)
   - Dual token system unlocked: free tokens are consumed first, then seamlessly drawn from your 20,000 Pro tokens. Daily reset occurs at 2:00 PM SGT.
2. 20MB Cloud Storage (4x Boost)
   - Upload custom audio soundboard SFX, high-fps animated celebration GIFs, and custom overlays without running out of room.
3. 100% Watermark-Free Overlays
   - StreamWidgets branding and watermarks are completely removed from all your OBS browser sources.
4. 0% Platform Commission
   - Accept instant tips directly into your personal ABA Mobile or NBC Bakong KHQR account with zero platform fees.
5. Full Access to All Stream Widgets
   - Retro Chat Avatars, Wheel of Fortune, Subathon Timers, Goal Bars, Media Share, and Leaderboards.

ACCESS YOUR CREATOR DASHBOARD:
${creatorUrl}

COMMUNITY & SUPPORT:
• Telegram: https://t.me/streambotkh
• Discord: https://discord.gg/streambotkh
• Documentation: ${appUrl}/documentation

Happy streaming,
The StreamWidgets Team
${appUrl}
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#05070E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#05070E;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#0A0E1A;border:1px solid #1E293B;border-radius:16px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.85);">
          
          <!-- Top Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#0c1a2e 0%,#042533 50%,#09131d 100%);padding:32px 32px 28px 32px;border-bottom:1px solid rgba(0,240,255,0.25);text-align:left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:rgba(0,240,255,0.12);border:1px solid rgba(0,240,255,0.35);color:#00F0FF;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:12px;">
                      ${badgeText}
                    </div>
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;line-height:1.25;">
                      ${heading}
                    </h1>
                    <p style="margin:8px 0 0 0;font-size:14px;color:#94A3B8;line-height:1.5;">
                      ${heroSub}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px;">
              
              <!-- Greeting -->
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#CBD5E1;">
                Hello <strong style="color:#FFFFFF;">${displayName || username}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94A3B8;">
                ${
                  isExtend
                    ? `Your <strong>StreamWidgets Pro</strong> plan has been successfully extended. Your creator overlays and widgets remain active with unlimited pro perks.`
                    : `Your account has been upgraded to <strong>StreamWidgets Pro</strong>! You now have full access to our top-tier broadcast features, dual-token capacity, and zero watermark presence.`
                }
              </p>

              <!-- Plan Details Summary Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#070A12;border:1px solid #1E293B;border-radius:12px;padding:18px 20px;margin-bottom:28px;">
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;">Account Handle:</td>
                  <td style="padding:8px 0;font-size:13px;color:#FFFFFF;font-weight:700;font-family:monospace;text-align:right;">@${username}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Plan Status:</td>
                  <td style="padding:8px 0;text-align:right;border-top:1px solid #141C2E;">
                    <span style="display:inline-block;padding:2px 8px;border-radius:6px;background-color:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.35);color:#34D399;font-size:11px;font-weight:800;letter-spacing:0.5px;">
                      ACTIVE PRO
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Duration:</td>
                  <td style="padding:8px 0;font-size:13px;color:#E2E8F0;font-weight:700;text-align:right;border-top:1px solid #141C2E;">${planDurationDays} Days</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Valid Until:</td>
                  <td style="padding:8px 0;font-size:13px;color:#38BDF8;font-weight:700;font-family:monospace;text-align:right;border-top:1px solid #141C2E;">${formattedExpiresAt}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Daily Usage Limit:</td>
                  <td style="padding:8px 0;font-size:13px;color:#00F0FF;font-weight:800;font-family:monospace;text-align:right;border-top:1px solid #141C2E;">20,000 Tokens / day (10x Boost)</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Cloud Storage:</td>
                  <td style="padding:8px 0;font-size:13px;color:#A78BFA;font-weight:700;text-align:right;border-top:1px solid #141C2E;">100 MB (5x Storage)</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Overlay Watermark:</td>
                  <td style="padding:8px 0;font-size:13px;color:#34D399;font-weight:700;text-align:right;border-top:1px solid #141C2E;">100% Removed</td>
                </tr>
              </table>

              <!-- Benefits List -->
              <h3 style="margin:0 0 16px 0;font-size:14px;font-weight:800;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.8px;">
                🚀 Your Pro Plan Benefits
              </h3>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 16px;background-color:#0D1424;border:1px solid #1E293B;border-radius:10px;">
                    <div style="font-size:13px;font-weight:700;color:#00F0FF;margin-bottom:4px;">
                      ⚡ 10x Daily Usage Limit (20,000 Tokens/Day)
                    </div>
                    <div style="font-size:12px;line-height:1.5;color:#94A3B8;">
                      Enjoy dual-token safety: your daily free tokens are consumed first, then seamlessly drawn from your 20,000 Pro tokens. Daily reset takes place every day at 2:00 PM SGT (06:00 UTC).
                    </div>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="padding:14px 16px;background-color:#0D1424;border:1px solid #1E293B;border-radius:10px;">
                    <div style="font-size:13px;font-weight:700;color:#A78BFA;margin-bottom:4px;">
                      🗄️ 20MB Cloud Storage (4x Capacity)
                    </div>
                    <div style="font-size:12px;line-height:1.5;color:#94A3B8;">
                      Upload your own custom MP3 soundboard sound bites, transparent alert GIFs, custom badges, and celebration stickers without running out of room.
                    </div>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="padding:14px 16px;background-color:#0D1424;border:1px solid #1E293B;border-radius:10px;">
                    <div style="font-size:13px;font-weight:700;color:#34D399;margin-bottom:4px;">
                      ✨ 100% Watermark-Free Broadcast
                    </div>
                    <div style="font-size:12px;line-height:1.5;color:#94A3B8;">
                      Every overlay, goal bar, and alert animation renders cleanly on your OBS Studio or Streamlabs stream without any StreamWidgets watermark branding.
                    </div>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="padding:14px 16px;background-color:#0D1424;border:1px solid #1E293B;border-radius:10px;">
                    <div style="font-size:13px;font-weight:700;color:#38BDF8;margin-bottom:4px;">
                      💸 0% Commission on Direct Bank Tips
                    </div>
                    <div style="font-size:12px;line-height:1.5;color:#94A3B8;">
                      Direct peer-to-peer donor tips through NBC Bakong KHQR and ABA Mobile transfer directly into your personal bank account with zero fees taken by the platform.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Call To Action Button -->
              <div style="text-align:center;padding:12px 0 24px 0;">
                <a href="${creatorUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#00F0FF 0%,#00B4D8 100%);color:#05070E;font-size:14px;font-weight:800;text-decoration:none;border-radius:10px;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 0 25px rgba(0,240,255,0.4);">
                  Open Creator Dashboard →
                </a>
              </div>

              <!-- Community & Help Box -->
              <div style="background-color:#070A12;border:1px solid #1E293B;border-radius:10px;padding:14px 16px;font-size:12px;line-height:1.6;color:#64748B;text-align:center;">
                Need help setting up your OBS overlays? Check our <a href="${appUrl}/documentation" style="color:#00F0FF;text-decoration:underline;">Documentation Guide</a> or join our creator community on <a href="https://t.me/streambotkh" style="color:#38BDF8;text-decoration:underline;">Telegram</a> and <a href="https://discord.gg/streambotkh" style="color:#818CF8;text-decoration:underline;">Discord</a>.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#060810;padding:20px 32px;border-top:1px solid #1E293B;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#94A3B8;letter-spacing:0.5px;">
                StreamWidgets • The Premier Livestream Overlay &amp; Donation Gateway
              </p>
              <p style="margin:0;font-size:11px;color:#475569;font-family:monospace;">
                This notification was sent to ${toEmail} regarding your account @${username}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const smtp = getSmtpConfig('StreamWidgets');
  return sendMailSafely(
    smtp,
    { to: toEmail, subject, text: textBody, html: htmlBody },
    `Pro Plan upgrade email (@${username})`
  );
}

/**
 * Sends a warm welcome email to first-time sign-in creators.
 * Includes dashboard link, OBS Studio video tutorial & setup guide, Bakong KHQR setup, and community channels.
 */
export async function sendWelcomeEmail(
  params: WelcomeEmailParams
): Promise<{ sent: boolean; simulated?: boolean; error?: string }> {
  const { toEmail, displayName, username, dashboardUrl } = params;

  if (!toEmail || !toEmail.includes('@')) {
    return { sent: false, error: 'Invalid recipient email address' };
  }

  const appUrl = (
    dashboardUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://streambotkh.com'
  ).replace(/\/$/, '');
  const creatorUrl = `${appUrl}/creator`;
  const obsTutorialUrl = `${appUrl}/documentation/obs-studio`;
  const paymentGatewayUrl = `${creatorUrl}?tab=payment-gateway`;

  const subject = `👋 Welcome to StreamWidgets — Let's setup your live stream alerts!`;

  const textBody = `
WELCOME TO STREAMWIDGETS!
==========================

Hello ${displayName || username} (@${username}),

Welcome to StreamWidgets! We are delighted to have you join Cambodia's premier live stream overlay & donation platform.

Whether you stream gaming, chatting, or live events on YouTube, TikTok Live, or Facebook Gaming, StreamWidgets gives you all the tools to engage viewers and monetize with zero platform cuts.

QUICK START GUIDE:
1. Creator Dashboard
   Customize your Alert Box, Retro Chat Avatars, Goal Bars, and Soundboard:
   ${creatorUrl}

2. OBS Browser Source Setup & Video Guide
   Copy your overlay link and add it to OBS Studio or Streamlabs Desktop in under 2 minutes:
   ${obsTutorialUrl}

3. Connect Your Bakong KHQR & ABA Mobile
   Accept instant viewer tips with 0% platform commission directly into your personal Cambodian bank account:
   ${paymentGatewayUrl}

COMMUNITY & 24/7 SUPPORT:
• Telegram Channel: https://t.me/streambotkh
• Discord Community: https://discord.gg/streambotkh
• Guides & Docs: ${appUrl}/documentation

Happy streaming!
The StreamWidgets Team
${appUrl}
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to StreamWidgets</title>
</head>
<body style="margin:0;padding:0;background-color:#05070E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#05070E;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#0A0E1A;border:1px solid #1E293B;border-radius:16px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.85);">
          
          <!-- Top Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#0c1a2e 0%,#042533 50%,#09131d 100%);padding:32px 32px 28px 32px;border-bottom:1px solid rgba(0,240,255,0.25);">
              <div style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:rgba(0,240,255,0.12);border:1px solid rgba(0,240,255,0.35);color:#00F0FF;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:12px;">
                ✨ WELCOME TO STREAMWIDGETS
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;line-height:1.25;">
                Welcome, ${displayName || username}!
              </h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#94A3B8;line-height:1.5;">
                Your creator account has been successfully created. Let's get your stream overlays ready to broadcast!
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px;">
              
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#CBD5E1;">
                Hello <strong style="color:#FFFFFF;">${displayName || username}</strong> (@${username}),
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94A3B8;">
                Welcome to <strong>StreamWidgets</strong>! We are thrilled to have you join Cambodia's dedicated live streaming platform. Everything is set up so you can accept real-time tips, showcase animated overlays, and interact with your chat community.
              </p>

              <!-- Quick Steps -->
              <h3 style="margin:0 0 16px 0;font-size:14px;font-weight:800;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.8px;">
                ⚡ 3 Steps to Get Started
              </h3>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:16px;background-color:#0D1424;border:1px solid #1E293B;border-radius:12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top">
                          <div style="width:28px;height:28px;border-radius:8px;background-color:rgba(0,240,255,0.15);border:1px solid rgba(0,240,255,0.3);color:#00F0FF;text-align:center;line-height:28px;font-weight:800;font-size:13px;">1</div>
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:14px;font-weight:700;color:#FFFFFF;margin-bottom:4px;">
                            Explore Your Creator Dashboard
                          </div>
                          <div style="font-size:12px;line-height:1.5;color:#94A3B8;margin-bottom:8px;">
                            Configure your Alert Box animations, retro chat avatars, bilingual Khmer/English TTS sound synthesizers, and goal progress trackers.
                          </div>
                          <a href="${creatorUrl}" style="font-size:12px;color:#00F0FF;text-decoration:none;font-weight:700;">
                            Open Dashboard &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:12px;"></td></tr>
                <tr>
                  <td style="padding:16px;background-color:#0D1424;border:1px solid #1E293B;border-radius:12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top">
                          <div style="width:28px;height:28px;border-radius:8px;background-color:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.3);color:#A855F7;text-align:center;line-height:28px;font-weight:800;font-size:13px;">2</div>
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:14px;font-weight:700;color:#FFFFFF;margin-bottom:4px;">
                            OBS Studio Browser Source Guide
                          </div>
                          <div style="font-size:12px;line-height:1.5;color:#94A3B8;margin-bottom:8px;">
                            Copy your unique transparent overlay URLs and paste them straight into OBS Studio, Streamlabs, or Prism Live Studio in under 2 minutes.
                          </div>
                          <a href="${obsTutorialUrl}" style="font-size:12px;color:#A855F7;text-decoration:none;font-weight:700;">
                            View Video Tutorial &amp; Guide &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:12px;"></td></tr>
                <tr>
                  <td style="padding:16px;background-color:#0D1424;border:1px solid #1E293B;border-radius:12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top">
                          <div style="width:28px;height:28px;border-radius:8px;background-color:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10B981;text-align:center;line-height:28px;font-weight:800;font-size:13px;">3</div>
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:14px;font-weight:700;color:#FFFFFF;margin-bottom:4px;">
                            Connect Bakong KHQR &amp; ABA Mobile
                          </div>
                          <div style="font-size:12px;line-height:1.5;color:#94A3B8;margin-bottom:8px;">
                            Accept instant live tips via NBC Bakong KHQR with 0% platform cuts. 100% of viewer donations go directly to your bank account.
                          </div>
                          <a href="${paymentGatewayUrl}" style="font-size:12px;color:#10B981;text-decoration:none;font-weight:700;">
                            Setup Payment Gateway &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Big CTA Button -->
              <div style="text-align:center;padding:12px 0 24px 0;">
                <a href="${creatorUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#00F0FF 0%,#00B4D8 100%);color:#05070E;font-size:14px;font-weight:800;text-decoration:none;border-radius:10px;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 0 25px rgba(0,240,255,0.4);">
                  Launch Creator Dashboard →
                </a>
              </div>

              <!-- Community Support Box -->
              <div style="background-color:#070A12;border:1px solid #1E293B;border-radius:10px;padding:14px 16px;font-size:12px;line-height:1.6;color:#64748B;text-align:center;">
                Need assistance? Our streamer community is here to help! Join our official <a href="https://t.me/streambotkh" style="color:#00F0FF;text-decoration:underline;">Telegram Channel</a> or <a href="https://discord.gg/streambotkh" style="color:#818CF8;text-decoration:underline;">Discord Community Hub</a>.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#060810;padding:20px 32px;border-top:1px solid #1E293B;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#94A3B8;letter-spacing:0.5px;">
                StreamWidgets • The Premier Livestream Overlay &amp; Donation Gateway
              </p>
              <p style="margin:0;font-size:11px;color:#475569;font-family:monospace;">
                Sent to ${toEmail} for account @${username}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const smtp = getSmtpConfig('StreamWidgets');
  return sendMailSafely(
    smtp,
    { to: toEmail, subject, text: textBody, html: htmlBody },
    `Welcome email (@${username})`
  );
}

/**
 * Sends a reminder email 3 days before the Pro plan expires.
 * Clearly communicates that expiration occurs at 12:00 AM midnight (Asia/Phnom_Penh / Singapore).
 */
export async function sendProPlanExpiringSoonEmail(
  params: ProPlanExpiringSoonEmailParams
): Promise<{ sent: boolean; simulated?: boolean; error?: string }> {
  const { toEmail, displayName, username, daysLeft, planExpiresAt, dashboardUrl } = params;

  if (!toEmail || !toEmail.includes('@')) {
    return { sent: false, error: 'Invalid recipient email address' };
  }

  const appUrl = (
    dashboardUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://streambotkh.com'
  ).replace(/\/$/, '');
  const pricingUrl = `${appUrl}/pricing`;

  const expiresDate = new Date(planExpiresAt);
  const formattedExpiresAt = !isNaN(expiresDate.getTime())
    ? expiresDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Upcoming Date';

  const subject = `⏰ [StreamWidgets] Your Pro Plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — Renew to keep 10x benefits`;

  const textBody = `
STREAMWIDGETS — PRO PLAN EXPIRING SOON
======================================

Hello ${displayName || username} (@${username}),

This is a friendly reminder that your StreamWidgets Pro Plan will expire in ${daysLeft} day${daysLeft === 1 ? '' : 's'}:
• Expiration Date: ${formattedExpiresAt} at 12:00 AM Midnight (Asia/Phnom_Penh / Singapore)
• Account: @${username}

WHAT HAPPENS IF YOUR PLAN EXPIRES:
• AI Token Limit: Reverts from 20,000 down to 2,000 daily tokens.
• Stream Overlay: StreamWidgets watermark will reappear on your broadcast screens.
• Cloud Storage: Storage quota returns from 20MB to 5MB.
• DONATIONS: Your Bakong KHQR, ABA alerts, and live overlay links will continue working uninterrupted with 0% platform cuts!

RENEW YOUR PRO PLAN:
To maintain your 10x daily token boost (20,000 tokens), 20MB cloud storage, and watermark-free overlays, renew your Pro Plan ($4.99 / 31 days) before midnight:
${pricingUrl}

Happy streaming,
The StreamWidgets Team
${appUrl}
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pro Plan Expiring Soon</title>
</head>
<body style="margin:0;padding:0;background-color:#05070E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#05070E;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#0A0E1A;border:1px solid #1E293B;border-radius:16px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.85);">
          
          <!-- Top Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#2e1e0c 0%,#3d2806 50%,#191206 100%);padding:32px 32px 28px 32px;border-bottom:1px solid rgba(245,158,11,0.35);">
              <div style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:#FBBF24;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:12px;">
                ⏰ ${daysLeft} DAY${daysLeft === 1 ? '' : 'S'} REMAINING
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;line-height:1.25;">
                Your Pro Plan is Expiring Soon
              </h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#FDE68A;line-height:1.5;">
                Your subscription ends on ${formattedExpiresAt} at 12:00 AM Midnight.
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#CBD5E1;">
                Hello <strong style="color:#FFFFFF;">${displayName || username}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94A3B8;">
                This is a quick courtesy notification that your <strong>StreamWidgets Pro</strong> subscription for <strong style="color:#FFFFFF;">@${username}</strong> is scheduled to expire in <strong>${daysLeft} days</strong> at <strong>12:00 AM midnight</strong> (Cambodia / Singapore time).
              </p>

              <!-- Expiry Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#070A12;border:1px solid #1E293B;border-radius:12px;padding:18px 20px;margin-bottom:28px;">
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;">Account Handle:</td>
                  <td style="padding:8px 0;font-size:13px;color:#FFFFFF;font-weight:700;font-family:monospace;text-align:right;">@${username}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Expiration Time:</td>
                  <td style="padding:8px 0;font-size:13px;color:#FBBF24;font-weight:700;font-family:monospace;text-align:right;border-top:1px solid #141C2E;">12:00 AM Midnight</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Expiration Date:</td>
                  <td style="padding:8px 0;font-size:13px;color:#FBBF24;font-weight:700;font-family:monospace;text-align:right;border-top:1px solid #141C2E;">${formattedExpiresAt}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Timezone:</td>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;text-align:right;border-top:1px solid #141C2E;">Asia/Phnom_Penh (UTC+7) / Singapore (UTC+8)</td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color:#0D1424;border:1px solid #1E293B;border-radius:12px;padding:18px;margin-bottom:24px;">
                <h4 style="margin:0 0 8px 0;font-size:13px;font-weight:800;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.5px;">
                  What Happens Upon Expiration?
                </h4>
                <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.7;color:#94A3B8;">
                  <li>Daily AI usage limit will return from <strong>20,000 to 2,000 tokens/day</strong>.</li>
                  <li>The StreamWidgets watermark will reappear on your overlay screens.</li>
                  <li>Cloud storage quota will adjust from <strong>20MB to 5MB</strong>.</li>
                  <li><strong style="color:#34D399;">Good news:</strong> Your Bakong KHQR tips, ABA alerts, and live overlay links will remain 100% online with 0% platform commission!</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;padding:12px 0 24px 0;">
                <a href="${pricingUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#F59E0B 0%,#D97706 100%);color:#05070E;font-size:14px;font-weight:800;text-decoration:none;border-radius:10px;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 0 25px rgba(245,158,11,0.35);">
                  Review &amp; Renew Pro Plan ($4.99) →
                </a>
              </div>

              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;text-align:center;">
                You can renew anytime directly from your dashboard or our <a href="${pricingUrl}" style="color:#00F0FF;text-decoration:underline;">Pricing Page</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#060810;padding:20px 32px;border-top:1px solid #1E293B;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#94A3B8;letter-spacing:0.5px;">
                StreamWidgets • The Premier Livestream Overlay &amp; Donation Gateway
              </p>
              <p style="margin:0;font-size:11px;color:#475569;font-family:monospace;">
                Subscription notice sent to ${toEmail} for @${username}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const smtp = getSmtpConfig('StreamWidgets');
  return sendMailSafely(
    smtp,
    { to: toEmail, subject, text: textBody, html: htmlBody },
    `Pro Plan 3-day reminder email (@${username})`
  );
}

/**
 * Sends a notification email when a creator's Pro plan expires at midnight.
 * Prompts them to review their subscription and renew to re-enable 10x token capacity, 20MB storage, and watermark removal.
 */
export async function sendProPlanExpiredEmail(
  params: ProPlanExpiredEmailParams
): Promise<{ sent: boolean; simulated?: boolean; error?: string }> {
  const { toEmail, displayName, username, planExpiresAt, dashboardUrl } = params;

  if (!toEmail || !toEmail.includes('@')) {
    return { sent: false, error: 'Invalid recipient email address' };
  }

  const appUrl = (
    dashboardUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://streambotkh.com'
  ).replace(/\/$/, '');
  const pricingUrl = `${appUrl}/pricing`;

  const expiresDate = new Date(planExpiresAt);
  const formattedExpiresAt = !isNaN(expiresDate.getTime())
    ? expiresDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recently';

  const subject = `⚠️ [StreamWidgets] Your Pro Plan has expired — Review your subscription`;

  const textBody = `
STREAMWIDGETS — PRO PLAN EXPIRED
================================

Hello ${displayName || username} (@${username}),

Your StreamWidgets Pro Plan expired at 12:00 AM Midnight on ${formattedExpiresAt}.
Your account has now been automatically transitioned to the Free Plan.

CURRENT PLAN STATUS:
• Account Handle: @${username}
• Plan Status: Free Plan (Active)
• Daily Usage Limit: 2,000 Tokens / day
• Cloud Storage: 5 MB
• Overlays: Active with StreamWidgets Watermark

YOUR STREAM REMAINS ACTIVE:
Don't worry! Your OBS overlays, Bakong KHQR QR codes, and ABA Mobile live donation alerts will continue working as normal with 0% platform cuts.

WANT TO RESTORE PRO BENEFITS?
Renew your Pro Plan for just $4.99 / 31 days to immediately restore:
• 20,000 daily AI tokens (10x boost)
• 20MB cloud storage
• 100% watermark-free broadcast overlays

Review and renew your plan here:
${pricingUrl}

Happy streaming,
The StreamWidgets Team
${appUrl}
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pro Plan Expired</title>
</head>
<body style="margin:0;padding:0;background-color:#05070E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#05070E;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#0A0E1A;border:1px solid #1E293B;border-radius:16px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.85);">
          
          <!-- Top Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#2e1111 0%,#3d1414 50%,#1a0808 100%);padding:32px 32px 28px 32px;border-bottom:1px solid rgba(239,68,68,0.35);">
              <div style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#FCA5A5;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:12px;">
                ⚠️ SUBSCRIPTION EXPIRED
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;line-height:1.25;">
                Your Pro Plan Has Expired
              </h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#FECACA;line-height:1.5;">
                Expired on ${formattedExpiresAt} at 12:00 AM Midnight. Account transitioned to Free Plan.
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#CBD5E1;">
                Hello <strong style="color:#FFFFFF;">${displayName || username}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94A3B8;">
                Your <strong>StreamWidgets Pro</strong> subscription for <strong style="color:#FFFFFF;">@${username}</strong> ended on <strong>${formattedExpiresAt} at 12:00 AM Midnight</strong> (Cambodia / Singapore time). Your account has now transitioned back to the <strong>Free Plan</strong>.
              </p>

              <!-- Current Plan Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#070A12;border:1px solid #1E293B;border-radius:12px;padding:18px 20px;margin-bottom:28px;">
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;">Account Handle:</td>
                  <td style="padding:8px 0;font-size:13px;color:#FFFFFF;font-weight:700;font-family:monospace;text-align:right;">@${username}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Current Plan:</td>
                  <td style="padding:8px 0;text-align:right;border-top:1px solid #141C2E;">
                    <span style="display:inline-block;padding:2px 8px;border-radius:6px;background-color:rgba(100,116,139,0.2);border:1px solid rgba(148,163,184,0.3);color:#CBD5E1;font-size:11px;font-weight:800;letter-spacing:0.5px;">
                      FREE PLAN
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Daily AI Usage:</td>
                  <td style="padding:8px 0;font-size:13px;color:#E2E8F0;font-weight:700;text-align:right;border-top:1px solid #141C2E;">2,000 Tokens / day</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Cloud Storage:</td>
                  <td style="padding:8px 0;font-size:13px;color:#E2E8F0;font-weight:700;text-align:right;border-top:1px solid #141C2E;">20 MB</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#94A3B8;border-top:1px solid #141C2E;">Overlays:</td>
                  <td style="padding:8px 0;font-size:13px;color:#FCA5A5;font-weight:700;text-align:right;border-top:1px solid #141C2E;">Watermark Active</td>
                </tr>
              </table>

              <!-- Safe Notice -->
              <div style="background-color:#0D1424;border:1px solid #1E293B;border-radius:12px;padding:18px;margin-bottom:24px;">
                <h4 style="margin:0 0 6px 0;font-size:13px;font-weight:800;color:#34D399;text-transform:uppercase;letter-spacing:0.5px;">
                  ✓ Your Live Stream Tips Remain 100% Active
                </h4>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94A3B8;">
                  Your NBC Bakong KHQR codes, ABA Mobile alert popups, sound effects, and viewer donation records remain online without interruption. You continue to receive 100% of viewer donations directly into your bank account.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;padding:12px 0 24px 0;">
                <a href="${pricingUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#00F0FF 0%,#00B4D8 100%);color:#05070E;font-size:14px;font-weight:800;text-decoration:none;border-radius:10px;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 0 25px rgba(0,240,255,0.4);">
                  Review Subscription &amp; Renew ($4.99) →
                </a>
              </div>

              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;text-align:center;">
                Have questions or need help? Check our <a href="${pricingUrl}" style="color:#00F0FF;text-decoration:underline;">Plans &amp; Pricing Page</a> or talk to us on <a href="https://t.me/streambotkh" style="color:#38BDF8;text-decoration:underline;">Telegram</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#060810;padding:20px 32px;border-top:1px solid #1E293B;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#94A3B8;letter-spacing:0.5px;">
                StreamWidgets • The Premier Livestream Overlay &amp; Donation Gateway
              </p>
              <p style="margin:0;font-size:11px;color:#475569;font-family:monospace;">
                Subscription notice sent to ${toEmail} for @${username}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const smtp = getSmtpConfig('StreamWidgets');
  return sendMailSafely(
    smtp,
    { to: toEmail, subject, text: textBody, html: htmlBody },
    `Pro Plan expired notification email (@${username})`
  );
}
