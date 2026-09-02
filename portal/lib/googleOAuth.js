import { google } from 'googleapis';
import { createAdminClient } from './supabaseAdmin';

// Fixo porque precisa bater exatamente com o que está cadastrado no
// Google Cloud Console (Credenciais -> esse ID de cliente OAuth).
const REDIRECT_URI = 'https://clientes.rochellegoncalves.com.br/api/admin/crm/google-contacts/callback';
const SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'];

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    REDIRECT_URI
  );
}

export function getGoogleAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function saveTokensFromCode(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  const admin = createAdminClient();

  let refreshToken = tokens.refresh_token;
  if (!refreshToken) {
    // O Google só reenvia o refresh_token na primeira autorização;
    // numa reconexão, mantemos o que já estava salvo.
    const { data: existing } = await admin
      .from('oauth_tokens')
      .select('refresh_token')
      .eq('provider', 'google_contacts')
      .maybeSingle();
    refreshToken = existing?.refresh_token || null;
  }

  await admin.from('oauth_tokens').upsert(
    {
      provider: 'google_contacts',
      access_token: tokens.access_token || null,
      refresh_token: refreshToken,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'provider' }
  );
}

// Devolve um client OAuth2 já autenticado (o googleapis renova o
// access_token sozinho a partir do refresh_token quando precisar).
export async function getAuthenticatedGoogleContactsClient() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('oauth_tokens')
    .select('refresh_token')
    .eq('provider', 'google_contacts')
    .maybeSingle();

  if (!data?.refresh_token) return null;

  const client = getOAuthClient();
  client.setCredentials({ refresh_token: data.refresh_token });
  return client;
}
