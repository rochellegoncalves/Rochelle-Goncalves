import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { getSheetsClient, getTrackingSpreadsheetId } from '../../../../lib/googleSheets';
import { getCrmContacts } from '../../../../lib/crmData';
import { createAdminClient } from '../../../../lib/supabaseAdmin';

const SHEET_TAB = '🌱 Relacionamentos';

// Nomes exatos das colunas de cabeçalho na planilha. Detectamos a
// posição de cada campo pelo texto do cabeçalho (não por letra fixa),
// mesmo padrão usado no Plano de Ação.
const HEADER_NAMES = {
  nome: 'Nome',
  origem: 'Origem',
  segmento: 'Segmento',
  objetivo: 'Objetivo',
  potencial: 'Potencial',
  status: 'Status',
  dataContato: 'Data Contato',
  valorProposta: 'Valor da Proposta',
};

function columnIndexToLetter(index) {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

function findHeader(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const indexOf = (name) => row.findIndex((cell) => (cell || '').trim() === name);
    const nomeIdx = indexOf(HEADER_NAMES.nome);
    const statusIdx = indexOf(HEADER_NAMES.status);
    if (nomeIdx !== -1 && statusIdx !== -1) {
      const columns = {};
      for (const [field, label] of Object.entries(HEADER_NAMES)) {
        columns[field] = indexOf(label);
      }
      return { rowIndex: i, columns };
    }
  }
  return null;
}

function formatDateISOtoBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

async function fetchRows(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TAB}!A1:Z1000`,
  });
  return res.data.values || [];
}

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  let contacts;
  try {
    contacts = await getCrmContacts();
  } catch (e) {
    return NextResponse.json({ error: 'google_sheets_error', message: e.message }, { status: 502 });
  }

  return NextResponse.json({ contacts });
}

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  if (!body.nome) {
    return NextResponse.json({ error: 'missing_nome' }, { status: 400 });
  }

  const spreadsheetId = getTrackingSpreadsheetId();
  const sheets = getSheetsClient();

  let rows;
  try {
    rows = await fetchRows(sheets, spreadsheetId);
  } catch (e) {
    return NextResponse.json({ error: 'google_sheets_error', message: e.message }, { status: 502 });
  }

  const header = findHeader(rows);
  if (!header) {
    return NextResponse.json(
      { error: 'header_not_found', note: `Não encontrei a linha de cabeçalho com "Nome"/"Status" na aba "${SHEET_TAB}".` },
      { status: 422 }
    );
  }

  const maxIndex = Math.max(...Object.values(header.columns).filter((i) => i !== -1));
  const rowValues = new Array(maxIndex + 1).fill('');
  const set = (field, value) => {
    const idx = header.columns[field];
    if (idx !== -1) rowValues[idx] = value ?? '';
  };
  set('nome', body.nome);
  set('origem', body.origem);
  set('segmento', body.segmento);
  set('objetivo', body.objetivo);
  set('potencial', body.potencial);
  set('status', body.status || 'Lead Frio');
  set('dataContato', formatDateISOtoBR(body.dataContato));
  set('valorProposta', body.valorProposta || '');

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_TAB}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues] },
    });
  } catch (e) {
    return NextResponse.json({ error: 'google_sheets_error', message: e.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { rowNumber, field, value } = await request.json();
  if (!rowNumber || !field) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (!HEADER_NAMES[field]) {
    return NextResponse.json({ error: 'invalid_field' }, { status: 400 });
  }

  const spreadsheetId = getTrackingSpreadsheetId();
  const sheets = getSheetsClient();

  let rows;
  try {
    rows = await fetchRows(sheets, spreadsheetId);
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

  const cellValue = field === 'dataContato' ? formatDateISOtoBR(value) : value ?? '';

  // Guardamos o valor anterior de status e o nome antes de escrever,
  // pra saber se essa mudança é a que faz o contato "virar cliente" e
  // registrar isso como um evento (a coluna sozinha não guarda quando
  // isso aconteceu, só o valor atual).
  const previousRow = rows[rowNumber - 1] || [];
  const previousStatus = header.columns.status !== -1 ? previousRow[header.columns.status] || '' : '';
  const nome = header.columns.nome !== -1 ? previousRow[header.columns.nome] || '' : '';

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

  if (field === 'status' && value === 'Cliente' && previousStatus !== 'Cliente' && nome) {
    const admin = createAdminClient();
    await admin.from('crm_activities').insert({
      contact_nome: nome,
      tipo: 'Tornou-se Cliente',
      data: new Date().toISOString().slice(0, 10),
    });
  }

  return NextResponse.json({ ok: true });
}
