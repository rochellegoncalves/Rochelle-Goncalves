import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';
import { getSheetsClient, extractSpreadsheetId } from '../../../../lib/googleSheets';

const SHEET_TAB = 'Ações';
const FIELD_COLUMN = {
  reuniao: 'B',
  diagnostico: 'C',
  acao: 'D',
  prazo: 'E',
  responsavel: 'F',
  status: 'G',
  obs: 'H',
};

function parseDateBRtoISO(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function formatDateISOtoBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function findHeaderRowIndex(rows) {
  return rows.findIndex((r) => (r[3] || '').trim() === 'Ação' && (r[1] || '').trim() === 'Reunião');
}

async function getClientSheetUrl(admin, clientId) {
  const { data, error } = await admin
    .from('clients')
    .select('plano_acao_sheet_url')
    .eq('id', clientId)
    .single();
  if (error) throw new Error(error.message);
  return data?.plano_acao_sheet_url || null;
}

export async function GET(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const clientId = new URL(request.url).searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'missing_client_id' }, { status: 400 });
  }

  const admin = createAdminClient();
  let sheetUrl;
  try {
    sheetUrl = await getClientSheetUrl(admin, clientId);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  if (!sheetUrl) {
    return NextResponse.json({ error: 'sheet_not_configured' }, { status: 404 });
  }

  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  const sheets = getSheetsClient();

  let rows;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TAB}!A1:H1000`,
    });
    rows = res.data.values || [];
  } catch (e) {
    return NextResponse.json(
      { error: 'google_sheets_error', message: e.message },
      { status: 502 }
    );
  }

  const headerIdx = findHeaderRowIndex(rows);
  if (headerIdx === -1) {
    return NextResponse.json(
      { error: 'header_not_found', note: `Não encontrei a linha de cabeçalho com "Reunião"/"Ação" na aba "${SHEET_TAB}".` },
      { status: 422 }
    );
  }

  const items = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const acao = (r[3] || '').trim();
    if (!acao) continue;
    items.push({
      rowNumber: i + 1,
      reuniao: parseDateBRtoISO(r[1]),
      diagnostico: r[2] || '',
      acao,
      prazo: parseDateBRtoISO(r[4]),
      responsavel: r[5] || '',
      status: r[6] || '',
      obs: r[7] || '',
    });
  }

  return NextResponse.json({ items });
}

export async function PATCH(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { clientId, rowNumber, field, value } = await request.json();
  if (!clientId || !rowNumber || !field) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const column = FIELD_COLUMN[field];
  if (!column) {
    return NextResponse.json({ error: 'invalid_field' }, { status: 400 });
  }

  const admin = createAdminClient();
  let sheetUrl;
  try {
    sheetUrl = await getClientSheetUrl(admin, clientId);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  if (!sheetUrl) {
    return NextResponse.json({ error: 'sheet_not_configured' }, { status: 404 });
  }

  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  const sheets = getSheetsClient();

  const cellValue = field === 'prazo' || field === 'reuniao' ? formatDateISOtoBR(value) : value || '';

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_TAB}!${column}${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[cellValue]] },
    });
  } catch (e) {
    return NextResponse.json({ error: 'google_sheets_error', message: e.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
