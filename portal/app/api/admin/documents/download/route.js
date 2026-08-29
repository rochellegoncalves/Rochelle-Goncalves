import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/requireOwner';
import { createAdminClient } from '../../../../../lib/supabaseAdmin';

// Gera uma URL assinada (curta duração) pro arquivo de um documento e
// redireciona pra ela -- assim dá pra usar um <a> normal na tela de
// Documentos pra ver/baixar qualquer arquivo, inclusive um contrato ainda
// não assinado.
export async function GET(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: doc, error: dbError } = await admin
    .from('documents')
    .select('file_path')
    .eq('id', id)
    .single();

  if (dbError || !doc) {
    return NextResponse.json({ error: dbError?.message || 'not_found' }, { status: 404 });
  }

  const { data: signed, error: signError } = await admin.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 60);

  if (signError) {
    return NextResponse.json({ error: signError.message }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
