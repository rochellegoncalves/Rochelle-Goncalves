import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

const SELECT_FIELDS =
  'id, company_name, cpf_cnpj, address, phone, admin_name, admin_cpf, admin_rg, admin_email, monthly_value, contract_start_date, created_at, documents(count)';

function mapClient(c) {
  return {
    id: c.id,
    companyName: c.company_name,
    cpfCnpj: c.cpf_cnpj,
    address: c.address,
    phone: c.phone,
    adminName: c.admin_name,
    adminCpf: c.admin_cpf,
    adminRg: c.admin_rg,
    adminEmail: c.admin_email,
    monthlyValue: c.monthly_value,
    contractStartDate: c.contract_start_date,
    createdAt: c.created_at,
    documentCount: c.documents?.[0]?.count ?? 0,
  };
}

function fieldsFromBody(body) {
  return {
    company_name: body.companyName,
    cpf_cnpj: body.cpfCnpj || null,
    address: body.address || null,
    phone: body.phone || null,
    admin_name: body.adminName || null,
    admin_cpf: body.adminCpf || null,
    admin_rg: body.adminRg || null,
    admin_email: body.adminEmail || null,
    monthly_value: body.monthlyValue ? Number(body.monthlyValue) : null,
    contract_start_date: body.contractStartDate || null,
  };
}

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from('clients')
    .select(SELECT_FIELDS)
    .order('created_at', { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ clients: data.map(mapClient) });
}

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  if (!body.companyName || !body.email) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: userData, error: createUserError } = await admin.auth.admin.createUser({
    email: body.email,
    email_confirm: true,
  });

  if (createUserError) {
    return NextResponse.json({ error: createUserError.message }, { status: 400 });
  }

  const { error: insertError } = await admin
    .from('clients')
    .insert({ id: userData.user.id, ...fieldsFromBody(body) });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ id: userData.user.id, companyName: body.companyName, email: body.email });
}

export async function PATCH(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  if (!body.id || !body.companyName) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from('clients')
    .update(fieldsFromBody(body))
    .eq('id', body.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
