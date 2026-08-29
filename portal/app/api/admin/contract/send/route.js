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
    }
  }
}
`;

// Manda o PDF do contrato pro Autentique pra coleta de assinatura
// eletrônica. O signatário é o administrador cadastrado (ou o e-mail de
// login do cliente, se não houver e-mail do administrador). O Autentique
// já cuida de avisar o signatário por e-mail.
export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { clientId } = await request.json();
  if (!clientId) {
    return NextResponse.json({ error: 'missing_client_id' }, { status: 400 });
  }

  const token = process.env.AUTENTIQUE_TOKEN;
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

  const variables = {
    sandbox: false,
    document: { name: `Contrato - ${client.company_name}`.slice(0, 199) },
    signers: [{ email: signerEmail, action: 'SIGN' }],
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
  return NextResponse.json({
    ok: true,
    documentId: doc?.id,
    signerEmail,
    signerName,
    signLink: doc?.signatures?.[0]?.link?.short_link || null,
  });
}
