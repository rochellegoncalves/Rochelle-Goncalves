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

// Records a document that was already uploaded straight to Supabase Storage
// from the browser (via a signed upload URL from /api/admin/documents/sign).
// Keeping the actual file bytes out of this route avoids Vercel's ~4.5MB
// serverless request body limit.
export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { clientId, name, category, filePath } = await request.json();
  if (!clientId || !name || !filePath) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: insertError } = await admin
    .from('documents')
    .insert({ client_id: clientId, name, category: category || '', file_path: filePath });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, filePath });
}

export async function DELETE(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const documentId = new URL(request.url).searchParams.get('id');
  if (!documentId) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: doc, error: fetchError } = await admin
    .from('documents')
    .select('file_path')
    .eq('id', documentId)
    .single();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const { error: storageError } = await admin.storage.from('documents').remove([doc.file_path]);
  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: deleteError } = await admin.from('documents').delete().eq('id', documentId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
