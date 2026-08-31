'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const FUNNEL_ORDER = ['Lead Frio', 'Lead Morno', 'Proposta enviada', 'Cliente', 'Fora do Perfil'];
const FUNNEL_STYLE = {
  'Fora do Perfil': { background: 'rgba(200,73,58,0.15)', color: '#a23929' },
  'Lead Frio': { background: 'rgba(15,45,36,0.06)', color: '#3C4A38' },
  'Lead Morno': { background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' },
  'Proposta enviada': { background: 'rgba(139,165,143,0.2)', color: '#4c6350' },
  Cliente: { background: 'rgba(58,140,82,0.18)', color: '#2f6b41' },
};

function formatMoney(value) {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function startOfWeek() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // segunda = 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
}

const QUICK_LINKS = [
  { href: '/admin/tarefas', label: 'Minhas Tarefas' },
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/documentos', label: 'Documentos' },
  { href: '/admin/plano-acao', label: 'Plano de Ação' },
  { href: '/admin/rentabilidade', label: 'Rentabilidade' },
  { href: '/admin/timesheet', label: 'Timesheet' },
  { href: '/admin/crm', label: 'CRM' },
  { href: '/admin/processos', label: 'Processos' },
];

export default function VisaoGeralPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    clientesAtivos: null,
    clientesInativos: null,
    recebidoMes: null,
    emAbertoMes: null,
    funnelCounts: null,
    processosStats: null,
    horasSemana: null,
    timesheetError: null,
    tarefasUrgentes: null,
  });

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

  async function safeJson(promise) {
    try {
      const res = await promise;
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function loadAll() {
    const [clientsData, rentData, crmData, processosData, timesheetRes, todoistData] = await Promise.all([
      safeJson(fetch('/api/admin/clients')),
      safeJson(fetch('/api/admin/rentabilidade')),
      safeJson(fetch('/api/admin/crm')),
      safeJson(fetch('/api/admin/processos')),
      fetch('/api/admin/timesheet').catch(() => null),
      safeJson(fetch('/api/todoist')),
    ]);

    const clients = clientsData?.clients || [];
    const monthKey = currentMonthKey();
    const monthTotals = rentData?.monthlyTotals?.[monthKey];
    const contacts = crmData?.contacts || [];
    const processos = processosData?.processos || [];

    let horasSemana = null;
    let timesheetError = null;
    if (timesheetRes) {
      if (timesheetRes.ok) {
        const tsData = await timesheetRes.json();
        const weekStart = startOfWeek();
        const seconds = (tsData.entries || [])
          .filter((e) => e.endedAt && new Date(e.startedAt) >= weekStart)
          .reduce((sum, e) => sum + (new Date(e.endedAt) - new Date(e.startedAt)) / 1000, 0);
        horasSemana = seconds / 3600;
      } else {
        timesheetError = 'not_configured';
      }
    }

    setData({
      clientesAtivos: clients.filter((c) => c.active).length,
      clientesInativos: clients.filter((c) => !c.active).length,
      recebidoMes: monthTotals?.recebido ?? null,
      emAbertoMes: monthTotals?.emAberto ?? null,
      funnelCounts: FUNNEL_ORDER.map((status) => ({
        status,
        count: contacts.filter((c) => c.status === status).length,
      })),
      processosStats: {
        emAndamento: processos.filter((p) => p.status === 'Em andamento').length,
        prejuizo: processos.filter((p) => p.status === 'Prejuízo').length,
        concluido: processos.filter((p) => p.status === 'Concluído').length,
      },
      horasSemana,
      timesheetError,
      tarefasUrgentes: todoistData?.urgent || null,
    });
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/visao-geral" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Visão Geral</h1>
        <p style={styles.sub}>Um resumo rápido de tudo que está rodando no painel hoje.</p>

        <div style={styles.statsRow}>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Clientes ativos</span>
            <span style={styles.statValue}>{data.clientesAtivos ?? '—'}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Recebido este mês</span>
            <span style={styles.statValue}>
              {data.recebidoMes != null ? formatMoney(data.recebidoMes) : '—'}
            </span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Em aberto este mês</span>
            <span style={{ ...styles.statValue, color: '#a23929' }}>
              {data.emAbertoMes != null ? formatMoney(data.emAbertoMes) : '—'}
            </span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Tarefas atrasadas/hoje</span>
            <span style={styles.statValue}>{data.tarefasUrgentes ? data.tarefasUrgentes.length : '—'}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Horas essa semana</span>
            {data.timesheetError ? (
              <span style={styles.statNote}>Falta configurar</span>
            ) : (
              <span style={styles.statValue}>{data.horasSemana != null ? `${data.horasSemana.toFixed(1)}h` : '—'}</span>
            )}
          </div>
        </div>

        <div style={styles.panelsGrid}>
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Funil do CRM</h2>
            {data.funnelCounts ? (
              <div style={styles.funnelList}>
                {data.funnelCounts.map((f) => (
                  <div key={f.status} style={styles.funnelRow}>
                    <span style={{ ...styles.funnelBadge, ...(FUNNEL_STYLE[f.status] || {}) }}>{f.status}</span>
                    <span style={styles.funnelCount}>{f.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.panelEmpty}>Sem dados.</p>
            )}
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Processos Jurídicos</h2>
            {data.processosStats ? (
              <div style={styles.funnelList}>
                <div style={styles.funnelRow}>
                  <span style={{ ...styles.funnelBadge, background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' }}>
                    Em andamento
                  </span>
                  <span style={styles.funnelCount}>{data.processosStats.emAndamento}</span>
                </div>
                <div style={styles.funnelRow}>
                  <span style={{ ...styles.funnelBadge, background: 'rgba(58,140,82,0.18)', color: '#2f6b41' }}>
                    Concluídos
                  </span>
                  <span style={styles.funnelCount}>{data.processosStats.concluido}</span>
                </div>
                <div style={styles.funnelRow}>
                  <span style={{ ...styles.funnelBadge, background: 'rgba(200,73,58,0.15)', color: '#a23929' }}>
                    Prejuízo
                  </span>
                  <span style={styles.funnelCount}>{data.processosStats.prejuizo}</span>
                </div>
              </div>
            ) : (
              <p style={styles.panelEmpty}>Sem dados.</p>
            )}
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Tarefas atrasadas/hoje</h2>
            {data.tarefasUrgentes && data.tarefasUrgentes.length > 0 ? (
              <ul style={styles.taskList}>
                {data.tarefasUrgentes.slice(0, 6).map((t) => (
                  <li key={t.id} style={styles.taskItem}>
                    <span style={t.isOverdue ? styles.taskOverdue : styles.taskToday}>
                      {t.isOverdue ? 'Atrasada' : 'Hoje'}
                    </span>
                    <span>{t.content}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.panelEmpty}>Nenhuma tarefa atrasada ou pra hoje. 🎉</p>
            )}
          </div>
        </div>

        <h2 style={styles.quickTitle}>Acesso rápido</h2>
        <div style={styles.quickGrid}>
          {QUICK_LINKS.map((link) => (
            <button key={link.href} style={styles.quickButton} onClick={() => router.push(link.href)}>
              {link.label}
            </button>
          ))}
        </div>
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
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 },
  statTile: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 8,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statLabel: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#3C4A38', opacity: 0.7 },
  statValue: { fontSize: '1.4rem', fontWeight: 700, color: '#0F2D24', fontVariantNumeric: 'tabular-nums' },
  statNote: { fontSize: '0.82rem', color: '#a23929', fontWeight: 600 },
  panelsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 },
  panel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 8, padding: '18px 22px' },
  panelTitle: { fontSize: '0.92rem', margin: '0 0 14px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  panelEmpty: { fontSize: '0.85rem', color: '#3C4A38', margin: 0 },
  funnelList: { display: 'flex', flexDirection: 'column', gap: 10 },
  funnelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  funnelBadge: {
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '4px 10px',
    borderRadius: 30,
  },
  funnelCount: { fontSize: '1rem', fontWeight: 700, color: '#0F2D24', fontVariantNumeric: 'tabular-nums' },
  taskList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  taskItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: '#0F2D24' },
  taskOverdue: {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#a23929',
    background: 'rgba(200,73,58,0.15)',
    padding: '2px 8px',
    borderRadius: 30,
    flexShrink: 0,
  },
  taskToday: {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#8a6d2f',
    background: 'rgba(200,168,105,0.2)',
    padding: '2px 8px',
    borderRadius: 30,
    flexShrink: 0,
  },
  quickTitle: { fontSize: '0.95rem', margin: '0 0 12px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  quickButton: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.12)',
    color: '#0F2D24',
    padding: '14px 16px',
    borderRadius: 6,
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    textAlign: 'left',
  },
};
