'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const STATUS_OPTIONS = ['Em andamento', 'Concluído', 'Prejuízo'];
const STATUS_STYLE = {
  'Em andamento': { background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' },
  Concluído: { background: 'rgba(58,140,82,0.18)', color: '#2f6b41' },
  Prejuízo: { background: 'rgba(200,73,58,0.15)', color: '#a23929' },
};

const SITUACAO_OPTIONS = ['Aberto', 'Em andamento', 'Pago'];
const SITUACAO_STYLE = {
  Aberto: { background: 'rgba(200,73,58,0.15)', color: '#a23929' },
  'Em andamento': { background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' },
  Pago: { background: 'rgba(58,140,82,0.18)', color: '#2f6b41' },
};

const EMPTY_NEW_PROCESSO = {
  cliente: '',
  parteContraria: '',
  numeroProcesso: '',
  dataInicial: '',
  valorCausa: '',
  status: 'Em andamento',
  ultimoAndamento: '',
  dataAndamento: '',
  honorarios: '',
  situacao: 'Aberto',
  juizo: '',
  telefone: '',
  email: '',
};

function formatMoney(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ProcessosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processos, setProcessos] = useState([]);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [sortField, setSortField] = useState('cliente');
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({
    cliente: '',
    parteContraria: '',
    numeroProcesso: '',
    juizo: '',
    status: [],
    situacao: [],
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProcesso, setNewProcesso] = useState(EMPTY_NEW_PROCESSO);
  const [addingProcesso, setAddingProcesso] = useState(false);

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
      await loadProcessos();
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadProcessos() {
    const res = await fetch('/api/admin/processos');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    const data = await res.json();
    setProcessos(data.processos || []);
  }

  function updateLocal(rowNumber, field, value) {
    setProcessos((ps) => ps.map((p) => (p.rowNumber === rowNumber ? { ...p, [field]: value } : p)));
  }

  async function commitField(rowNumber, field, value) {
    const key = `${rowNumber}-${field}`;
    setSavingKey(key);
    setError('');
    const res = await fetch('/api/admin/processos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowNumber, field, value }),
    });
    setSavingKey(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        `Erro ao salvar na planilha (${res.status}): ${JSON.stringify(body)}. Recarregue a página pra conferir o valor salvo.`
      );
    }
  }

  function handleImmediateChange(rowNumber, field, value) {
    updateLocal(rowNumber, field, value);
    commitField(rowNumber, field, value);
  }

  function handleTextChange(rowNumber, field, value) {
    updateLocal(rowNumber, field, value);
  }

  function handleTextBlur(rowNumber, field) {
    const value = processos.find((p) => p.rowNumber === rowNumber)?.[field] ?? '';
    commitField(rowNumber, field, value);
  }

  function autoResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  async function handleAddProcesso(e) {
    e.preventDefault();
    if (!newProcesso.cliente) return;
    setAddingProcesso(true);
    setError('');
    const res = await fetch('/api/admin/processos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProcesso),
    });
    setAddingProcesso(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao adicionar processo (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    setNewProcesso(EMPTY_NEW_PROCESSO);
    setShowAddForm(false);
    await loadProcessos();
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

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  const COLUMNS = [
    { field: 'cliente', label: 'Cliente', filter: 'text' },
    { field: 'parteContraria', label: 'Parte Contrária', filter: 'text' },
    { field: 'numeroProcesso', label: 'Nº Processo', filter: 'text' },
    { field: 'status', label: 'Status', filter: 'multiselect', options: STATUS_OPTIONS },
    { field: 'dataInicial', label: 'Data inicial', filter: 'none' },
    { field: 'valorCausa', label: 'Valor da Causa', filter: 'none' },
    { field: 'ultimoAndamento', label: 'Último Andamento', filter: 'none' },
    { field: 'dataAndamento', label: 'Data', filter: 'none' },
    { field: 'honorarios', label: 'Honorários', filter: 'none' },
    { field: 'situacao', label: 'Situação', filter: 'multiselect', options: SITUACAO_OPTIONS },
    { field: 'juizo', label: 'Juízo', filter: 'text' },
    { field: 'telefone', label: 'Telefone', filter: 'none' },
    { field: 'email', label: 'E-mail', filter: 'none' },
  ];

  const stats = {
    emAndamento: processos.filter((p) => p.status === 'Em andamento').length,
    concluido: processos.filter((p) => p.status === 'Concluído').length,
    prejuizo: processos.filter((p) => p.status === 'Prejuízo').length,
    honorariosPagos: processos.filter((p) => p.situacao === 'Pago').reduce((s, p) => s + (p.honorarios || 0), 0),
    honorariosAbertos: processos
      .filter((p) => p.situacao !== 'Pago')
      .reduce((s, p) => s + (p.honorarios || 0), 0),
  };

  const visibleProcessos = processos
    .filter((p) => {
      for (const col of COLUMNS) {
        if (col.filter === 'multiselect') {
          const selected = filters[col.field];
          if (selected.length === 0) continue;
          if (!selected.includes((p[col.field] || '').toString())) return false;
        } else if (col.filter === 'text') {
          const filterValue = filters[col.field];
          if (!filterValue) continue;
          if (!(p[col.field] || '').toLowerCase().includes(filterValue.toLowerCase())) return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      let cmp;
      if (sortField === 'valorCausa' || sortField === 'honorarios') cmp = (av || 0) - (bv || 0);
      else cmp = av.toString().localeCompare(bv.toString(), 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/processos" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Processos Jurídicos</h1>
        <p style={styles.sub}>
          Sincronizado com sua planilha de processos -- editar aqui já atualiza lá.
        </p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.statsRow}>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Em andamento</span>
            <span style={styles.statValue}>{stats.emAndamento}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Concluídos</span>
            <span style={{ ...styles.statValue, color: '#2f6b41' }}>{stats.concluido}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Prejuízo</span>
            <span style={{ ...styles.statValue, color: '#a23929' }}>{stats.prejuizo}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Honorários pagos</span>
            <span style={styles.statValue}>{formatMoney(stats.honorariosPagos)}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Honorários em aberto</span>
            <span style={{ ...styles.statValue, color: '#a23929' }}>{formatMoney(stats.honorariosAbertos)}</span>
          </div>
        </div>

        <div style={styles.controls}>
          <button style={styles.button} onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? 'Cancelar' : '+ Novo processo'}
          </button>
        </div>

        {showAddForm && (
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Novo processo</h3>
            <form onSubmit={handleAddProcesso} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Cliente</label>
                <input
                  style={styles.input}
                  required
                  value={newProcesso.cliente}
                  onChange={(e) => setNewProcesso({ ...newProcesso, cliente: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Parte Contrária</label>
                <input
                  style={styles.input}
                  value={newProcesso.parteContraria}
                  onChange={(e) => setNewProcesso({ ...newProcesso, parteContraria: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Número do Processo</label>
                <input
                  style={styles.input}
                  value={newProcesso.numeroProcesso}
                  onChange={(e) => setNewProcesso({ ...newProcesso, numeroProcesso: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Data inicial</label>
                <input
                  style={styles.input}
                  type="date"
                  value={newProcesso.dataInicial}
                  onChange={(e) => setNewProcesso({ ...newProcesso, dataInicial: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Valor da Causa</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  value={newProcesso.valorCausa}
                  onChange={(e) => setNewProcesso({ ...newProcesso, valorCausa: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.input}
                  value={newProcesso.status}
                  onChange={(e) => setNewProcesso({ ...newProcesso, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Honorários</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  value={newProcesso.honorarios}
                  onChange={(e) => setNewProcesso({ ...newProcesso, honorarios: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Situação</label>
                <select
                  style={styles.input}
                  value={newProcesso.situacao}
                  onChange={(e) => setNewProcesso({ ...newProcesso, situacao: e.target.value })}
                >
                  {SITUACAO_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Juízo</label>
                <input
                  style={styles.input}
                  value={newProcesso.juizo}
                  onChange={(e) => setNewProcesso({ ...newProcesso, juizo: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Telefone</label>
                <input
                  style={styles.input}
                  value={newProcesso.telefone}
                  onChange={(e) => setNewProcesso({ ...newProcesso, telefone: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>E-mail</label>
                <input
                  style={styles.input}
                  value={newProcesso.email}
                  onChange={(e) => setNewProcesso({ ...newProcesso, email: e.target.value })}
                />
              </div>
              <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Último Andamento</label>
                <textarea
                  style={styles.textareaInput}
                  value={newProcesso.ultimoAndamento}
                  onChange={(e) => setNewProcesso({ ...newProcesso, ultimoAndamento: e.target.value })}
                  rows={3}
                />
              </div>
              <div style={styles.formActions}>
                <button style={styles.button} type="submit" disabled={addingProcesso}>
                  {addingProcesso ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        )}

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
                      {col.options.map((opt) => (
                        <label key={opt} style={styles.filterCheckboxRow}>
                          <input
                            type="checkbox"
                            checked={filters[col.field].includes(opt)}
                            onChange={() => toggleMultiFilter(col.field, opt)}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
          {visibleProcessos.length === 0 && <p style={styles.emptyStateInline}>Nenhum processo encontrado.</p>}
          {visibleProcessos.map((p) => (
            <div key={p.rowNumber} style={styles.tableRow}>
              <input
                style={styles.textInput}
                value={p.cliente}
                onChange={(e) => handleTextChange(p.rowNumber, 'cliente', e.target.value)}
                onBlur={() => handleTextBlur(p.rowNumber, 'cliente')}
              />
              <input
                style={styles.textInput}
                value={p.parteContraria}
                onChange={(e) => handleTextChange(p.rowNumber, 'parteContraria', e.target.value)}
                onBlur={() => handleTextBlur(p.rowNumber, 'parteContraria')}
              />
              <input
                style={styles.textInput}
                value={p.numeroProcesso}
                onChange={(e) => handleTextChange(p.rowNumber, 'numeroProcesso', e.target.value)}
                onBlur={() => handleTextBlur(p.rowNumber, 'numeroProcesso')}
              />
              <select
                style={{
                  ...styles.statusSelect,
                  ...(STATUS_STYLE[p.status] || {}),
                  opacity: savingKey === `${p.rowNumber}-status` ? 0.5 : 1,
                }}
                value={p.status || ''}
                disabled={savingKey === `${p.rowNumber}-status`}
                onChange={(e) => handleImmediateChange(p.rowNumber, 'status', e.target.value)}
              >
                {!STATUS_OPTIONS.includes(p.status) && p.status && <option value={p.status}>{p.status}</option>}
                <option value="">—</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="date"
                style={styles.dateInput}
                value={p.dataInicial || ''}
                disabled={savingKey === `${p.rowNumber}-dataInicial`}
                onChange={(e) => handleImmediateChange(p.rowNumber, 'dataInicial', e.target.value)}
              />
              <input
                style={styles.valorInput}
                type="number"
                step="0.01"
                value={p.valorCausa ?? ''}
                onChange={(e) => handleTextChange(p.rowNumber, 'valorCausa', e.target.value)}
                onBlur={() => handleTextBlur(p.rowNumber, 'valorCausa')}
              />
              <textarea
                ref={autoResize}
                style={styles.andamentoTextarea}
                value={p.ultimoAndamento}
                onChange={(e) => {
                  handleTextChange(p.rowNumber, 'ultimoAndamento', e.target.value);
                  autoResize(e.target);
                }}
                onBlur={() => handleTextBlur(p.rowNumber, 'ultimoAndamento')}
                rows={2}
              />
              <input
                type="date"
                style={styles.dateInput}
                value={p.dataAndamento || ''}
                disabled={savingKey === `${p.rowNumber}-dataAndamento`}
                onChange={(e) => handleImmediateChange(p.rowNumber, 'dataAndamento', e.target.value)}
              />
              <input
                style={styles.valorInput}
                type="number"
                step="0.01"
                value={p.honorarios ?? ''}
                onChange={(e) => handleTextChange(p.rowNumber, 'honorarios', e.target.value)}
                onBlur={() => handleTextBlur(p.rowNumber, 'honorarios')}
              />
              <select
                style={{
                  ...styles.statusSelect,
                  ...(SITUACAO_STYLE[p.situacao] || {}),
                  opacity: savingKey === `${p.rowNumber}-situacao` ? 0.5 : 1,
                }}
                value={p.situacao || ''}
                disabled={savingKey === `${p.rowNumber}-situacao`}
                onChange={(e) => handleImmediateChange(p.rowNumber, 'situacao', e.target.value)}
              >
                {!SITUACAO_OPTIONS.includes(p.situacao) && p.situacao && (
                  <option value={p.situacao}>{p.situacao}</option>
                )}
                <option value="">—</option>
                {SITUACAO_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                style={styles.textInput}
                value={p.juizo}
                onChange={(e) => handleTextChange(p.rowNumber, 'juizo', e.target.value)}
                onBlur={() => handleTextBlur(p.rowNumber, 'juizo')}
              />
              <input
                style={styles.textInput}
                value={p.telefone}
                onChange={(e) => handleTextChange(p.rowNumber, 'telefone', e.target.value)}
                onBlur={() => handleTextBlur(p.rowNumber, 'telefone')}
              />
              <input
                style={styles.textInput}
                value={p.email}
                onChange={(e) => handleTextChange(p.rowNumber, 'email', e.target.value)}
                onBlur={() => handleTextBlur(p.rowNumber, 'email')}
              />
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
  main: { flex: 1, padding: '36px 48px', maxWidth: 1440 },
  h1: { fontSize: '1.6rem', margin: '0 0 6px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  sub: { color: '#3C4A38', marginBottom: 22, fontSize: '0.9rem' },
  error: { color: '#c8493a', marginBottom: 18, fontSize: '0.9rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 },
  statTile: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 8,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statLabel: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#3C4A38', opacity: 0.7 },
  statValue: { fontSize: '1.3rem', fontWeight: 700, color: '#0F2D24', fontVariantNumeric: 'tabular-nums' },
  controls: { display: 'flex', marginBottom: 16 },
  panel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, padding: '20px 24px', marginBottom: 24 },
  panelTitle: { fontSize: '0.95rem', marginBottom: 14, fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, alignItems: 'end' },
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
  textareaInput: {
    padding: '8px 10px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '0.85rem',
    fontFamily: 'Inter, sans-serif',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  formActions: { display: 'flex', gap: 10 },
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
  tableWrap: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, overflow: 'auto' },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1fr 1fr 1fr 2fr 1fr 1fr 1fr 1fr 1fr 1.4fr',
    padding: '10px 16px',
    fontSize: '0.66rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    gap: 10,
    minWidth: 1700,
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
    minWidth: 160,
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
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1fr 1fr 1fr 2fr 1fr 1fr 1fr 1fr 1fr 1.4fr',
    padding: '8px 16px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    gap: 10,
    alignItems: 'center',
    minWidth: 1700,
  },
  textInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.8rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  andamentoTextarea: {
    border: '1px solid rgba(15,45,36,0.12)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.78rem',
    fontFamily: 'Inter, sans-serif',
    color: '#3C4A38',
    background: '#F7F5F0',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'none',
    overflow: 'hidden',
  },
  dateInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.78rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  valorInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.8rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  statusSelect: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 30,
    padding: '6px 8px',
    fontSize: '0.72rem',
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
    height: 32,
    width: '100%',
  },
  emptyStateInline: { padding: 20, color: '#3C4A38', margin: 0 },
};
