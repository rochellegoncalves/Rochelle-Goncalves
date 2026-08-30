import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

const AUTENTIQUE_ENDPOINT = 'https://api.autentique.com.br/v2/graphql';

const DOCUMENT_QUERY = `
query DocumentQuery($id: UUID!) {
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
// área do cliente. Aceita GET e POST pra dar pra disparar manualmente
// (conferir/forçar) além do disparo automático do Autentique.
async function handler(request) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (!process.env.AUTENTIQUE_WEBHOOK_SECRET || secret !== process.env.AUTENTIQUE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const token = process.env.AUTENTIQUE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: true, note: 'autentique_token_not_configured' });
  }

  const admin = createAdminClient();
  const { data: pending, error: pendingError } = await admin
    .from('documents')
    .select('id, client_id, file_path, autentique_document_id')
    .eq('category', 'Contrato')
    .not('autentique_document_id', 'is', null);

  if (pendingError) {
    return NextResponse.json({ ok: false, error: pendingError.message }, { status: 500 });
  }

  const updated = [];
  const details = [];

  for (const doc of pending || []) {
    const entry = { documentId: doc.id, autentiqueDocumentId: doc.autentique_document_id };
    try {
      const queryRes = await fetch(AUTENTIQUE_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: DOCUMENT_QUERY, variables: { id: doc.autentique_document_id } }),
      });
      const queryResult = await queryRes.json().catch(() => null);

      if (queryResult?.errors) {
        entry.status = 'autentique_query_error';
        entry.errors = queryResult.errors;
        details.push(entry);
        continue;
      }

      const signedUrl = queryResult?.data?.document?.files?.signed;
      if (!signedUrl) {
        entry.status = 'not_signed_yet';
        details.push(entry);
        continue;
      }

      const pdfRes = await fetch(signedUrl);
      if (!pdfRes.ok) {
        entry.status = 'failed_to_download_signed_pdf';
        entry.httpStatus = pdfRes.status;
        details.push(entry);
        continue;
      }
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

      const newPath = `${doc.client_id}/contrato-assinado-${Date.now()}.pdf`;
      const { error: uploadError } = await admin.storage
        .from('documents')
        .upload(newPath, pdfBuffer, { contentType: 'application/pdf' });
      if (uploadError) {
        entry.status = 'failed_to_upload';
        entry.error = uploadError.message;
        details.push(entry);
        continue;
      }

      await admin.storage.from('documents').remove([doc.file_path]);
      await admin
        .from('documents')
        .update({
          name: 'Contrato de Prestação de Serviços (assinado)',
          category: 'Contrato assinado',
          file_path: newPath,
        })
        .eq('id', doc.id);

      entry.status = 'updated';
      details.push(entry);
      updated.push(doc.id);
    } catch (err) {
      entry.status = 'exception';
      entry.error = err.message;
      details.push(entry);
    }
  }

  return NextResponse.json({ ok: true, checked: pending?.length || 0, updated, details });
}

export const GET = handler;
export const POST = handler;
