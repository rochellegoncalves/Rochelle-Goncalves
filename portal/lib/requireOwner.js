import { NextResponse } from 'next/server';
import { createClient } from './supabaseServer';

// Returns { user } if the caller is signed in as the account owner, or a
// 403 NextResponse to return immediately otherwise.
export async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerEmail = process.env.OWNER_EMAIL;
  if (!user || !ownerEmail || user.email !== ownerEmail) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { user };
}
