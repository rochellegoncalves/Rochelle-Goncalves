import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { getSheetsClient, getTrackingSpreadsheetId } from '../../../../lib/googleSheets';

const SHEET_TAB = '⚙️Processos';

// Nomes exatos das colunas de cabeçalho na planilha. Detectamos a
// posição de cada campo pelo texto do cabeçalho (não por letra fixa),
// mesmo padrão usado no Plano de Ação e no CRM. "Coluna 1" (um
// checkbox sem rótulo claro na planilha original) fica de fora.
const HEADER_NAMES = {
  cliente: 'Cliente',
  parteContraria: 'Parte Contrária',
  numeroProcesso: 'Número do Processo',
  dataInicial: 'Data inicial',
  valorCausa: 'Valor da Causa',
  status: 'Status',
  ultimoAndamento: 'Último Andamento',
  dataAndamento: 'Data',
  honorarios: 'Honorários',
  situacao: 'Situação',
  juizo: 'Juízo',
  telefone: 'Telefone',
  email: 'E-mail',
};

const DATE_FIELDS = new Set(['dataInicial', 'dataAndamento']);

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

function findHeader(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const indexOf = (name) => row.findIndex((cell) => (cell || '').trim() === name);
    const clienteIdx = indexOf(HEADER_NAMES.cliente);
    const numeroIdx = indexOf(HEADER_NAMES.numeroProcesso);
    if (clienteIdx !== -1 && numeroIdx !== -1) {
      const columns = {};
      for (const [field, label] of Object.entries(HEADER_NAMES)) {
        columns[field] = indexOf(label);
      }
      return { rowIndex: i, columns };
    }
  }
  return null;
}

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

function parseBRL(str) {
  if (!str) return null;
  const cleaned = (str || '').replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
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
      { error: 'header_not_found', note: `Não encontrei a linha de cabeçalho com "Cliente"/"Número do Processo" na aba "${SHEET_TAB}".` },
      { status: 422 }
    );
  }

  const { columns } = header;
  const processos = [];
  for (let i = header.rowIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const cliente = getCell(r, columns.cliente).trim();
    if (!cliente) continue;
    processos.push({
      rowNumber: i + 1,
      cliente,
      parteContraria: getCell(r, columns.parteContraria),
      numeroProcesso: getCell(r, columns.numeroProcesso),
      dataInicial: parseDateBRtoISO(getCell(r, columns.dataInicial)),
      valorCausa: parseBRL(getCell(r, columns.valorCausa)),
      status: getCell(r, columns.status),
      ultimoAndamento: getCell(r, columns.ultimoAndamento),
      dataAndamento: parseDateBRtoISO(getCell(r, columns.dataAndamento)),
      honorarios: parseBRL(getCell(r, columns.honorarios)),
      situacao: getCell(r, columns.situacao),
      juizo: getCell(r, columns.juizo),
      telefone: getCell(r, columns.telefone),
      email: getCell(r, columns.email),
    });
  }

  return NextResponse.json({ processos });
}

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  if (!body.cliente) {
    return NextResponse.json({ error: 'missing_cliente' }, { status: 400 });
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
      { error: 'header_not_found', note: `Não encontrei a linha de cabeçalho com "Cliente"/"Número do Processo" na aba "${SHEET_TAB}".` },
      { status: 422 }
    );
  }

  const maxIndex = Math.max(...Object.values(header.columns).filter((i) => i !== -1));
  const rowValues = new Array(maxIndex + 1).fill('');
  const set = (field, value) => {
    const idx = header.columns[field];
    if (idx !== -1) rowValues[idx] = value ?? '';
  };
  for (const field of Object.keys(HEADER_NAMES)) {
    if (DATE_FIELDS.has(field)) set(field, formatDateISOtoBR(body[field]));
    else set(field, body[field]);
  }

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
  const cellValue = DATE_FIELDS.has(field) ? formatDateISOtoBR(value) : value ?? '';

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
