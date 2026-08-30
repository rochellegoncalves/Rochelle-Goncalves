import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

function mapEntry(e) {
  return {
    id: e.id,
    clientId: e.client_id,
    description: e.description,
    startedAt: e.started_at,
    endedAt: e.ended_at,
  };
}

export async function GET(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const admin = createAdminClient();

  let query = admin.from('time_entries').select('*').order('started_at', { ascending: false });
  if (clientId) query = query.eq('client_id', clientId);
  if (from) query = query.gte('started_at', from);
  if (to) query = query.lte('started_at', to);

  const { data, error: dbError } = await query;
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const { data: runningRows } = await admin
    .from('time_entries')
    .select('*')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1);

  return NextResponse.json({
    entries: data.map(mapEntry),
    running: runningRows?.[0] ? mapEntry(runningRows[0]) : null,
  });
}

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  const { clientId, description, startedAt, endedAt } = body;
  if (!clientId || !startedAt) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: insertError } = await admin.from('time_entries').insert({
    client_id: clientId,
    description: description || null,
    started_at: startedAt,
    ended_at: endedAt || null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  const { id, clientId, description, startedAt, endedAt } = body;
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const fields = {};
  if (clientId !== undefined) fields.client_id = clientId;
  if (description !== undefined) fields.description = description || null;
  if (startedAt !== undefined) fields.started_at = startedAt;
  if (endedAt !== undefined) fields.ended_at = endedAt || null;

  const admin = createAdminClient();
  const { error: updateError } = await admin.from('time_entries').update(fields).eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
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
  const { error: deleteError } = await admin.from('time_entries').delete().eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
