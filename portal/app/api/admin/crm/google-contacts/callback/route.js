import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../../lib/requireOwner';
import { saveTokensFromCode } from '../../../../../../lib/googleOAuth';

export async function GET(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(new URL(`/admin/crm?google_error=${encodeURIComponent(oauthError)}`, url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/admin/crm?google_error=missing_code', url.origin));
  }

  try {
    await saveTokensFromCode(code);
  } catch (e) {
    return NextResponse.redirect(new URL(`/admin/crm?google_error=${encodeURIComponent(e.message)}`, url.origin));
  }

  return NextResponse.redirect(new URL('/admin/crm?google_connected=1', url.origin));
}
