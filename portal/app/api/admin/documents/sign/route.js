import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/requireOwner';
import { createAdminClient } from '../../../../../lib/supabaseAdmin';

// Mints a short-lived, path-scoped upload URL so the browser can send the
// file bytes straight to Supabase Storage, bypassing Vercel's request body
// size limit entirely. This route itself only ever handles a tiny JSON
// payload (client id + file name).
export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { clientId, fileName } = await request.json();
  if (!clientId || !fileName) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const filePath = `${clientId}/${Date.now()}-${safeFileName}`;

  const admin = createAdminClient();
  const { data, error: signError } = await admin.storage
    .from('documents')
    .createSignedUploadUrl(filePath);

  if (signError) {
    return NextResponse.json({ error: signError.message }, { status: 500 });
  }

  return NextResponse.json({ filePath, token: data.token, signedUrl: data.signedUrl });
}
