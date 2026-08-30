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
  adminNationality: '',
  adminMaritalStatus: '',
  adminProfession: '',
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
  const [viewingId, setViewingId] = useState(null);
  const [sendingSignature, setSendingSignature] = useState(false);
  const [signatureResult, setSignatureResult] = useState(null);

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
    setViewingId(null);
    setEditingId(client.id);
    setForm({
      companyName: client.companyName || '',
      email: client.email || '',
      cpfCnpj: client.cpfCnpj || '',
      address: client.address || '',
      phone: client.phone || '',
      adminName: client.adminName || '',
      adminCpf: client.adminCpf || '',
      adminRg: client.adminRg || '',
      adminEmail: client.adminEmail || '',
      adminNationality: client.adminNationality || '',
      adminMaritalStatus: client.adminMaritalStatus || '',
      adminProfession: client.adminProfession || '',
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

  async function handleToggleActive(client) {
    const res = await fetch('/api/admin/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: client.id, active: !client.active }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    await loadClients();
  }

  async function handleSendForSignature(client) {
    const signerEmail = client.adminEmail || client.email;
    if (
      !window.confirm(
        `Enviar o contrato de "${client.companyName}" pro Autentique agora? Isso manda de verdade um e-mail de assinatura para ${signerEmail}.`
      )
    )
      return;
    setSendingSignature(true);
    setSignatureResult(null);
    setError('');
    const res = await fetch('/api/admin/contract/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id }),
    });
    const body = await res.json().catch(() => ({}));
    setSendingSignature(false);
    if (!res.ok) {
      setError(`Erro ao enviar pro Autentique (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    setSignatureResult(body);
  }

  async function handleDelete(client) {
    if (
      !window.confirm(
        `Excluir "${client.companyName}"? Isso apaga o cadastro, o acesso à área do cliente e os documentos dele. Não pode ser desfeito.`
      )
    )
      return;
    const res = await fetch(`/api/admin/clients?id=${client.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao excluir (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    await loadClients();
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  const viewingClient = clients.find((c) => c.id === viewingId) || null;

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
              <div style={styles.field}>
                <label style={styles.label}>E-mail de login (área do cliente)</label>
                <input
                  style={styles.input}
                  type="email"
                  required={!editingId}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contato@empresaexemplo.com.br"
                />
              </div>
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
              <div style={styles.field}>
                <label style={styles.label}>Nacionalidade</label>
                <input
                  style={styles.input}
                  value={form.adminNationality}
                  onChange={(e) => setForm({ ...form, adminNationality: e.target.value })}
                  placeholder="brasileiro(a)"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Estado civil</label>
                <input
                  style={styles.input}
                  value={form.adminMaritalStatus}
                  onChange={(e) => setForm({ ...form, adminMaritalStatus: e.target.value })}
                  placeholder="casado(a)"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Profissão</label>
                <input
                  style={styles.input}
                  value={form.adminProfession}
                  onChange={(e) => setForm({ ...form, adminProfession: e.target.value })}
                  placeholder="empresário(a)"
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

        {viewingClient && (
          <div style={styles.panel}>
            <div style={styles.viewHeader}>
              <h3 style={styles.panelTitle}>{viewingClient.companyName}</h3>
              <div style={styles.formActions}>
                <a
                  style={styles.button}
                  href={`/api/admin/contract?clientId=${viewingClient.id}`}
                  target="_blank"
                  rel="noopener"
                >
                  Gerar contrato (PDF)
                </a>
                <button
                  type="button"
                  style={styles.cancelButton}
                  disabled={sendingSignature}
                  onClick={() => handleSendForSignature(viewingClient)}
                >
                  {sendingSignature ? 'Enviando...' : 'Enviar p/ assinatura (Autentique)'}
                </button>
                {viewingClient.signedContractDocumentId && (
                  <a
                    style={styles.signedButton}
                    href={`/api/admin/documents/download?id=${viewingClient.signedContractDocumentId}`}
                    target="_blank"
                    rel="noopener"
                  >
                    Ver contrato assinado
                  </a>
                )}
                <button style={styles.cancelButton} onClick={() => startEdit(viewingClient)}>
                  Editar
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setViewingId(null);
                    setSignatureResult(null);
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>

            {signatureResult && (
              <div style={styles.signatureNote}>
                <p style={{ margin: '0 0 4px' }}>
                  Enviado para assinatura de <strong>{signatureResult.signerName}</strong> (
                  {signatureResult.signerEmail}). Documento no Autentique: {signatureResult.documentId}.
                </p>
                <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.85 }}>
                  Se o e-mail não chegar em alguns minutos: confira o spam, confira se esse documento
                  aparece em autentique.com.br com esse mesmo ID, e confira se o e-mail do administrador
                  está certo. O contrato (ainda não assinado) já está salvo em Documentos.
                </p>
              </div>
            )}

            <h4 style={styles.sectionTitle}>Dados da empresa (CONTRATANTE)</h4>
            <div style={styles.viewGrid}>
              <ViewField label="CNPJ/CPF" value={viewingClient.cpfCnpj} />
              <ViewField label="Endereço" value={viewingClient.address} />
              <ViewField label="Telefone" value={viewingClient.phone} />
              <ViewField label="E-mail de login" value={viewingClient.email} />
              <ViewField label="Valor mensal" value={formatMoney(viewingClient.monthlyValue)} />
              <ViewField label="Início do contrato" value={formatDate(viewingClient.contractStartDate)} />
              <ViewField label="Documentos" value={String(viewingClient.documentCount)} />
              <ViewField label="Status" value={viewingClient.active ? 'Ativo' : 'Inativo'} />
            </div>

            <h4 style={styles.sectionTitle}>Dados do administrador</h4>
            <div style={styles.viewGrid}>
              <ViewField label="Nome" value={viewingClient.adminName} />
              <ViewField label="CPF" value={viewingClient.adminCpf} />
              <ViewField label="RG" value={viewingClient.adminRg} />
              <ViewField label="E-mail" value={viewingClient.adminEmail} />
              <ViewField label="Nacionalidade" value={viewingClient.adminNationality} />
              <ViewField label="Estado civil" value={viewingClient.adminMaritalStatus} />
              <ViewField label="Profissão" value={viewingClient.adminProfession} />
            </div>
          </div>
        )}

        <div style={styles.tableWrap}>
          <div style={styles.tableHeadRow}>
            <span>Empresa</span>
            <span>Valor mensal</span>
            <span style={styles.centerHeadCell}>Documentos</span>
            <span>Status</span>
            <span></span>
          </div>
          {clients.length === 0 && <p style={styles.emptyState}>Nenhum cliente cadastrado ainda.</p>}
          {clients.map((c) => (
            <div key={c.id} style={styles.tableRow}>
              <span
                style={styles.clickableCell}
                onClick={() => {
                  setViewingId(c.id);
                  setSignatureResult(null);
                }}
              >
                <span style={styles.clientName}>{c.companyName}</span>
                <br />
                <span style={styles.clientSubline}>
                  {c.adminName ? `${c.adminName} · ` : ''}
                  {c.cpfCnpj || 'CPF/CNPJ não cadastrado'}
                </span>
              </span>
              <span>{formatMoney(c.monthlyValue)}</span>
              <button
                style={styles.documentCountButton}
                onClick={() => router.push(`/admin/documentos?clientId=${c.id}`)}
                title="Ver documentos deste cliente"
              >
                {c.documentCount}
              </button>
              <button
                style={c.active ? styles.statusActive : styles.statusInactive}
                onClick={() => handleToggleActive(c)}
                title="Clique para alternar"
              >
                {c.active ? 'Ativo' : 'Inativo'}
              </button>
              <div style={styles.rowActions}>
                <button style={styles.editButton} onClick={() => startEdit(c)}>
                  Editar
                </button>
                <button style={styles.deleteButton} onClick={() => handleDelete(c)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function ViewField({ label, value }) {
  return (
    <div style={styles.viewField}>
      <span style={styles.viewLabel}>{label}</span>
      <span style={styles.viewValue}>{value || '—'}</span>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif', background: '#F7F5F0' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3C4A38' },
  main: { flex: 1, padding: '36px 48px', maxWidth: 1440 },
  h1: { fontSize: '1.6rem', margin: '0 0 6px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  sub: { color: '#3C4A38', marginBottom: 22, fontSize: '0.9rem' },
  error: { color: '#c8493a', marginBottom: 18, fontSize: '0.9rem' },
  panel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, padding: '20px 24px', marginBottom: 28 },
  panelTitle: { fontSize: '0.95rem', marginBottom: 14, fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  sectionTitle: {
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#3C4A38',
    opacity: 0.7,
    margin: '16px 0 10px',
    paddingTop: 14,
    borderTop: '1px solid rgba(15,45,36,0.08)',
  },
  form: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 14,
    alignItems: 'end',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 },
  label: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#3C4A38' },
  input: {
    padding: '8px 10px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '0.85rem',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  formActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  button: {
    background: '#C8A869',
    color: '#0F2D24',
    border: 'none',
    padding: '9px 18px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.8rem',
    height: 38,
  },
  cancelButton: {
    background: 'none',
    border: '1px solid rgba(15,45,36,0.2)',
    color: '#3C4A38',
    padding: '9px 18px',
    borderRadius: 4,
    fontWeight: 600,
    fontSize: '0.8rem',
    height: 38,
  },
  tableWrap: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, overflow: 'hidden' },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
    padding: '10px 20px',
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    alignItems: 'center',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
    padding: '11px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.84rem',
    alignItems: 'center',
    gap: 12,
  },
  clickableCell: { cursor: 'pointer' },
  clientName: { fontWeight: 600 },
  clientSubline: { fontSize: '0.72rem', color: '#3C4A38', opacity: 0.75 },
  emptyState: { padding: 16, color: '#3C4A38', margin: 0, fontSize: '0.88rem' },
  viewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  signedButton: {
    background: 'rgba(139,165,143,0.18)',
    border: '1px solid rgba(139,165,143,0.5)',
    color: '#3C4A38',
    padding: '11px 20px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.85rem',
    height: 42,
    display: 'inline-flex',
    alignItems: 'center',
  },
  signatureNote: {
    background: 'rgba(139,165,143,0.15)',
    border: '1px solid rgba(139,165,143,0.4)',
    borderRadius: 4,
    padding: '10px 14px',
    fontSize: '0.85rem',
    color: '#3C4A38',
    marginTop: 8,
  },
  viewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
  },
  viewField: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  viewLabel: { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#3C4A38', opacity: 0.7 },
  viewValue: { fontSize: '0.9rem', color: '#0F2D24' },
  rowActions: { display: 'flex', gap: 8, justifySelf: 'end' },
  editButton: {
    background: 'none',
    border: '1px solid rgba(15,45,36,0.2)',
    color: '#0F2D24',
    padding: '6px 14px',
    borderRadius: 4,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteButton: {
    background: 'none',
    border: '1px solid rgba(217,88,74,0.4)',
    color: '#d9584a',
    padding: '6px 14px',
    borderRadius: 4,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  centerHeadCell: { textAlign: 'center' },
  documentCountButton: {
    background: 'none',
    border: '1px solid rgba(15,45,36,0.15)',
    color: '#0F2D24',
    width: 34,
    height: 28,
    borderRadius: 30,
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    justifySelf: 'center',
  },
  statusActive: {
    background: 'rgba(139,165,143,0.18)',
    border: '1px solid rgba(139,165,143,0.5)',
    color: '#4c6350',
    padding: '5px 12px',
    borderRadius: 30,
    fontSize: '0.74rem',
    fontWeight: 700,
    cursor: 'pointer',
    justifySelf: 'start',
  },
  statusInactive: {
    background: 'rgba(15,45,36,0.06)',
    border: '1px solid rgba(15,45,36,0.15)',
    color: '#3C4A38',
    padding: '5px 12px',
    borderRadius: 30,
    fontSize: '0.74rem',
    fontWeight: 700,
    cursor: 'pointer',
    justifySelf: 'start',
  },
};
