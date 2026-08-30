import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/requireOwner';
import { createAdminClient } from '../../../../../lib/supabaseAdmin';
import { getDriveClient, extractDocId } from '../../../../../lib/googleSheets';

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { clientId, docUrl, name, category } = await request.json();
  if (!clientId || !docUrl || !name) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const docId = extractDocId(docUrl);
  const drive = getDriveClient();

  let pdfBytes;
  try {
    const res = await drive.files.export(
      { fileId: docId, mimeType: 'application/pdf' },
      { responseType: 'arraybuffer' }
    );
    pdfBytes = Buffer.from(res.data);
  } catch (e) {
    return NextResponse.json(
      { error: 'google_drive_error', message: e.message },
      { status: 502 }
    );
  }

  const admin = createAdminClient();
  const filePath = `${clientId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9-_.]/g, '_')}.pdf`;

  const { error: uploadError } = await admin.storage
    .from('documents')
    .upload(filePath, pdfBytes, { contentType: 'application/pdf' });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: insertError } = await admin.from('documents').insert({
    client_id: clientId,
    name,
    category: category || null,
    file_path: filePath,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
