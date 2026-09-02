import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../lib/requireOwner';
import { isGoogleContactsConnected, fetchGoogleContacts } from '../../../../../lib/googleContacts';
import { getCrmContacts } from '../../../../../lib/crmData';

function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const connected = await isGoogleContactsConnected();
  if (!connected) {
    return NextResponse.json({ connected: false, contacts: [] });
  }

  let googleContacts;
  try {
    googleContacts = await fetchGoogleContacts();
  } catch (e) {
    return NextResponse.json({ error: 'google_contacts_error', message: e.message }, { status: 502 });
  }

  let crmContacts = [];
  try {
    crmContacts = await getCrmContacts();
  } catch {
    // Se o CRM falhar, ainda mostramos os contatos do Google -- só sem
    // marcar quem já está na base.
  }
  const crmNames = new Set(crmContacts.map((c) => normalize(c.nome)));

  const contacts = googleContacts.map((c) => ({
    ...c,
    alreadyInCrm: crmNames.has(normalize(c.nome)),
  }));

  return NextResponse.json({ connected: true, contacts });
}
