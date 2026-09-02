import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const admin = createAdminClient();
  const [{ data: doneRows, error: doneError }, { data: pageRows, error: pageError }] = await Promise.all([
    admin.from('methodology_checklist').select('*'),
    admin.from('methodology_pages').select('*'),
  ]);

  if (doneError) return NextResponse.json({ error: doneError.message }, { status: 500 });
  if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 });

  const done = {};
  for (const row of doneRows || []) done[row.item_key] = row.done;

  const content = {};
  for (const row of pageRows || []) content[row.item_key] = row.content || '';

  return NextResponse.json({ done, content });
}

export async function PATCH(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { itemKey, done, content } = await request.json();
  if (!itemKey) {
    return NextResponse.json({ error: 'missing_item_key' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (done !== undefined) {
    const { error: doneError } = await admin
      .from('methodology_checklist')
      .upsert({ item_key: itemKey, done: !!done, updated_at: new Date().toISOString() }, { onConflict: 'item_key' });
    if (doneError) return NextResponse.json({ error: doneError.message }, { status: 500 });
  }

  if (content !== undefined) {
    const { error: contentError } = await admin
      .from('methodology_pages')
      .upsert({ item_key: itemKey, content, updated_at: new Date().toISOString() }, { onConflict: 'item_key' });
    if (contentError) return NextResponse.json({ error: contentError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
