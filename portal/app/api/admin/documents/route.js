import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const clientId = new URL(request.url).searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'missing_client_id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from('documents')
    .select('id, name, category, file_path, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get('file');
  const clientId = formData.get('clientId');
  const name = formData.get('name');
  const category = formData.get('category') || '';

  if (!file || !clientId || !name) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const filePath = `${clientId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await admin.storage
    .from('documents')
    .upload(filePath, file, { contentType: file.type || 'application/octet-stream' });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: insertError } = await admin
    .from('documents')
    .insert({ client_id: clientId, name, category, file_path: filePath });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, filePath });
}
