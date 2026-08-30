import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/requireOwner';
import { createAdminClient } from '../../../../../lib/supabaseAdmin';
import { generateContractPdf } from '../../../../../lib/generateContractPdf';

const AUTENTIQUE_ENDPOINT = 'https://api.autentique.com.br/v2/graphql';

const CREATE_DOCUMENT_MUTATION = `
mutation CreateDocumentMutation(
  $sandbox: Boolean
  $document: DocumentInput!
  $signers: [SignerInput!]!
  $file: Upload!
) {
  createDocument(
    sandbox: $sandbox
    document: $document
    signers: $signers
    file: $file
  ) {
    id
    name
    signatures {
      public_id
      name
      email
      link { short_link }
      email_events { sent delivered opened refused reason }
    }
  }
}
`;

const SIGN_DOCUMENT_MUTATION = `
mutation SignDocumentMutation($id: UUID!) {
  signDocument(id: $id)
}
`;

// Manda o PDF do contrato pro Autentique pra coleta de assinatura
// eletrônica, guarda o PDF (ainda não assinado) na área do cliente, e
// registra o id do documento no Autentique nessa mesma linha -- é assim
// que o webhook (/api/webhooks/autentique) depois encontra qual cliente
// atualizar quando o documento for assinado.
export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { clientId } = await request.json();
  if (!clientId) {
    return NextResponse.json({ error: 'missing_client_id' }, { status: 400 });
  }

  const token = process.env.AUTENTIQUE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'autentique_token_not_configured' }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: client, error: dbError } = await admin
    .from('clients')
    .select(
      'id, company_name, cpf_cnpj, address, phone, admin_name, admin_cpf, admin_rg, admin_email, admin_nationality, admin_marital_status, admin_profession, monthly_value, contract_start_date'
    )
    .eq('id', clientId)
    .single();

  if (dbError || !client) {
    return NextResponse.json({ error: dbError?.message || 'client_not_found' }, { status: 404 });
  }

  const { data: userData } = await admin.auth.admin.getUserById(clientId);
  const loginEmail = userData?.user?.email || '';
  const signerEmail = client.admin_email || loginEmail;
  const signerName = client.admin_name || client.company_name;

  if (!signerEmail) {
    return NextResponse.json({ error: 'missing_signer_email' }, { status: 400 });
  }

  const pdfBytes = await generateContractPdf({
    companyName: client.company_name,
    cpfCnpj: client.cpf_cnpj,
    address: client.address,
    phone: client.phone,
    email: loginEmail,
    adminName: client.admin_name,
    adminCpf: client.admin_cpf,
    adminRg: client.admin_rg,
    adminEmail: client.admin_email,
    adminNationality: client.admin_nationality,
    adminMaritalStatus: client.admin_marital_status,
    adminProfession: client.admin_profession,
    monthlyValue: client.monthly_value,
    contractStartDate: client.contract_start_date,
  });

  const ownerEmail = process.env.AUTENTIQUE_OWNER_EMAIL;
  const signers = [{ email: signerEmail, action: 'SIGN', name: signerName }];
  if (ownerEmail) {
    signers.push({ email: ownerEmail, action: 'SIGN', name: 'Rochelle Gonçalves' });
  }

  const variables = {
    sandbox: false,
    document: { name: `Contrato - ${client.company_name}`.slice(0, 199) },
    signers,
    file: null,
  };

  const formData = new FormData();
  formData.append('operations', JSON.stringify({ query: CREATE_DOCUMENT_MUTATION, variables }));
  formData.append('map', JSON.stringify({ file: ['variables.file'] }));
  formData.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), `contrato-${clientId}.pdf`);

  const autentiqueRes = await fetch(AUTENTIQUE_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await autentiqueRes.json().catch(() => null);

  if (!autentiqueRes.ok || result?.errors) {
    return NextResponse.json(
      { error: 'autentique_error', status: autentiqueRes.status, details: result?.errors || result },
      { status: 502 }
    );
  }

  const doc = result?.data?.createDocument;

  let ownerSignError = null;
  if (ownerEmail && doc?.id) {
    const signRes = await fetch(AUTENTIQUE_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SIGN_DOCUMENT_MUTATION, variables: { id: doc.id } }),
    });
    const signResult = await signRes.json().catch(() => null);
    if (!signRes.ok || signResult?.errors) {
      ownerSignError = signResult?.errors || signResult;
    }
  }

  const filePath = `${clientId}/contrato-enviado-${Date.now()}.pdf`;
  const { error: uploadError } = await admin.storage
    .from('documents')
    .upload(filePath, Buffer.from(pdfBytes), { contentType: 'application/pdf' });

  if (!uploadError) {
    await admin.from('documents').insert({
      client_id: clientId,
      name: 'Contrato de Prestação de Serviços (aguardando assinatura)',
      category: 'Contrato',
      file_path: filePath,
      autentique_document_id: doc?.id || null,
    });
  }

  return NextResponse.json({
    ok: true,
    documentId: doc?.id,
    signerName,
    signerEmail,
    signatures: doc?.signatures || [],
    ownerAutoSigned: !!ownerEmail && !ownerSignError,
    ownerSignError,
  });
}
