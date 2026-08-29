'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

export default function ClientesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ companyName: '', email: '' });

  async function loadClients() {
    const res = await fetch('/api/admin/clients');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  }

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
      await loadClients();
    }
    init();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    setForm({ companyName: '', email: '' });
    await loadClients();
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/clientes" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Clientes</h1>
        <p style={styles.sub}>Adicione um novo cliente e acompanhe quem já está cadastrado.</p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Novo cliente</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Nome da empresa</label>
              <input
                style={styles.input}
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Empresa Exemplo Ltda."
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>E-mail do cliente</label>
              <input
                style={styles.input}
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@empresaexemplo.com.br"
              />
            </div>
            <button style={styles.button} type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Adicionar cliente'}
            </button>
          </form>
        </div>

        <div style={styles.tableWrap}>
          <div style={styles.tableHeadRow}>
            <span>Empresa</span>
            <span>Cadastrado em</span>
            <span>Documentos</span>
          </div>
          {clients.length === 0 && <p style={styles.emptyState}>Nenhum cliente cadastrado ainda.</p>}
          {clients.map((c) => (
            <div key={c.id} style={styles.tableRow}>
              <span style={styles.clientName}>{c.companyName}</span>
              <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
              <span>{c.documentCount}</span>
            </div>
          ))}
        </div>
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
  panel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, padding: 24, marginBottom: 32 },
  panelTitle: { fontSize: '1rem', marginBottom: 16, fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  form: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'end' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
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
  clientName: { fontWeight: 600 },
  emptyState: { padding: 20, color: '#3C4A38', margin: 0 },
};
