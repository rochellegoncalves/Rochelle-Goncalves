'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

export default function DocumentosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', file: null });

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const res = await fetch('/api/admin/clients');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setClients(data.clients || []);
      if (data.clients?.length) setSelectedClientId(data.clients[0].id);
      setLoading(false);
    }
    init();
  }, [router]);

  async function loadDocuments(clientId) {
    if (!clientId) return;
    const res = await fetch(`/api/admin/documents?clientId=${clientId}`);
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents || []);
    }
  }

  useEffect(() => {
    loadDocuments(selectedClientId);
  }, [selectedClientId]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.file) return;
    setUploading(true);
    setError('');

    try {
      const signRes = await fetch('/api/admin/documents/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, fileName: form.file.name }),
      });
      if (!signRes.ok) {
        const errBody = await signRes.json().catch(() => ({}));
        setError(`Erro ao preparar envio (${signRes.status}): ${JSON.stringify(errBody)}`);
        setUploading(false);
        return;
      }
      const { filePath, token } = await signRes.json();

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .uploadToSignedUrl(filePath, token, form.file);
      if (uploadError) {
        setError(`Erro ao subir arquivo: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const recordRes = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          name: form.name,
          category: form.category,
          filePath,
        }),
      });
      if (!recordRes.ok) {
        const errBody = await recordRes.json().catch(() => ({}));
        setError(`Erro ao registrar documento (${recordRes.status}): ${JSON.stringify(errBody)}`);
        setUploading(false);
        return;
      }

      setForm({ name: '', category: '', file: null });
      await loadDocuments(selectedClientId);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/documentos" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Documentos</h1>
        <p style={styles.sub}>Escolha o cliente e suba um arquivo pra área dele.</p>

        {error && <p style={styles.error}>{error}</p>}

        {clients.length === 0 ? (
          <p style={styles.emptyState}>
            Nenhum cliente cadastrado ainda. Vá em "Clientes" no menu e adicione um primeiro.
          </p>
        ) : (
          <>
            <div style={styles.panel}>
              <div style={styles.field}>
                <label style={styles.label}>Cliente</label>
                <select
                  style={styles.input}
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleUpload} style={styles.form}>
                <div style={styles.field}>
                  <label style={styles.label}>Nome do documento</label>
                  <input
                    style={styles.input}
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Relatório de Diagnóstico"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Categoria</label>
                  <input
                    style={styles.input}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Financeiro"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Arquivo</label>
                  <input
                    style={styles.input}
                    type="file"
                    required
                    onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                  />
                </div>
                <button style={styles.button} type="submit" disabled={uploading}>
                  {uploading ? 'Enviando...' : 'Subir documento'}
                </button>
              </form>
            </div>

            <div style={styles.tableWrap}>
              <div style={styles.tableHeadRow}>
                <span>Documento</span>
                <span>Categoria</span>
                <span>Enviado em</span>
              </div>
              {documents.length === 0 && <p style={styles.emptyStateInline}>Nenhum documento para este cliente ainda.</p>}
              {documents.map((d) => (
                <div key={d.id} style={styles.tableRow}>
                  <span style={styles.docName}>{d.name}</span>
                  <span>{d.category || '—'}</span>
                  <span>{new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif', background: '#F7F5F0' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3C4A38' },
  main: { flex: 1, padding: '40px 48px', maxWidth: 900 },
  h1: { fontSize: '1.8rem', margin: '0 0 8px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  sub: { color: '#3C4A38', marginBottom: 28 },
  error: { color: '#c8493a', marginBottom: 20 },
  emptyState: { color: '#3C4A38' },
  panel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, padding: 24, marginBottom: 32 },
  form: { display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.3fr auto', gap: 16, alignItems: 'end', marginTop: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 },
  label: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#3C4A38' },
  input: { padding: '10px 12px', border: '1px solid rgba(15,45,36,0.15)', borderRadius: 4, fontSize: '0.9rem' },
  button: {
    background: '#C8A869',
    color: '#0F2D24',
    border: 'none',
    padding: '11px 20px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.85rem',
    height: 42,
  },
  tableWrap: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, overflow: 'hidden' },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    padding: '12px 20px',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    padding: '14px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.88rem',
  },
  docName: { fontWeight: 600 },
  emptyStateInline: { padding: 20, color: '#3C4A38', margin: 0 },
};
