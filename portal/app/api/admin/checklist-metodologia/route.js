import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin.from('methodology_checklist').select('*');

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const doneMap = {};
  for (const row of data || []) {
    doneMap[row.item_key] = row.done;
  }

  return NextResponse.json({ done: doneMap });
}

export async function PATCH(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { itemKey, done } = await request.json();
  if (!itemKey) {
    return NextResponse.json({ error: 'missing_item_key' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: upsertError } = await admin
    .from('methodology_checklist')
    .upsert({ item_key: itemKey, done: !!done, updated_at: new Date().toISOString() }, { onConflict: 'item_key' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
