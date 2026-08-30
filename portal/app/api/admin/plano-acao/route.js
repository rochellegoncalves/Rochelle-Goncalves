import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';
import { getSheetsClient, extractSpreadsheetId } from '../../../../lib/googleSheets';

const SHEET_TAB = 'Ações';

// Nomes exatos das colunas de cabeçalho na planilha. Cada cliente pode ter
// as colunas em posições diferentes (algumas planilhas têm uma coluna A
// vazia antes de "Reunião", outras não), então detectamos a posição de
// cada campo pelo texto do cabeçalho em vez de assumir uma letra fixa.
const HEADER_NAMES = {
  reuniao: 'Reunião',
  diagnostico: 'Diagnóstico',
  acao: 'Ação',
  prazo: 'Prazo',
  responsavel: 'Responsável',
  status: 'Status',
  obs: 'OBS',
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

function getCell(row, index) {
  if (index == null || index === -1) return '';
  return row[index] || '';
}

function columnIndexToLetter(index) {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

// Acha a linha de cabeçalho procurando "Reunião" e "Ação" em qualquer
// coluna, e devolve o índice de cada campo dentro dessa linha.
function findHeader(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const indexOf = (name) => row.findIndex((cell) => (cell || '').trim() === name);
    const acaoIdx = indexOf(HEADER_NAMES.acao);
    const reuniaoIdx = indexOf(HEADER_NAMES.reuniao);
    if (acaoIdx !== -1 && reuniaoIdx !== -1) {
      const columns = {};
      for (const [field, label] of Object.entries(HEADER_NAMES)) {
        columns[field] = indexOf(label);
      }
      return { rowIndex: i, columns };
    }
  }
  return null;
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
      range: `${SHEET_TAB}!A1:Z1000`,
    });
    rows = res.data.values || [];
  } catch (e) {
    return NextResponse.json(
      { error: 'google_sheets_error', message: e.message },
      { status: 502 }
    );
  }

  const header = findHeader(rows);
  if (!header) {
    return NextResponse.json(
      { error: 'header_not_found', note: `Não encontrei a linha de cabeçalho com "Reunião"/"Ação" na aba "${SHEET_TAB}".` },
      { status: 422 }
    );
  }

  const { columns } = header;
  const items = [];
  for (let i = header.rowIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const acao = getCell(r, columns.acao).trim();
    if (!acao) continue;
    items.push({
      rowNumber: i + 1,
      reuniao: parseDateBRtoISO(getCell(r, columns.reuniao)),
      diagnostico: getCell(r, columns.diagnostico),
      acao,
      prazo: parseDateBRtoISO(getCell(r, columns.prazo)),
      responsavel: getCell(r, columns.responsavel),
      status: getCell(r, columns.status),
      obs: getCell(r, columns.obs),
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

  if (!HEADER_NAMES[field]) {
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

  let rows;
  try {
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TAB}!A1:Z1000`,
    });
    rows = headerRes.data.values || [];
  } catch (e) {
    return NextResponse.json({ error: 'google_sheets_error', message: e.message }, { status: 502 });
  }

  const header = findHeader(rows);
  if (!header || header.columns[field] === -1) {
    return NextResponse.json(
      { error: 'header_not_found', note: `Não encontrei a coluna "${HEADER_NAMES[field]}" na aba "${SHEET_TAB}".` },
      { status: 422 }
    );
  }
  const column = columnIndexToLetter(header.columns[field]);

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
