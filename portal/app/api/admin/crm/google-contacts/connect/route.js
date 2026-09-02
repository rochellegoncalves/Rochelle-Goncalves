import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../../../lib/requireOwner';
import { getGoogleAuthUrl } from '../../../../../../lib/googleOAuth';

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  return NextResponse.redirect(getGoogleAuthUrl());
}
