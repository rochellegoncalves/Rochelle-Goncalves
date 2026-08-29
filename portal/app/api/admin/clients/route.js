import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from('clients')
    .select(
      'id, company_name, admin_name, cpf_cnpj, address, phone, monthly_value, contract_start_date, created_at, documents(count)'
    )
    .order('created_at', { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const clients = data.map((c) => ({
    id: c.id,
    companyName: c.company_name,
    adminName: c.admin_name,
    cpfCnpj: c.cpf_cnpj,
    address: c.address,
    phone: c.phone,
    monthlyValue: c.monthly_value,
    contractStartDate: c.contract_start_date,
    createdAt: c.created_at,
    documentCount: c.documents?.[0]?.count ?? 0,
  }));

  return NextResponse.json({ clients });
}

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { companyName, email, adminName, cpfCnpj, address, phone, monthlyValue, contractStartDate } =
    await request.json();
  if (!companyName || !email) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: userData, error: createUserError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (createUserError) {
    return NextResponse.json({ error: createUserError.message }, { status: 400 });
  }

  const { error: insertError } = await admin.from('clients').insert({
    id: userData.user.id,
    company_name: companyName,
    admin_name: adminName || null,
    cpf_cnpj: cpfCnpj || null,
    address: address || null,
    phone: phone || null,
    monthly_value: monthlyValue ? Number(monthlyValue) : null,
    contract_start_date: contractStartDate || null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ id: userData.user.id, companyName, email });
}

export async function PATCH(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { id, companyName, adminName, cpfCnpj, address, phone, monthlyValue, contractStartDate } =
    await request.json();
  if (!id || !companyName) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from('clients')
    .update({
      company_name: companyName,
      admin_name: adminName || null,
      cpf_cnpj: cpfCnpj || null,
      address: address || null,
      phone: phone || null,
      monthly_value: monthlyValue ? Number(monthlyValue) : null,
      contract_start_date: contractStartDate || null,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
