import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from('clients')
    .select('id, company_name, created_at, documents(count)')
    .order('created_at', { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const clients = data.map((c) => ({
    id: c.id,
    companyName: c.company_name,
    createdAt: c.created_at,
    documentCount: c.documents?.[0]?.count ?? 0,
  }));

  return NextResponse.json({ clients });
}

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { companyName, email } = await request.json();
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

  const { error: insertError } = await admin
    .from('clients')
    .insert({ id: userData.user.id, company_name: companyName });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ id: userData.user.id, companyName, email });
}
