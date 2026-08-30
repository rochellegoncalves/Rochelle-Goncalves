'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const STATUS_OPTIONS = ['Lead Frio', 'Lead Morno', 'Proposta enviada', 'Cliente', 'Fora do Perfil'];
const FUNNEL_ORDER = ['Lead Frio', 'Lead Morno', 'Proposta enviada', 'Cliente', 'Fora do Perfil'];
const STATUS_STYLE = {
  'Fora do Perfil': { background: 'rgba(200,73,58,0.15)', color: '#a23929' },
  'Lead Frio': { background: 'rgba(15,45,36,0.06)', color: '#3C4A38' },
  'Lead Morno': { background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' },
  'Proposta enviada': { background: 'rgba(139,165,143,0.2)', color: '#4c6350' },
  Cliente: { background: 'rgba(58,140,82,0.18)', color: '#2f6b41' },
};

const EMPTY_NEW_CONTACT = {
  nome: '',
  origem: '',
  segmento: '',
  objetivo: '',
  potencial: '',
  status: 'Lead Frio',
  dataContato: '',
  valorProposta: '',
};

function formatMoney(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CrmPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [sortField, setSortField] = useState('nome');
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({
    nome: '',
    segmento: '',
    objetivo: '',
    origem: [],
    potencial: [],
    status: [],
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState(EMPTY_NEW_CONTACT);
  const [addingContact, setAddingContact] = useState(false);

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
      await loadContacts();
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadContacts() {
    const res = await fetch('/api/admin/crm');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    const data = await res.json();
    setContacts(data.contacts || []);
  }

  function updateLocal(rowNumber, field, value) {
    setContacts((cs) => cs.map((c) => (c.rowNumber === rowNumber ? { ...c, [field]: value } : c)));
  }

  async function commitField(rowNumber, field, value) {
    const key = `${rowNumber}-${field}`;
    setSavingKey(key);
    setError('');
    const res = await fetch('/api/admin/crm', {
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
    const value = contacts.find((c) => c.rowNumber === rowNumber)?.[field] ?? '';
    commitField(rowNumber, field, value);
  }

  async function handleAddContact(e) {
    e.preventDefault();
    if (!newContact.nome) return;
    setAddingContact(true);
    setError('');
    const res = await fetch('/api/admin/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newContact),
    });
    setAddingContact(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao adicionar contato (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    setNewContact(EMPTY_NEW_CONTACT);
    setShowAddForm(false);
    await loadContacts();
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

  function distinctValues(field) {
    return [...new Set(contacts.map((c) => (c[field] || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
  }

  const origemOptions = distinctValues('origem');
  const potencialOptions = [...new Set(contacts.map((c) => (c.potencial || '').trim()).filter(Boolean))].sort();

  const COLUMNS = [
    { field: 'nome', label: 'Nome', filter: 'text' },
    { field: 'origem', label: 'Origem', filter: 'multiselect', options: origemOptions },
    { field: 'segmento', label: 'Segmento', filter: 'text' },
    { field: 'objetivo', label: 'Objetivo', filter: 'text' },
    { field: 'potencial', label: 'Potencial', filter: 'multiselect', options: potencialOptions },
    { field: 'status', label: 'Status', filter: 'multiselect', options: STATUS_OPTIONS },
    { field: 'dataContato', label: 'Data Contato', filter: 'none' },
    { field: 'valorProposta', label: 'Valor da Proposta', filter: 'none' },
  ];

  const funnelStats = FUNNEL_ORDER.map((status) => {
    const inStage = contacts.filter((c) => c.status === status);
    return {
      status,
      count: inStage.length,
      total: inStage.reduce((sum, c) => sum + (c.valorProposta || 0), 0),
    };
  });

  const visibleContacts = contacts
    .filter((c) => {
      for (const col of COLUMNS) {
        if (col.filter === 'multiselect') {
          const selected = filters[col.field];
          if (selected.length === 0) continue;
          if (!selected.includes((c[col.field] || '').toString())) return false;
        } else if (col.filter === 'text') {
          const filterValue = filters[col.field];
          if (!filterValue) continue;
          if (!(c[col.field] || '').toLowerCase().includes(filterValue.toLowerCase())) return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      let cmp;
      if (sortField === 'valorProposta') cmp = (av || 0) - (bv || 0);
      else if (sortField === 'potencial') cmp = (Number(av) || 0) - (Number(bv) || 0);
      else cmp = av.toString().localeCompare(bv.toString(), 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/crm" />

      <main style={styles.main}>
        <h1 style={styles.h1}>CRM</h1>
        <p style={styles.sub}>
          Sincronizado com sua planilha de relacionamentos -- editar aqui já atualiza lá.
        </p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.funnelRow}>
          {funnelStats.map((stage) => (
            <div key={stage.status} style={styles.funnelCard}>
              <span style={{ ...styles.funnelBadge, ...(STATUS_STYLE[stage.status] || {}) }}>{stage.status}</span>
              <span style={styles.funnelCount}>{stage.count}</span>
              {stage.total > 0 && <span style={styles.funnelTotal}>{formatMoney(stage.total)}</span>}
            </div>
          ))}
        </div>

        <div style={styles.controls}>
          <button style={styles.button} onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? 'Cancelar' : '+ Novo contato'}
          </button>
        </div>

        {showAddForm && (
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Novo contato</h3>
            <form onSubmit={handleAddContact} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Nome</label>
                <input
                  style={styles.input}
                  required
                  value={newContact.nome}
                  onChange={(e) => setNewContact({ ...newContact, nome: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Origem</label>
                <input
                  style={styles.input}
                  value={newContact.origem}
                  onChange={(e) => setNewContact({ ...newContact, origem: e.target.value })}
                  placeholder="Networking, Família..."
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Segmento</label>
                <input
                  style={styles.input}
                  value={newContact.segmento}
                  onChange={(e) => setNewContact({ ...newContact, segmento: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Objetivo</label>
                <input
                  style={styles.input}
                  value={newContact.objetivo}
                  onChange={(e) => setNewContact({ ...newContact, objetivo: e.target.value })}
                  placeholder="Cliente, Indicação..."
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Potencial (0-5)</label>
                <input
                  style={styles.input}
                  value={newContact.potencial}
                  onChange={(e) => setNewContact({ ...newContact, potencial: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.input}
                  value={newContact.status}
                  onChange={(e) => setNewContact({ ...newContact, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Data Contato</label>
                <input
                  style={styles.input}
                  type="date"
                  value={newContact.dataContato}
                  onChange={(e) => setNewContact({ ...newContact, dataContato: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Valor da Proposta</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  value={newContact.valorProposta}
                  onChange={(e) => setNewContact({ ...newContact, valorProposta: e.target.value })}
                />
              </div>
              <div style={styles.formActions}>
                <button style={styles.button} type="submit" disabled={addingContact}>
                  {addingContact ? 'Adicionando...' : 'Adicionar'}
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
                      {col.options.length === 0 && <span style={styles.filterEmptyNote}>Sem valores</span>}
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
          {visibleContacts.length === 0 && <p style={styles.emptyStateInline}>Nenhum contato encontrado.</p>}
          {visibleContacts.map((c) => (
            <div key={c.rowNumber} style={styles.tableRow}>
              <input
                style={styles.textInput}
                value={c.nome}
                onChange={(e) => handleTextChange(c.rowNumber, 'nome', e.target.value)}
                onBlur={() => handleTextBlur(c.rowNumber, 'nome')}
              />
              <input
                style={styles.textInput}
                value={c.origem}
                onChange={(e) => handleTextChange(c.rowNumber, 'origem', e.target.value)}
                onBlur={() => handleTextBlur(c.rowNumber, 'origem')}
              />
              <input
                style={styles.textInput}
                value={c.segmento}
                onChange={(e) => handleTextChange(c.rowNumber, 'segmento', e.target.value)}
                onBlur={() => handleTextBlur(c.rowNumber, 'segmento')}
              />
              <input
                style={styles.textInput}
                value={c.objetivo}
                onChange={(e) => handleTextChange(c.rowNumber, 'objetivo', e.target.value)}
                onBlur={() => handleTextBlur(c.rowNumber, 'objetivo')}
              />
              <input
                style={styles.potencialInput}
                value={c.potencial}
                onChange={(e) => handleTextChange(c.rowNumber, 'potencial', e.target.value)}
                onBlur={() => handleTextBlur(c.rowNumber, 'potencial')}
              />
              <select
                style={{
                  ...styles.statusSelect,
                  ...(STATUS_STYLE[c.status] || {}),
                  opacity: savingKey === `${c.rowNumber}-status` ? 0.5 : 1,
                }}
                value={c.status || ''}
                disabled={savingKey === `${c.rowNumber}-status`}
                onChange={(e) => handleImmediateChange(c.rowNumber, 'status', e.target.value)}
              >
                {!STATUS_OPTIONS.includes(c.status) && c.status && <option value={c.status}>{c.status}</option>}
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
                value={c.dataContato || ''}
                disabled={savingKey === `${c.rowNumber}-dataContato`}
                onChange={(e) => handleImmediateChange(c.rowNumber, 'dataContato', e.target.value)}
              />
              <input
                style={styles.valorInput}
                type="number"
                step="0.01"
                value={c.valorProposta ?? ''}
                onChange={(e) => handleTextChange(c.rowNumber, 'valorProposta', e.target.value)}
                onBlur={() => handleTextBlur(c.rowNumber, 'valorProposta')}
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
  funnelRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 },
  funnelCard: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 8,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  funnelBadge: {
    alignSelf: 'flex-start',
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '4px 10px',
    borderRadius: 30,
  },
  funnelCount: { fontSize: '1.5rem', fontWeight: 700, color: '#0F2D24', fontVariantNumeric: 'tabular-nums' },
  funnelTotal: { fontSize: '0.78rem', color: '#3C4A38', fontVariantNumeric: 'tabular-nums' },
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
    gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.8fr 1.2fr 1fr 1.2fr',
    padding: '10px 16px',
    fontSize: '0.66rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    gap: 10,
    minWidth: 1100,
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
    gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.8fr 1.2fr 1fr 1.2fr',
    padding: '8px 16px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    gap: 10,
    alignItems: 'center',
    minWidth: 1100,
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
  potencialInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.82rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  dateInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.8rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  valorInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: '0.82rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  statusSelect: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 30,
    padding: '6px 10px',
    fontSize: '0.76rem',
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
    height: 34,
    width: '100%',
  },
  emptyStateInline: { padding: 20, color: '#3C4A38', margin: 0 },
};
