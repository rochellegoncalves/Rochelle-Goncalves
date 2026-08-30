import { google } from 'googleapis';

// Extrai o ID da planilha a partir de uma URL colada pela Rochelle
// (ex.: https://docs.google.com/spreadsheets/d/ABC123/edit#gid=0 -> ABC123).
// Se já vier só o ID puro, devolve como está.
export function extractSpreadsheetId(urlOrId) {
  if (!urlOrId) return null;
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
}

// Extrai o ID de um Google Doc a partir de uma URL colada pela Rochelle
// (ex.: https://docs.google.com/document/d/ABC123/edit -> ABC123).
export function extractDocId(urlOrId) {
  if (!urlOrId) return null;
  const match = urlOrId.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !privateKey) {
    throw new Error('google_service_account_not_configured');
  }
  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
}

export function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

export function getDriveClient() {
  return google.drive({ version: 'v3', auth: getAuth() });
}
