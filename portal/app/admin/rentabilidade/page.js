'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} de ${y}`;
}

function monthLabelShort(monthKey) {
  const [y, m] = monthKey.split('-');
  return `${MONTH_NAMES[Number(m) - 1].slice(0, 3)}/${y.slice(2)}`;
}

function formatMoney(value) {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function findMatchingClient(clienteName, clients) {
  const n = normalize(clienteName);
  if (!n) return null;
  return (
    clients.find((c) => {
      const cn = normalize(c.companyName);
      return cn.includes(n) || n.includes(cn);
    }) || null
  );
}

export default function RentabilidadePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [months, setMonths] = useState([]);
  const [monthlyTotals, setMonthlyTotals] = useState({});
  const [byClientMonth, setByClientMonth] = useState({});
  const [clientTotals, setClientTotals] = useState({});
  const [clients, setClients] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [sortField, setSortField] = useState('recebido');
  const [sortDir, setSortDir] = useState('desc');

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

      const [rentRes, clientsRes] = await Promise.all([
        fetch('/api/admin/rentabilidade'),
        fetch('/api/admin/clients'),
      ]);

      if (!rentRes.ok) {
        const body = await rentRes.json().catch(() => ({}));
        setError(`Erro (${rentRes.status}): ${JSON.stringify(body)}`);
        setLoading(false);
        return;
      }

      const rentData = await rentRes.json();
      const clientsData = clientsRes.ok ? await clientsRes.json() : { clients: [] };

      setMonths(rentData.months || []);
      setMonthlyTotals(rentData.monthlyTotals || {});
      setByClientMonth(rentData.byClientMonth || {});
      setClientTotals(rentData.clientTotals || {});
      setClients(clientsData.clients || []);
      setSelectedMonth((rentData.months || [])[(rentData.months || []).length - 1] || '');
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'cliente' ? 'asc' : 'desc');
    }
  }

  function sortArrow(field) {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  const recentMonths = months.slice(-12);
  const maxMonthTotal = Math.max(1, ...recentMonths.map((m) => monthlyTotals[m]?.recebido || 0));

  const selectedYear = selectedMonth ? selectedMonth.split('-')[0] : '';
  const recebidoAno = months
    .filter((m) => m.startsWith(selectedYear))
    .reduce((sum, m) => sum + (monthlyTotals[m]?.recebido || 0), 0);
  const recebidoMes = monthlyTotals[selectedMonth]?.recebido || 0;
  const emAbertoMes = monthlyTotals[selectedMonth]?.emAberto || 0;

  const clientNames = Object.keys(byClientMonth);
  const rows = clientNames.map((cliente) => {
    const monthData = byClientMonth[cliente]?.[selectedMonth] || { recebido: 0, emAberto: 0 };
    const matched = findMatchingClient(cliente, clients);
    return {
      cliente,
      recebido: monthData.recebido,
      emAberto: monthData.emAberto,
      contratado: matched?.monthlyValue ?? null,
      totalAcumulado: clientTotals[cliente]?.recebido || 0,
    };
  });

  const visibleRows = rows
    .filter((r) => r.recebido > 0 || r.emAberto > 0)
    .sort((a, b) => {
      const av = a[sortField] ?? (sortField === 'cliente' ? '' : 0);
      const bv = b[sortField] ?? (sortField === 'cliente' ? '' : 0);
      let cmp;
      if (sortField === 'cliente') cmp = av.localeCompare(bv, 'pt-BR');
      else cmp = av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/rentabilidade" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Rentabilidade</h1>
        <p style={styles.sub}>
          Sincronizado com sua planilha financeira -- lançamentos novos aparecem aqui automaticamente.
        </p>

        {error && <p style={styles.error}>{error}</p>}

        {months.length === 0 ? (
          <p style={styles.emptyState}>Nenhum lançamento encontrado na planilha ainda.</p>
        ) : (
          <>
            <div style={styles.controls}>
              <select
                style={styles.select}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {[...months].reverse().map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.statsRow}>
              <div style={styles.statTile}>
                <span style={styles.statLabel}>Recebido no mês</span>
                <span style={styles.statValue}>{formatMoney(recebidoMes)}</span>
              </div>
              <div style={styles.statTile}>
                <span style={styles.statLabel}>Em aberto no mês</span>
                <span style={{ ...styles.statValue, color: '#a23929' }}>{formatMoney(emAbertoMes)}</span>
              </div>
              <div style={styles.statTile}>
                <span style={styles.statLabel}>Recebido no ano ({selectedYear})</span>
                <span style={styles.statValue}>{formatMoney(recebidoAno)}</span>
              </div>
            </div>

            <div style={styles.chartPanel}>
              <h2 style={styles.panelTitle}>Recebido por mês</h2>
              <div style={styles.chart}>
                {recentMonths.map((m) => {
                  const value = monthlyTotals[m]?.recebido || 0;
                  const heightPct = Math.max(2, (value / maxMonthTotal) * 100);
                  const isSelected = m === selectedMonth;
                  return (
                    <div key={m} style={styles.barCol} onClick={() => setSelectedMonth(m)} title={formatMoney(value)}>
                      <div style={styles.barTrack}>
                        <div
                          style={{
                            ...styles.bar,
                            height: `${heightPct}%`,
                            background: isSelected ? '#C8A869' : 'rgba(139,165,143,0.55)',
                          }}
                        />
                      </div>
                      <span style={styles.barLabel}>{monthLabelShort(m)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <h2 style={styles.tableTitle}>Por cliente em {monthLabel(selectedMonth)}</h2>
            <div style={styles.tableWrap}>
              <div style={styles.tableHeadRow}>
                <span style={styles.sortableHead} onClick={() => handleSort('cliente')}>
                  Cliente{sortArrow('cliente')}
                </span>
                <span style={styles.sortableHead} onClick={() => handleSort('recebido')}>
                  Recebido{sortArrow('recebido')}
                </span>
                <span style={styles.sortableHead} onClick={() => handleSort('emAberto')}>
                  Em aberto{sortArrow('emAberto')}
                </span>
                <span style={styles.sortableHead} onClick={() => handleSort('contratado')}>
                  Valor mensal contratado{sortArrow('contratado')}
                </span>
              </div>
              {visibleRows.length === 0 && (
                <p style={styles.emptyStateInline}>Nenhum lançamento nesse mês.</p>
              )}
              {visibleRows.map((r) => (
                <div key={r.cliente} style={styles.tableRow}>
                  <span style={styles.clientName}>{r.cliente}</span>
                  <span>{formatMoney(r.recebido)}</span>
                  <span style={r.emAberto > 0 ? { color: '#a23929' } : undefined}>
                    {r.emAberto > 0 ? formatMoney(r.emAberto) : '—'}
                  </span>
                  <span>{r.contratado != null ? formatMoney(r.contratado) : '—'}</span>
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
    minWidth: 220,
    background: '#fff',
  },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 },
  statTile: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 8,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statLabel: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#3C4A38', opacity: 0.7 },
  statValue: { fontSize: '1.4rem', fontWeight: 700, color: '#0F2D24', fontVariantNumeric: 'tabular-nums' },
  chartPanel: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 8,
    padding: '20px 24px',
    marginBottom: 28,
  },
  panelTitle: { fontSize: '0.95rem', margin: '0 0 18px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  chart: { display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, overflowX: 'auto' },
  barCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flex: '1 0 32px',
    height: '100%',
    cursor: 'pointer',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: { width: '60%', minWidth: 10, borderRadius: '3px 3px 0 0', transition: 'height 0.2s ease' },
  barLabel: { fontSize: '0.62rem', color: '#3C4A38', opacity: 0.75, whiteSpace: 'nowrap' },
  tableTitle: { fontSize: '0.95rem', margin: '0 0 10px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  tableWrap: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, overflow: 'hidden' },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1.3fr',
    padding: '10px 20px',
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    alignItems: 'center',
  },
  sortableHead: { cursor: 'pointer', userSelect: 'none' },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1.3fr',
    padding: '11px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.84rem',
    alignItems: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  clientName: { fontWeight: 600, fontVariantNumeric: 'normal' },
  emptyStateInline: { padding: 20, color: '#3C4A38', margin: 0 },
};
