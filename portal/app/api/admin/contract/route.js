import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';
import { generateContractPdf } from '../../../../lib/generateContractPdf';

function slugify(text) {
  return (text || 'cliente')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const clientId = new URL(request.url).searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'missing_client_id' }, { status: 400 });
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

  const pdfBytes = await generateContractPdf({
    companyName: client.company_name,
    cpfCnpj: client.cpf_cnpj,
    address: client.address,
    phone: client.phone,
    email: userData?.user?.email || '',
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

  const fileName = `contrato-${slugify(client.company_name)}-${Date.now()}.pdf`;
  const filePath = `${clientId}/${fileName}`;

  const { error: uploadError } = await admin.storage
    .from('documents')
    .upload(filePath, Buffer.from(pdfBytes), { contentType: 'application/pdf' });

  if (!uploadError) {
    await admin
      .from('documents')
      .insert({ client_id: clientId, name: 'Contrato de Prestação de Serviços', category: 'Contrato', file_path: filePath });
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
