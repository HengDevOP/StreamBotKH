import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

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

function getSmtpConfig(customFromName?: string) {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465;
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const fromName = (customFromName || process.env.SMTP_FROM_NAME || 'StreamWidget').trim();
  const fromEmail = (process.env.SMTP_FROM_EMAIL || user || 'notifications@streamwidget.com').trim();

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
STREAMBOTKH SECURITY ALERT — ACCOUNT DELETION REQUESTED
=======================================================

Hello ${displayName || username} (@${username}),

We received a request to permanently delete your StreamBotKH creator account associated with ${toEmail}.

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
   Sign in to your StreamBotKH Dashboard and click "Cancel Request Deletion" in My Account -> Danger Zone before ${formattedScheduledAt}:
   ${accountSettingsUrl}

2. Secure Your Google Account:
   Change your Google password immediately, enable 2-Step Verification, and revoke any unfamiliar signed-in devices.

3. Rotate Your Stream Keys:
   Regenerate your OBS Overlay Token in your StreamBotKH Dashboard.

If you intentionally requested this deletion, no further action is needed. Your account will be automatically removed after the 7-day grace period.

Stay safe,
StreamBotKH Security & Trust Team
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

  if (!smtp.isConfigured) {
    console.warn(
      `⚠️ [Nodemailer] SMTP credentials (SMTP_USER / SMTP_PASS) are not configured in .env. Logged security email for ${toEmail} (@${username}).`
    );
    return {
      sent: false,
      simulated: true,
      error: 'SMTP credentials not configured in .env'
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
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody
    });

    console.log(`📧 [Nodemailer] Sent account deletion security alert email to ${toEmail}`);
    return { sent: true };
  } catch (err: any) {
    console.error(`❌ [Nodemailer] Failed to send account deletion email to ${toEmail}:`, err?.message || err);
    return {
      sent: false,
      error: err?.message || 'Failed to send email via SMTP'
    };
  }
}

/**
 * Sends a notification email to the client when upgraded to the Pro Plan.
 * Provides complete breakdown of Pro perks: 20,000 daily tokens (10x boost),
 * 100MB cloud storage, watermark-free broadcast, and zero fees on Bakong KHQR.
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
    ? `⚡ [StreamWidget] Your Pro Plan has been extended (+${planDurationDays} Days)`
    : isTrial
    ? `⚡ [StreamWidget] Your Pro Free Trial is Active (${planDurationDays} Days)`
    : `🎉 Welcome to StreamWidget Pro — Your 10x Upgrade is Active!`;

  const badgeText = isExtend
    ? '⚡ PRO PLAN EXTENDED'
    : isTrial
    ? '⚡ PRO TRIAL ACTIVATED'
    : '⚡ PRO PLAN ACTIVATED';

  const heading = isExtend
    ? 'Pro Plan Extended'
    : isTrial
    ? 'Welcome to StreamWidget Pro Trial'
    : 'Welcome to StreamWidget Pro';

  const heroSub = isExtend
    ? `Your subscription has been extended by ${planDurationDays} days. Valid until ${formattedExpiresAt}.`
    : isTrial
    ? `Your account now has full access to StreamWidget Pro for ${planDurationDays} days on us.`
    : `Your creator account has been upgraded with 10x daily tokens, 100MB cloud storage, and watermark-free overlays.`;
    ? `Your subscription has been extended by ${planDurationDays} days. Valid until ${formattedExpiresAt}.`
    : `Your creator account has been upgraded with 10x daily tokens, 100MB cloud storage, and watermark-free overlays.`;

  const textBody = `
STREAMWIDGET — PRO PLAN ${isExtend ? 'EXTENDED' : 'ACTIVATED'}
============================================================

Hello ${displayName || username} (@${username}),

${
  isExtend
    ? `Your StreamWidget Pro subscription has been successfully extended for ${planDurationDays} days!`
    : `Congratulations! Your StreamWidget account has been upgraded to the Pro Plan.`
}

PLAN DETAILS:
• Account Handle: @${username}
• Plan Status: PRO CREATOR (Active)
• Duration: ${planDurationDays} Days
• Activated On: ${formattedStartedAt}
• Valid Until: ${formattedExpiresAt}
• Daily Usage Limit: 20,000 Tokens / day (10x Boost)
• Storage Quota: 100 MB Cloud Storage (5x Boost)
• Overlay Branding: 100% Watermark Free

WHAT IS UNLOCKED WITH PRO:
1. 10x Daily Usage Limit (20,000 Tokens/Day)
   - Dual token system unlocked: free tokens are consumed first, then seamlessly drawn from your 20,000 Pro tokens. Daily reset occurs at 2:00 PM SGT.
2. 100MB Cloud Storage (5x Boost)
   - Upload custom audio soundboard SFX, high-fps animated celebration GIFs, and custom overlays without running out of room.
3. 100% Watermark-Free Overlays
   - StreamWidget branding and watermarks are completely removed from all your OBS browser sources.
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
The StreamWidget Team
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
                    ? `Your <strong>StreamWidget Pro</strong> plan has been successfully extended. Your creator overlays and widgets remain active with unlimited pro perks.`
                    : `Your account has been upgraded to <strong>StreamWidget Pro</strong>! You now have full access to our top-tier broadcast features, dual-token capacity, and zero watermark presence.`
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
                      🗄️ 100MB Cloud Storage (5x Capacity)
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
                      Every overlay, goal bar, and alert animation renders cleanly on your OBS Studio or Streamlabs stream without any StreamWidget watermark branding.
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
                StreamWidget • The Premier Livestream Overlay &amp; Donation Gateway
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

  const smtp = getSmtpConfig('StreamWidget');

  if (!smtp.isConfigured) {
    console.warn(
      `⚠️ [Nodemailer] SMTP credentials (SMTP_USER / SMTP_PASS) not configured in .env. Logged Pro upgrade email for ${toEmail} (@${username}).`
    );
    return {
      sent: false,
      simulated: true,
      error: 'SMTP credentials not configured in .env'
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
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody
    });

    console.log(`📧 [Nodemailer] Sent Pro Plan upgrade email to ${toEmail} (@${username})`);
    return { sent: true };
  } catch (err: any) {
    console.error(`❌ [Nodemailer] Failed to send Pro Plan email to ${toEmail}:`, err?.message || err);
    return {
      sent: false,
      error: err?.message || 'Failed to send email via SMTP'
    };
  }
}
