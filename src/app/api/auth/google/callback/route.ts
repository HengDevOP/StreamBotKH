import { NextRequest, NextResponse } from 'next/server';
import {
  generateToken,
  isGoogleOAuthConfigured,
  resolveFrontendOrigin,
  resolveRedirectUri,
  upsertGoogleStreamer
} from '../route';

export async function GET(req: NextRequest) {
  let frontendOrigin = resolveFrontendOrigin(req);
  let redirectUri = resolveRedirectUri(frontendOrigin);

  const stateParam = req.nextUrl.searchParams.get('state');
  if (stateParam) {
    try {
      const parsed = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf8'));
      if (parsed.origin && /^https?:\/\//i.test(parsed.origin)) {
        frontendOrigin = parsed.origin.replace(/\/$/, '');
      }
      if (parsed.redirectUri && /^https?:\/\//i.test(parsed.redirectUri)) {
        redirectUri = parsed.redirectUri;
      }
    } catch {
      // Fallback to resolved origin
    }
  }

  const oauthError = req.nextUrl.searchParams.get('error');
  if (oauthError) {
    const desc = req.nextUrl.searchParams.get('error_description') || oauthError;
    return NextResponse.redirect(`${frontendOrigin}/login?error=${encodeURIComponent(desc)}`, 302);
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(
      `${frontendOrigin}/login?error=${encodeURIComponent('Missing authorization code from Google')}`,
      302
    );
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      `${frontendOrigin}/login?error=${encodeURIComponent('Google OAuth is not configured on the server (.env)')}`,
      302
    );
  }

  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

    // 1. Exchange authorization code for access_token & id_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'Failed to exchange Google OAuth token';
      console.error('[Auth] Google token exchange failed:', tokenData);
      return NextResponse.redirect(`${frontendOrigin}/login?error=${encodeURIComponent(errMsg)}`, 302);
    }

    // 2. Fetch Google UserInfo profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userData = await userRes.json();
    if (!userRes.ok || !userData.email) {
      console.error('[Auth] Google userinfo failed:', userData);
      return NextResponse.redirect(
        `${frontendOrigin}/login?error=${encodeURIComponent('Could not retrieve email from Google account')}`,
        302
      );
    }

    // 3. Upsert streamer in SQLite & MongoDB Atlas
    const streamer = await upsertGoogleStreamer({
      email: userData.email,
      name: userData.name || userData.given_name || 'Streamer',
      picture: userData.picture || ''
    });

    // 4. Sign JWT and redirect back to frontend
    const jwtToken = generateToken(streamer);
    return NextResponse.redirect(`${frontendOrigin}/login?token=${encodeURIComponent(jwtToken)}`, 302);
  } catch (err: any) {
    console.error('[Auth] Google OAuth callback error:', err);
    return NextResponse.redirect(
      `${frontendOrigin}/login?error=${encodeURIComponent(err.message || 'Google authentication failed')}`,
      302
    );
  }
}
