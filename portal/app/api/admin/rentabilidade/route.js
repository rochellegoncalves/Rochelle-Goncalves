import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { getSheetsClient, getTrackingSpreadsheetId } from '../../../../lib/googleSheets';

const SHEET_TAB = '💰 Financeiro';

function parseBRL(str) {
  if (!str) return 0;
  const cleaned = (str || '').replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return 0;
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? 0 : n;
}

function parseDateToMonthKey(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2, '0')}`;
}

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const spreadsheetId = getTrackingSpreadsheetId();
  const sheets = getSheetsClient();

  let rows;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TAB}!A1:H2000`,
    });
    rows = res.data.values || [];
  } catch (e) {
    return NextResponse.json({ error: 'google_sheets_error', message: e.message }, { status: 502 });
  }

  // Linha 2 (índice 1) é o cabeçalho: Ano, Mês, Data, Tipo, Cliente,
  // Descrição do Serviço, NF, Valor.
  const records = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const cliente = (r[4] || '').trim();
    const tipo = (r[3] || '').trim();
    const monthKey = parseDateToMonthKey(r[2]);
    if (!cliente || !monthKey || (tipo !== 'Recebido' && tipo !== 'Em aberto')) continue;

    records.push({
      monthKey,
      tipo,
      cliente,
      descricao: r[5] || '',
      valor: parseBRL(r[7]),
    });
  }

  const monthlyTotals = {};
  const byClientMonth = {};
  const clientTotals = {};

  for (const rec of records) {
    monthlyTotals[rec.monthKey] = monthlyTotals[rec.monthKey] || { recebido: 0, emAberto: 0 };
    if (rec.tipo === 'Recebido') monthlyTotals[rec.monthKey].recebido += rec.valor;
    else monthlyTotals[rec.monthKey].emAberto += rec.valor;

    byClientMonth[rec.cliente] = byClientMonth[rec.cliente] || {};
    byClientMonth[rec.cliente][rec.monthKey] = byClientMonth[rec.cliente][rec.monthKey] || {
      recebido: 0,
      emAberto: 0,
    };
    if (rec.tipo === 'Recebido') byClientMonth[rec.cliente][rec.monthKey].recebido += rec.valor;
    else byClientMonth[rec.cliente][rec.monthKey].emAberto += rec.valor;

    clientTotals[rec.cliente] = clientTotals[rec.cliente] || { recebido: 0, emAberto: 0 };
    if (rec.tipo === 'Recebido') clientTotals[rec.cliente].recebido += rec.valor;
    else clientTotals[rec.cliente].emAberto += rec.valor;
  }

  const months = [...new Set(records.map((r) => r.monthKey))].sort();

  return NextResponse.json({ months, monthlyTotals, byClientMonth, clientTotals });
}
