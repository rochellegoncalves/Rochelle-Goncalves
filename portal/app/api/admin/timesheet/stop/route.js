import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/requireOwner';
import { createAdminClient } from '../../../../../lib/supabaseAdmin';

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from('time_entries')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id)
    .is('ended_at', null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
