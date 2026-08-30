import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

const SELECT_FIELDS =
  'id, company_name, cpf_cnpj, address, phone, admin_name, admin_cpf, admin_rg, admin_email, admin_nationality, admin_marital_status, admin_profession, monthly_value, contract_start_date, active, created_at, documents(id, category, created_at)';

function mapClient(c, email) {
  const docs = c.documents || [];
  const signedContract = docs
    .filter((d) => d.category === 'Contrato assinado')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  return {
    id: c.id,
    companyName: c.company_name,
    email: email || '',
    cpfCnpj: c.cpf_cnpj,
    address: c.address,
    phone: c.phone,
    adminName: c.admin_name,
    adminCpf: c.admin_cpf,
    adminRg: c.admin_rg,
    adminEmail: c.admin_email,
    adminNationality: c.admin_nationality,
    adminMaritalStatus: c.admin_marital_status,
    adminProfession: c.admin_profession,
    monthlyValue: c.monthly_value,
    contractStartDate: c.contract_start_date,
    active: c.active,
    createdAt: c.created_at,
    documentCount: docs.length,
    signedContractDocumentId: signedContract?.id || null,
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
    admin_nationality: body.adminNationality || null,
    admin_marital_status: body.adminMaritalStatus || null,
    admin_profession: body.adminProfession || null,
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

  const emails = await Promise.all(
    data.map(async (c) => {
      const { data: userData } = await admin.auth.admin.getUserById(c.id);
      return userData?.user?.email || '';
    })
  );

  return NextResponse.json({ clients: data.map((c, i) => mapClient(c, emails[i])) });
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
  if (!body.id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Toggle rápido de ativo/inativo (não mexe nos outros campos)
  if (typeof body.active === 'boolean' && !body.companyName) {
    const { error: toggleError } = await admin
      .from('clients')
      .update({ active: body.active })
      .eq('id', body.id);
    if (toggleError) {
      return NextResponse.json({ error: toggleError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!body.companyName) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from('clients')
    .update(fieldsFromBody(body))
    .eq('id', body.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (body.email) {
    const { error: emailError } = await admin.auth.admin.updateUserById(body.id, {
      email: body.email,
      email_confirm: true,
    });
    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: docs } = await admin.from('documents').select('file_path').eq('client_id', id);
  if (docs?.length) {
    await admin.storage.from('documents').remove(docs.map((d) => d.file_path));
  }

  // Apagar o usuário do Auth já apaga em cascata as linhas em clients e
  // documents (FK "on delete cascade" no schema).
  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
