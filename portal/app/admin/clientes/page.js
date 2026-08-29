'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const EMPTY_FORM = {
  companyName: '',
  email: '',
  cpfCnpj: '',
  address: '',
  phone: '',
  adminName: '',
  adminCpf: '',
  adminRg: '',
  adminEmail: '',
  monthlyValue: '',
  contractStartDate: '',
};

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function ClientesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

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

  function startEdit(client) {
    setEditingId(client.id);
    setForm({
      companyName: client.companyName || '',
      email: '',
      cpfCnpj: client.cpfCnpj || '',
      address: client.address || '',
      phone: client.phone || '',
      adminName: client.adminName || '',
      adminCpf: client.adminCpf || '',
      adminRg: client.adminRg || '',
      adminEmail: client.adminEmail || '',
      monthlyValue: client.monthlyValue ?? '',
      contractStartDate: client.contractStartDate || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/admin/clients', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    setEditingId(null);
    setForm(EMPTY_FORM);
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
          <h3 style={styles.panelTitle}>{editingId ? 'Editar cliente' : 'Novo cliente'}</h3>
          <form onSubmit={handleSubmit}>
            <h4 style={styles.sectionTitle}>Dados da empresa (CONTRATANTE)</h4>
            <div style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Nome completo / Razão social</label>
                <input
                  style={styles.input}
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Empresa Exemplo Ltda."
                />
              </div>
              {!editingId && (
                <div style={styles.field}>
                  <label style={styles.label}>E-mail de login (área do cliente)</label>
                  <input
                    style={styles.input}
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contato@empresaexemplo.com.br"
                  />
                </div>
              )}
              <div style={styles.field}>
                <label style={styles.label}>CNPJ (ou CPF, se pessoa física)</label>
                <input
                  style={styles.input}
                  value={form.cpfCnpj}
                  onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Telefone</label>
                <input
                  style={styles.input}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(19) 99999-9999"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Endereço (sede)</label>
                <input
                  style={styles.input}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Rua Exemplo, 123 - Campinas/SP"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Valor mensal (R$)</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  value={form.monthlyValue}
                  onChange={(e) => setForm({ ...form, monthlyValue: e.target.value })}
                  placeholder="2500"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Início do contrato</label>
                <input
                  style={styles.input}
                  type="date"
                  value={form.contractStartDate}
                  onChange={(e) => setForm({ ...form, contractStartDate: e.target.value })}
                />
              </div>
            </div>

            <h4 style={styles.sectionTitle}>
              Dados do administrador (quem assina pela empresa, se for pessoa jurídica)
            </h4>
            <div style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Nome do administrador</label>
                <input
                  style={styles.input}
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  placeholder="Nome completo de quem assina"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>CPF do administrador</label>
                <input
                  style={styles.input}
                  value={form.adminCpf}
                  onChange={(e) => setForm({ ...form, adminCpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>RG do administrador</label>
                <input
                  style={styles.input}
                  value={form.adminRg}
                  onChange={(e) => setForm({ ...form, adminRg: e.target.value })}
                  placeholder="00.000.000-0"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>E-mail do administrador</label>
                <input
                  style={styles.input}
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  placeholder="pessoal@exemplo.com"
                />
              </div>
            </div>

            <div style={styles.formActions}>
              <button style={styles.button} type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Adicionar cliente'}
              </button>
              {editingId && (
                <button type="button" style={styles.cancelButton} onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div style={styles.tableWrap}>
          <div style={styles.tableHeadRow}>
            <span>Empresa</span>
            <span>Valor mensal</span>
            <span>Início</span>
            <span>Documentos</span>
            <span></span>
          </div>
          {clients.length === 0 && <p style={styles.emptyState}>Nenhum cliente cadastrado ainda.</p>}
          {clients.map((c) => (
            <div key={c.id} style={styles.tableRow}>
              <span>
                <span style={styles.clientName}>{c.companyName}</span>
                <br />
                <span style={styles.clientSubline}>
                  {c.adminName ? `${c.adminName} · ` : ''}
                  {c.cpfCnpj || 'CPF/CNPJ não cadastrado'}
                </span>
              </span>
              <span>{formatMoney(c.monthlyValue)}</span>
              <span>{formatDate(c.contractStartDate)}</span>
              <span>{c.documentCount}</span>
              <button style={styles.editButton} onClick={() => startEdit(c)}>
                Editar
              </button>
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
  sectionTitle: {
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#3C4A38',
    opacity: 0.7,
    margin: '20px 0 12px',
    paddingTop: 16,
    borderTop: '1px solid rgba(15,45,36,0.08)',
  },
  form: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    alignItems: 'end',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#3C4A38' },
  input: {
    padding: '10px 12px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '0.9rem',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  formActions: { display: 'flex', gap: 10 },
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
  cancelButton: {
    background: 'none',
    border: '1px solid rgba(15,45,36,0.2)',
    color: '#3C4A38',
    padding: '11px 20px',
    borderRadius: 4,
    fontWeight: 600,
    fontSize: '0.85rem',
    height: 42,
  },
  tableWrap: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, overflow: 'hidden' },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
    padding: '12px 20px',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    alignItems: 'center',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
    padding: '14px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.88rem',
    alignItems: 'center',
  },
  clientName: { fontWeight: 600 },
  clientSubline: { fontSize: '0.76rem', color: '#3C4A38', opacity: 0.75 },
  emptyState: { padding: 20, color: '#3C4A38', margin: 0 },
  editButton: {
    background: 'none',
    border: '1px solid rgba(15,45,36,0.2)',
    color: '#0F2D24',
    padding: '6px 14px',
    borderRadius: 4,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    justifySelf: 'end',
  },
};
