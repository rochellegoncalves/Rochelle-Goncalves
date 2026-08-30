import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/requireOwner';
import { createAdminClient } from '../../../../../lib/supabaseAdmin';

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { clientId } = await request.json();
  if (!clientId) {
    return NextResponse.json({ error: 'missing_client_id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(clientId);
  if (userError || !userData?.user?.email) {
    return NextResponse.json({ error: userError?.message || 'client_not_found' }, { status: 404 });
  }

  // Gera um link de acesso único pro e-mail do cliente, sem precisar
  // saber a senha dele nem esperar um e-mail chegar. Quem abrir o link
  // entra logado como esse cliente -- por isso o front avisa pra abrir
  // numa aba anônima, pra não substituir a sessão de admin no navegador.
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ link: data.properties.action_link });
}
