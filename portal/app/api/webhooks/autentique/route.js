import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

const AUTENTIQUE_ENDPOINT = 'https://api.autentique.com.br/v2/graphql';

const DOCUMENT_QUERY = `
query DocumentQuery($id: ID!) {
  document(id: $id) {
    id
    files { signed }
  }
}
`;

// Recebido do Autentique sempre que algo muda num documento (visualizado,
// assinado, etc). Em vez de depender do formato exato do payload deles
// (que pode variar por evento), a gente ignora o corpo e simplesmente
// reconfere, no nosso banco, todo contrato marcado como "aguardando
// assinatura" -- pra cada um, pergunta pro Autentique se já tem o PDF
// assinado (files.signed) e, se tiver, baixa e substitui o documento na
// área do cliente.
export async function POST(request) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (!process.env.AUTENTIQUE_WEBHOOK_SECRET || secret !== process.env.AUTENTIQUE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const token = process.env.AUTENTIQUE_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: true, note: 'autentique_token_not_configured' });
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from('documents')
    .select('id, client_id, file_path, autentique_document_id')
    .eq('category', 'Contrato')
    .not('autentique_document_id', 'is', null);

  const updated = [];

  for (const doc of pending || []) {
    const queryRes = await fetch(AUTENTIQUE_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DOCUMENT_QUERY, variables: { id: doc.autentique_document_id } }),
    });
    const queryResult = await queryRes.json().catch(() => null);
    const signedUrl = queryResult?.data?.document?.files?.signed;
    if (!signedUrl) continue;

    const pdfRes = await fetch(signedUrl);
    if (!pdfRes.ok) continue;
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    const newPath = `${doc.client_id}/contrato-assinado-${Date.now()}.pdf`;
    const { error: uploadError } = await admin.storage
      .from('documents')
      .upload(newPath, pdfBuffer, { contentType: 'application/pdf' });
    if (uploadError) continue;

    await admin.storage.from('documents').remove([doc.file_path]);
    await admin
      .from('documents')
      .update({
        name: 'Contrato de Prestação de Serviços (assinado)',
        category: 'Contrato assinado',
        file_path: newPath,
      })
      .eq('id', doc.id);

    updated.push(doc.id);
  }

  return NextResponse.json({ ok: true, updated });
}
