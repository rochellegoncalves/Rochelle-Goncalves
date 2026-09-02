import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/requireOwner';
import { createAdminClient } from '../../../../../lib/supabaseAdmin';

export async function GET(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');

  const admin = createAdminClient();
  let query = admin.from('crm_activities').select('*').order('data', { ascending: false });
  if (from) query = query.gte('data', from);

  const { data, error: dbError } = await query;
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ activities: data || [] });
}

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  if (!body.contactNome || !body.tipo) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: insertError } = await admin.from('crm_activities').insert({
    contact_nome: body.contactNome,
    tipo: body.tipo,
    data: body.data || new Date().toISOString().slice(0, 10),
    obs: body.obs || null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
