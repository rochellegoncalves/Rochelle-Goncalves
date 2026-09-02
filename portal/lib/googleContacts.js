import { google } from 'googleapis';
import { getAuthenticatedGoogleContactsClient } from './googleOAuth';

export async function isGoogleContactsConnected() {
  const client = await getAuthenticatedGoogleContactsClient();
  return !!client;
}

export async function fetchGoogleContacts() {
  const auth = await getAuthenticatedGoogleContactsClient();
  if (!auth) return null;

  const people = google.people({ version: 'v1', auth });

  const contacts = [];
  let pageToken;
  do {
    const res = await people.people.connections.list({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,phoneNumbers',
      pageSize: 1000,
      pageToken,
    });
    for (const person of res.data.connections || []) {
      const name = person.names?.[0]?.displayName;
      if (!name) continue;
      contacts.push({
        resourceName: person.resourceName,
        nome: name,
        email: person.emailAddresses?.[0]?.value || '',
        telefone: person.phoneNumbers?.[0]?.value || '',
      });
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return contacts;
}
