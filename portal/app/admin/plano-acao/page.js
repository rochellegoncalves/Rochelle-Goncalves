'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const STATUS_OPTIONS = ['Não iniciado', 'Em andamento', 'Concluído'];
const STATUS_STYLE = {
  'Não iniciado': { background: 'rgba(15,45,36,0.06)', color: '#3C4A38' },
  'Em andamento': { background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' },
  Concluído: { background: 'rgba(139,165,143,0.2)', color: '#4c6350' },
};

export default function PlanoAcaoPage() {
  return (
    <Suspense fallback={<div style={styles.loading}>Carregando...</div>}>
      <PlanoAcaoPageInner />
    </Suspense>
  );
}

function PlanoAcaoPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [sheetNotConfigured, setSheetNotConfigured] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [showDone, setShowDone] = useState(false);

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
      const requestedId = searchParams.get('clientId');
      const initialId =
        requestedId && data.clients?.some((c) => c.id === requestedId)
          ? requestedId
          : data.clients?.[0]?.id;
      if (initialId) setSelectedClientId(initialId);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadItems(clientId) {
    if (!clientId) return;
    setError('');
    setSheetNotConfigured(false);
    const res = await fetch(`/api/admin/plano-acao?clientId=${clientId}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body.error === 'sheet_not_configured') {
        setSheetNotConfigured(true);
        setItems([]);
        return;
      }
      setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
      setItems([]);
      return;
    }
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    loadItems(selectedClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  async function handleFieldChange(rowNumber, field, value) {
    const key = `${rowNumber}-${field}`;
    const previousItems = items;
    setItems((its) => its.map((it) => (it.rowNumber === rowNumber ? { ...it, [field]: value } : it)));
    setSavingKey(key);
    setError('');

    const res = await fetch('/api/admin/plano-acao', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: selectedClientId, rowNumber, field, value }),
    });
    setSavingKey(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao salvar na planilha (${res.status}): ${JSON.stringify(body)}`);
      setItems(previousItems);
    }
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  const sortedItems = [...items].sort((a, b) => {
    if (!a.prazo && !b.prazo) return 0;
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo.localeCompare(b.prazo);
  });
  const visibleItems = showDone ? sortedItems : sortedItems.filter((it) => it.status !== 'Concluído');
  const doneCount = sortedItems.length - visibleItems.length;

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/plano-acao" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Plano de Ação</h1>
        <p style={styles.sub}>Sincronizado com a planilha do cliente no Google Sheets -- editar aqui já atualiza lá.</p>

        {error && <p style={styles.error}>{error}</p>}

        {clients.length === 0 ? (
          <p style={styles.emptyState}>Nenhum cliente cadastrado ainda.</p>
        ) : (
          <>
            <div style={styles.controls}>
              <select
                style={styles.select}
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>

              {!sheetNotConfigured && (
                <label style={styles.toggleLabel}>
                  <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
                  Mostrar concluídas {doneCount > 0 ? `(${doneCount})` : ''}
                </label>
              )}
            </div>

            {sheetNotConfigured ? (
              <p style={styles.emptyState}>
                Esse cliente ainda não tem uma planilha de Plano de Ação configurada. Vá em "Clientes", edite esse
                cliente e cole o link da planilha do Google Sheets dele.
              </p>
            ) : (
              <div style={styles.tableWrap}>
                <div style={styles.tableHeadRow}>
                  <span>Ação</span>
                  <span>Responsável</span>
                  <span>Prazo</span>
                  <span>Status</span>
                </div>
                {visibleItems.length === 0 && (
                  <p style={styles.emptyStateInline}>Nenhuma ação pendente por aqui.</p>
                )}
                {visibleItems.map((item) => (
                  <div key={item.rowNumber} style={styles.tableRow}>
                    <div style={styles.acaoCell}>
                      <span style={styles.acaoText}>{item.acao}</span>
                      {item.diagnostico && <span style={styles.diagnosticoText}>{item.diagnostico}</span>}
                      {item.obs && <span style={styles.obsText}>Obs: {item.obs}</span>}
                    </div>
                    <span style={styles.responsavelText}>{item.responsavel || '—'}</span>
                    <input
                      type="date"
                      style={{
                        ...styles.dateInput,
                        opacity: savingKey === `${item.rowNumber}-prazo` ? 0.5 : 1,
                      }}
                      value={item.prazo || ''}
                      disabled={savingKey === `${item.rowNumber}-prazo`}
                      onChange={(e) => handleFieldChange(item.rowNumber, 'prazo', e.target.value)}
                    />
                    <select
                      style={{
                        ...styles.statusSelect,
                        ...(STATUS_STYLE[item.status] || {}),
                        opacity: savingKey === `${item.rowNumber}-status` ? 0.5 : 1,
                      }}
                      value={item.status || ''}
                      disabled={savingKey === `${item.rowNumber}-status`}
                      onChange={(e) => handleFieldChange(item.rowNumber, 'status', e.target.value)}
                    >
                      {!STATUS_OPTIONS.includes(item.status) && item.status && (
                        <option value={item.status}>{item.status}</option>
                      )}
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
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
  emptyState: { color: '#3C4A38', fontSize: '0.9rem' },
  controls: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' },
  select: {
    padding: '9px 12px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '0.88rem',
    minWidth: 260,
    background: '#fff',
  },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#3C4A38' },
  tableWrap: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, overflow: 'hidden' },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '3fr 1fr 1fr 1fr',
    padding: '10px 20px',
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    gap: 12,
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '3fr 1fr 1fr 1fr',
    padding: '12px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.84rem',
    gap: 12,
    alignItems: 'start',
  },
  acaoCell: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  acaoText: { fontWeight: 600, color: '#0F2D24' },
  diagnosticoText: { fontSize: '0.76rem', color: '#3C4A38', opacity: 0.75 },
  obsText: { fontSize: '0.76rem', color: '#8a6d2f', fontStyle: 'italic' },
  responsavelText: { color: '#3C4A38' },
  emptyStateInline: { padding: 20, color: '#3C4A38', margin: 0 },
  dateInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.8rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
  },
  statusSelect: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 30,
    padding: '6px 10px',
    fontSize: '0.76rem',
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
  },
};
