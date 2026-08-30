'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const STATUS_OPTIONS = ['Não iniciado', 'Em andamento', 'Concluído'];
const STATUS_STYLE = {
  'Não iniciado': { background: 'rgba(200,73,58,0.15)', color: '#a23929' },
  'Em andamento': { background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' },
  Concluído: { background: 'rgba(58,140,82,0.18)', color: '#2f6b41' },
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
  const [sortField, setSortField] = useState('prazo');
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({
    diagnostico: '',
    acao: '',
    obs: '',
    reuniao: [],
    responsavel: [],
    prazo: [],
    status: [],
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

  function updateLocal(rowNumber, field, value) {
    setItems((its) => its.map((it) => (it.rowNumber === rowNumber ? { ...it, [field]: value } : it)));
  }

  async function commitField(rowNumber, field, value) {
    const key = `${rowNumber}-${field}`;
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
      setError(
        `Erro ao salvar na planilha (${res.status}): ${JSON.stringify(body)}. Recarregue a página pra conferir o valor salvo.`
      );
    }
  }

  // Data e status mudam com uma única ação (escolher no calendário/lista),
  // então salvam na hora. Texto livre (Ação, Diagnóstico, Responsável) só
  // salva quando o campo perde o foco, pra não mandar uma chamada por letra
  // digitada.
  function handleImmediateChange(rowNumber, field, value) {
    updateLocal(rowNumber, field, value);
    commitField(rowNumber, field, value);
  }

  function handleTextChange(rowNumber, field, value) {
    updateLocal(rowNumber, field, value);
  }

  function handleTextBlur(rowNumber, field) {
    const value = items.find((it) => it.rowNumber === rowNumber)?.[field] ?? '';
    commitField(rowNumber, field, value);
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function sortArrow(field) {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  function handleTextFilterChange(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  function toggleMultiFilter(field, value) {
    setFilters((f) => {
      const current = f[field];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...f, [field]: next };
    });
  }

  function formatBR(iso) {
    if (!iso) return '(vazio)';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  const sortedClients = [...clients].sort((a, b) =>
    (a.companyName || '').localeCompare(b.companyName || '', 'pt-BR')
  );

  function distinctValues(field) {
    return [...new Set(items.map((it) => (it[field] || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
  }

  // O menu de responsável é montado a partir dos nomes já usados na
  // própria planilha desse cliente (cada planilha tem seu próprio
  // conjunto -- ex.: Sofia/Rubens/Ambos/Rochelle numa, setores da empresa
  // em outra), em vez de uma lista fixa.
  const responsavelOptions = distinctValues('responsavel');
  const reuniaoOptions = distinctValues('reuniao');
  const prazoOptions = distinctValues('prazo');
  const statusOptions = [...new Set([...STATUS_OPTIONS, ...distinctValues('status')])];

  const COLUMNS = [
    { field: 'reuniao', label: 'Reunião', filter: 'multiselect', options: reuniaoOptions, formatOption: formatBR },
    { field: 'diagnostico', label: 'Diagnóstico', filter: 'text' },
    { field: 'acao', label: 'Ação', filter: 'text' },
    { field: 'responsavel', label: 'Responsável', filter: 'multiselect', options: responsavelOptions },
    { field: 'prazo', label: 'Prazo', filter: 'multiselect', options: prazoOptions, formatOption: formatBR },
    { field: 'status', label: 'Status', filter: 'multiselect', options: statusOptions },
    { field: 'obs', label: 'OBS', filter: 'text' },
  ];

  function compareItems(a, b, field, dir) {
    const av = a[field] ?? '';
    const bv = b[field] ?? '';
    const aEmpty = av === '';
    const bEmpty = bv === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    const cmp = av.localeCompare(bv, 'pt-BR');
    return dir === 'asc' ? cmp : -cmp;
  }

  const visibleItems = items
    .filter((it) => {
      for (const col of COLUMNS) {
        if (col.filter === 'multiselect') {
          const selected = filters[col.field];
          if (selected.length === 0) continue;
          const itemValue = (it[col.field] || '').toString();
          if (!selected.includes(itemValue)) return false;
        } else if (col.filter === 'text') {
          const filterValue = filters[col.field];
          if (!filterValue) continue;
          const itemValue = (it[col.field] || '').toString();
          if (!itemValue.toLowerCase().includes(filterValue.toLowerCase())) return false;
        }
      }
      return true;
    })
    .sort((a, b) => compareItems(a, b, sortField, sortDir));

  function autoResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

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
                {sortedClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            {sheetNotConfigured ? (
              <p style={styles.emptyState}>
                Esse cliente ainda não tem uma planilha de Plano de Ação configurada. Vá em "Clientes", edite esse
                cliente e cole o link da planilha do Google Sheets dele.
              </p>
            ) : (
              <div style={styles.tableWrap}>
                <div style={styles.tableHeadRow}>
                  {COLUMNS.map((col) => (
                    <div key={col.field} style={styles.headCell}>
                      <span style={styles.sortableHead} onClick={() => handleSort(col.field)}>
                        {col.label}
                        {sortArrow(col.field)}
                      </span>
                      {col.filter === 'text' && (
                        <input
                          style={styles.headFilterInput}
                          value={filters[col.field]}
                          onChange={(e) => handleTextFilterChange(col.field, e.target.value)}
                          placeholder="Filtrar..."
                        />
                      )}
                      {col.filter === 'multiselect' && (
                        <details style={styles.filterDetails}>
                          <summary style={styles.filterSummary}>
                            {filters[col.field].length === 0
                              ? 'Todos'
                              : `${filters[col.field].length} selecionado${filters[col.field].length > 1 ? 's' : ''}`}
                          </summary>
                          <div style={styles.filterPanel}>
                            {col.options.length === 0 && (
                              <span style={styles.filterEmptyNote}>Sem valores</span>
                            )}
                            {col.options.map((opt) => (
                              <label key={opt} style={styles.filterCheckboxRow}>
                                <input
                                  type="checkbox"
                                  checked={filters[col.field].includes(opt)}
                                  onChange={() => toggleMultiFilter(col.field, opt)}
                                />
                                <span>{col.formatOption ? col.formatOption(opt) : opt}</span>
                              </label>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
                {visibleItems.length === 0 && (
                  <p style={styles.emptyStateInline}>Nenhuma ação pendente por aqui.</p>
                )}
                {visibleItems.map((item) => (
                  <div key={item.rowNumber} style={styles.tableRow}>
                    <input
                      type="date"
                      style={styles.dateInput}
                      value={item.reuniao || ''}
                      disabled={savingKey === `${item.rowNumber}-reuniao`}
                      onChange={(e) => handleImmediateChange(item.rowNumber, 'reuniao', e.target.value)}
                    />
                    <textarea
                      ref={autoResize}
                      style={styles.diagnosticoTextarea}
                      value={item.diagnostico}
                      onChange={(e) => {
                        handleTextChange(item.rowNumber, 'diagnostico', e.target.value);
                        autoResize(e.target);
                      }}
                      onBlur={() => handleTextBlur(item.rowNumber, 'diagnostico')}
                      rows={2}
                    />
                    <textarea
                      ref={autoResize}
                      style={styles.acaoTextarea}
                      value={item.acao}
                      onChange={(e) => {
                        handleTextChange(item.rowNumber, 'acao', e.target.value);
                        autoResize(e.target);
                      }}
                      onBlur={() => handleTextBlur(item.rowNumber, 'acao')}
                      rows={2}
                    />
                    <select
                      style={{
                        ...styles.statusSelect,
                        opacity: savingKey === `${item.rowNumber}-responsavel` ? 0.5 : 1,
                      }}
                      value={item.responsavel || ''}
                      disabled={savingKey === `${item.rowNumber}-responsavel`}
                      onChange={(e) => handleImmediateChange(item.rowNumber, 'responsavel', e.target.value)}
                    >
                      <option value="">—</option>
                      {!responsavelOptions.includes((item.responsavel || '').trim()) && item.responsavel && (
                        <option value={item.responsavel}>{item.responsavel}</option>
                      )}
                      {responsavelOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      style={styles.dateInput}
                      value={item.prazo || ''}
                      disabled={savingKey === `${item.rowNumber}-prazo`}
                      onChange={(e) => handleImmediateChange(item.rowNumber, 'prazo', e.target.value)}
                    />
                    <select
                      style={{
                        ...styles.statusSelect,
                        ...(STATUS_STYLE[item.status] || {}),
                        opacity: savingKey === `${item.rowNumber}-status` ? 0.5 : 1,
                      }}
                      value={item.status || ''}
                      disabled={savingKey === `${item.rowNumber}-status`}
                      onChange={(e) => handleImmediateChange(item.rowNumber, 'status', e.target.value)}
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
                    <input
                      style={styles.textInput}
                      value={item.obs}
                      onChange={(e) => handleTextChange(item.rowNumber, 'obs', e.target.value)}
                      onBlur={() => handleTextBlur(item.rowNumber, 'obs')}
                    />
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
  emptyStateInline: {
    padding: 20,
    color: '#3C4A38',
    margin: 0,
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 6,
  },
  tableWrap: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 6,
    overflow: 'auto',
  },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '110px 2fr 2fr 1fr 110px 130px 1.2fr',
    padding: '10px 16px',
    fontSize: '0.66rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    gap: 10,
    minWidth: 1000,
    alignItems: 'start',
  },
  headCell: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  sortableHead: { cursor: 'pointer', userSelect: 'none' },
  headFilterInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '5px 7px',
    fontSize: '0.72rem',
    fontWeight: 400,
    textTransform: 'none',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  filterDetails: { position: 'relative', width: '100%' },
  filterSummary: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '5px 7px',
    fontSize: '0.72rem',
    fontWeight: 400,
    textTransform: 'none',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    color: '#0F2D24',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
    listStyle: 'none',
  },
  filterPanel: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    zIndex: 20,
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '8px 10px',
    minWidth: 180,
    maxHeight: 220,
    overflowY: 'auto',
    boxShadow: '0 6px 18px rgba(15,45,36,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  filterCheckboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.78rem',
    fontWeight: 400,
    textTransform: 'none',
    color: '#0F2D24',
    whiteSpace: 'nowrap',
  },
  filterEmptyNote: { fontSize: '0.75rem', color: 'rgba(15,45,36,0.5)', fontWeight: 400, textTransform: 'none' },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '110px 2fr 2fr 1fr 110px 130px 1.2fr',
    padding: '10px 16px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    gap: 10,
    alignItems: 'start',
    minWidth: 1000,
  },
  dateInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.8rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
  },
  textInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.82rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  acaoTextarea: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '8px 10px',
    fontSize: '0.86rem',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    color: '#0F2D24',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'none',
    overflow: 'hidden',
  },
  diagnosticoTextarea: {
    border: '1px solid rgba(15,45,36,0.12)',
    borderRadius: 4,
    padding: '8px 10px',
    fontSize: '0.8rem',
    fontFamily: 'Inter, sans-serif',
    color: '#3C4A38',
    background: '#F7F5F0',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'none',
    overflow: 'hidden',
  },
  statusSelect: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 30,
    padding: '6px 10px',
    fontSize: '0.76rem',
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
    height: 34,
  },
};
