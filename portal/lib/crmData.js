import { getSheetsClient, getTrackingSpreadsheetId } from './googleSheets';

const SHEET_TAB = '🌱 Relacionamentos';

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

function getCell(row, index) {
  if (index == null || index === -1) return '';
  return row[index] || '';
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

function parseDateBRtoISO(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseBRL(str) {
  if (!str) return null;
  const cleaned = (str || '').replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
}

// Lê e parseia os contatos do CRM (aba Relacionamentos), reaproveitado
// tanto pela tela de CRM quanto pelos Indicadores (que precisam de
// atividade de relacionamento por semana).
export async function getCrmContacts() {
  const spreadsheetId = getTrackingSpreadsheetId();
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TAB}!A1:Z1000`,
  });
  const rows = res.data.values || [];

  const header = findHeader(rows);
  if (!header) {
    throw new Error(`header_not_found: não encontrei "Nome"/"Status" na aba "${SHEET_TAB}"`);
  }

  const { columns } = header;
  const contacts = [];
  for (let i = header.rowIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const nome = getCell(r, columns.nome).trim();
    if (!nome) continue;
    contacts.push({
      rowNumber: i + 1,
      nome,
      origem: getCell(r, columns.origem),
      segmento: getCell(r, columns.segmento),
      objetivo: getCell(r, columns.objetivo),
      potencial: getCell(r, columns.potencial),
      status: getCell(r, columns.status),
      dataContato: parseDateBRtoISO(getCell(r, columns.dataContato)),
      valorProposta: parseBRL(getCell(r, columns.valorProposta)),
    });
  }

  return contacts;
}
