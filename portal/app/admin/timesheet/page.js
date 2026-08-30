'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: 'all', label: 'Tudo' },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toLocalDateStr(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toLocalTimeStr(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function combineLocal(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

function formatDurationHM(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${pad2(m)}min`;
}

function formatDurationClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

function periodBounds(period) {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from: start, to: null };
  }
  if (period === 'week') {
    const dow = (now.getDay() + 6) % 7; // segunda = 0
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    return { from: start, to: null };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start, to: null };
  }
  return { from: null, to: null };
}

const EMPTY_FORM = { clientId: '', description: '', date: '', startTime: '', endTime: '' };

export default function TimesheetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [entries, setEntries] = useState([]);
  const [running, setRunning] = useState(null);
  const [error, setError] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());

  const [timerClientId, setTimerClientId] = useState('');
  const [timerDescription, setTimerDescription] = useState('');
  const [startingTimer, setStartingTimer] = useState(false);

  const [periodFilter, setPeriodFilter] = useState('week');
  const [clientFilter, setClientFilter] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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
      await loadAll();
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [running]);

  async function loadAll() {
    const [clientsRes, entriesRes] = await Promise.all([
      fetch('/api/admin/clients'),
      fetch('/api/admin/timesheet'),
    ]);
    if (clientsRes.ok) {
      const data = await clientsRes.json();
      setClients(data.clients || []);
      if (!timerClientId && data.clients?.[0]) setTimerClientId(data.clients[0].id);
    }
    if (entriesRes.ok) {
      const data = await entriesRes.json();
      setEntries(data.entries || []);
      setRunning(data.running || null);
    } else {
      const body = await entriesRes.json().catch(() => ({}));
      setError(`Erro (${entriesRes.status}): ${JSON.stringify(body)}`);
    }
  }

  function clientName(id) {
    return clients.find((c) => c.id === id)?.companyName || '(cliente removido)';
  }

  async function handleStartTimer() {
    if (!timerClientId) return;
    setStartingTimer(true);
    setError('');
    const res = await fetch('/api/admin/timesheet/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: timerClientId, description: timerDescription }),
    });
    setStartingTimer(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao iniciar cronômetro (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    setTimerDescription('');
    await loadAll();
  }

  async function handleStopTimer() {
    if (!running) return;
    setError('');
    const res = await fetch('/api/admin/timesheet/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: running.id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao parar cronômetro (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    await loadAll();
  }

  function startEdit(entry) {
    const start = new Date(entry.startedAt);
    const end = entry.endedAt ? new Date(entry.endedAt) : null;
    setEditingId(entry.id);
    setForm({
      clientId: entry.clientId,
      description: entry.description || '',
      date: toLocalDateStr(start),
      startTime: toLocalTimeStr(start),
      endTime: end ? toLocalTimeStr(end) : '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.clientId || !form.date || !form.startTime || !form.endTime) return;
    setSaving(true);
    setError('');

    const startedAt = combineLocal(form.date, form.startTime);
    const endedAt = combineLocal(form.date, form.endTime);

    const res = await fetch('/api/admin/timesheet', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        editingId
          ? { id: editingId, clientId: form.clientId, description: form.description, startedAt, endedAt }
          : { clientId: form.clientId, description: form.description, startedAt, endedAt }
      ),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao salvar (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    cancelEdit();
    await loadAll();
  }

  async function handleDelete(entry) {
    if (!window.confirm('Excluir esse lançamento? Não pode ser desfeito.')) return;
    const res = await fetch(`/api/admin/timesheet?id=${entry.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao excluir (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    await loadAll();
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  const { from } = periodBounds(periodFilter);
  const finishedEntries = entries.filter((e) => e.endedAt);
  const periodEntries = finishedEntries.filter((e) => {
    if (from && new Date(e.startedAt) < from) return false;
    if (clientFilter && e.clientId !== clientFilter) return false;
    return true;
  });

  const totalsByClient = {};
  for (const e of periodEntries) {
    const durationSec = (new Date(e.endedAt) - new Date(e.startedAt)) / 1000;
    totalsByClient[e.clientId] = (totalsByClient[e.clientId] || 0) + durationSec;
  }
  const summaryRows = Object.entries(totalsByClient)
    .map(([clientId, seconds]) => ({ clientId, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
  const grandTotalSeconds = summaryRows.reduce((sum, r) => sum + r.seconds, 0);

  const runningElapsedSec = running ? (nowTick - new Date(running.startedAt).getTime()) / 1000 : 0;

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/timesheet" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Timesheet</h1>
        <p style={styles.sub}>Cronômetro em tempo real ou lançamento manual, por cliente.</p>

        {error && <p style={styles.error}>{error}</p>}

        {clients.length === 0 ? (
          <p style={styles.emptyState}>Nenhum cliente cadastrado ainda.</p>
        ) : (
          <>
            <div style={styles.timerPanel}>
              {running ? (
                <>
                  <div style={styles.timerRunningInfo}>
                    <span style={styles.timerClock}>{formatDurationClock(runningElapsedSec)}</span>
                    <span style={styles.timerClientLabel}>{clientName(running.clientId)}</span>
                    {running.description && <span style={styles.timerDesc}>{running.description}</span>}
                  </div>
                  <button style={styles.stopButton} onClick={handleStopTimer}>
                    Parar
                  </button>
                </>
              ) : (
                <>
                  <select
                    style={styles.timerSelect}
                    value={timerClientId}
                    onChange={(e) => setTimerClientId(e.target.value)}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                  <input
                    style={styles.timerDescInput}
                    value={timerDescription}
                    onChange={(e) => setTimerDescription(e.target.value)}
                    placeholder="O que você vai fazer? (opcional)"
                  />
                  <button style={styles.startButton} onClick={handleStartTimer} disabled={startingTimer}>
                    {startingTimer ? 'Iniciando...' : '▶ Iniciar'}
                  </button>
                </>
              )}
            </div>

            <div style={styles.panel}>
              <h3 style={styles.panelTitle}>{editingId ? 'Editar lançamento' : 'Lançar manualmente'}</h3>
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.field}>
                  <label style={styles.label}>Cliente</label>
                  <select
                    style={styles.input}
                    required
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Descrição</label>
                  <input
                    style={styles.input}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Data</label>
                  <input
                    style={styles.input}
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Início</label>
                  <input
                    style={styles.input}
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Fim</label>
                  <input
                    style={styles.input}
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
                <div style={styles.formActions}>
                  <button style={styles.button} type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Adicionar'}
                  </button>
                  {editingId && (
                    <button type="button" style={styles.cancelButton} onClick={cancelEdit}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div style={styles.controls}>
              <select style={styles.select} value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <select style={styles.select} value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                <option value="">Todos os clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <h2 style={styles.tableTitle}>Resumo por cliente</h2>
            <div style={styles.tableWrap}>
              <div style={styles.summaryHeadRow}>
                <span>Cliente</span>
                <span>Horas</span>
              </div>
              {summaryRows.length === 0 && (
                <p style={styles.emptyStateInline}>Nenhum lançamento nesse período.</p>
              )}
              {summaryRows.map((r) => (
                <div key={r.clientId} style={styles.summaryRow}>
                  <span style={styles.clientName}>{clientName(r.clientId)}</span>
                  <span>{formatDurationHM(r.seconds)}</span>
                </div>
              ))}
              {summaryRows.length > 0 && (
                <div style={styles.summaryTotalRow}>
                  <span>Total</span>
                  <span>{formatDurationHM(grandTotalSeconds)}</span>
                </div>
              )}
            </div>

            <h2 style={styles.tableTitle}>Lançamentos</h2>
            <div style={styles.tableWrap}>
              <div style={styles.tableHeadRow}>
                <span>Cliente</span>
                <span>Descrição</span>
                <span>Início</span>
                <span>Fim</span>
                <span>Duração</span>
                <span></span>
              </div>
              {periodEntries.length === 0 && (
                <p style={styles.emptyStateInline}>Nenhum lançamento nesse período.</p>
              )}
              {periodEntries
                .slice()
                .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
                .map((e) => {
                  const start = new Date(e.startedAt);
                  const end = new Date(e.endedAt);
                  const durationSec = (end - start) / 1000;
                  return (
                    <div key={e.id} style={styles.tableRow}>
                      <span style={styles.clientName}>{clientName(e.clientId)}</span>
                      <span>{e.description || '—'}</span>
                      <span>
                        {start.toLocaleDateString('pt-BR')} {toLocalTimeStr(start)}
                      </span>
                      <span>{toLocalTimeStr(end)}</span>
                      <span>{formatDurationHM(durationSec)}</span>
                      <div style={styles.rowActions}>
                        <button style={styles.editButton} onClick={() => startEdit(e)}>
                          Editar
                        </button>
                        <button style={styles.deleteButton} onClick={() => handleDelete(e)}>
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
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
  main: { flex: 1, padding: '36px 48px', maxWidth: 1440 },
  h1: { fontSize: '1.6rem', margin: '0 0 6px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  sub: { color: '#3C4A38', marginBottom: 22, fontSize: '0.9rem' },
  error: { color: '#c8493a', marginBottom: 18, fontSize: '0.9rem' },
  emptyState: { color: '#3C4A38', fontSize: '0.9rem' },
  timerPanel: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: '#0F2D24',
    borderRadius: 8,
    padding: '18px 22px',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  timerSelect: {
    padding: '10px 12px',
    border: '1px solid rgba(247,245,240,0.3)',
    borderRadius: 4,
    fontSize: '0.85rem',
    background: '#0F2D24',
    color: '#F7F5F0',
    minWidth: 200,
  },
  timerDescInput: {
    padding: '10px 12px',
    border: '1px solid rgba(247,245,240,0.3)',
    borderRadius: 4,
    fontSize: '0.85rem',
    background: '#0F2D24',
    color: '#F7F5F0',
    flex: 1,
    minWidth: 200,
  },
  startButton: {
    background: '#C8A869',
    color: '#0F2D24',
    border: 'none',
    padding: '10px 22px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  stopButton: {
    background: '#a23929',
    color: '#F7F5F0',
    border: 'none',
    padding: '10px 22px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  timerRunningInfo: { display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' },
  timerClock: {
    fontFamily: 'Playfair Display, serif',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#C8A869',
    fontVariantNumeric: 'tabular-nums',
  },
  timerClientLabel: { color: '#F7F5F0', fontWeight: 700, fontSize: '0.95rem' },
  timerDesc: { color: 'rgba(247,245,240,0.75)', fontSize: '0.85rem' },
  panel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, padding: '20px 24px', marginBottom: 28 },
  panelTitle: { fontSize: '0.95rem', marginBottom: 14, fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
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
  formActions: { display: 'flex', gap: 10, alignItems: 'end' },
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
  controls: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  select: {
    padding: '9px 12px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '0.88rem',
    minWidth: 180,
    background: '#fff',
  },
  tableTitle: { fontSize: '0.95rem', margin: '0 0 10px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  tableWrap: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, overflow: 'hidden', marginBottom: 28 },
  summaryHeadRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    padding: '10px 20px',
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    padding: '10px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.84rem',
    fontVariantNumeric: 'tabular-nums',
  },
  summaryTotalRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    padding: '10px 20px',
    borderTop: '1px solid rgba(15,45,36,0.15)',
    fontSize: '0.86rem',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: '#0F2D24',
    background: 'rgba(200,168,105,0.1)',
  },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 2fr 1.3fr 0.8fr 1fr 170px',
    padding: '10px 20px',
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    alignItems: 'center',
    gap: 10,
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 2fr 1.3fr 0.8fr 1fr 170px',
    padding: '11px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.84rem',
    alignItems: 'center',
    gap: 10,
  },
  clientName: { fontWeight: 600 },
  emptyStateInline: { padding: 20, color: '#3C4A38', margin: 0 },
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
};
