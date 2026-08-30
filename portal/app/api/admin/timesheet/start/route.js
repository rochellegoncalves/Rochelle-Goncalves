import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/requireOwner';
import { createAdminClient } from '../../../../../lib/supabaseAdmin';

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { clientId, description } = await request.json();
  if (!clientId) {
    return NextResponse.json({ error: 'missing_client_id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Só um cronômetro roda por vez -- iniciar um novo encerra o anterior
  // automaticamente, como trocar de tarefa num timer comum.
  await admin.from('time_entries').update({ ended_at: now }).is('ended_at', null);

  const { data, error: insertError } = await admin
    .from('time_entries')
    .insert({ client_id: clientId, description: description || null, started_at: now })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    clientId: data.client_id,
    description: data.description,
    startedAt: data.started_at,
    endedAt: data.ended_at,
  });
}
