'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const OBJETIVO_STATUS_OPTIONS = ['Concluído', 'Parcial', 'Não concluído'];
const OBJETIVO_STATUS_STYLE = {
  Concluído: { background: 'rgba(58,140,82,0.18)', color: '#2f6b41' },
  Parcial: { background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' },
  'Não concluído': { background: 'rgba(200,73,58,0.15)', color: '#a23929' },
};

const CHECKLIST_GROUPS = [
  {
    category: 'Gestão',
    items: [
      { key: 'gestao_canvas', label: 'Modelo de negócio (Canvas)' },
      { key: 'gestao_swot', label: 'Análise de Riscos e Oportunidades (SWOT)' },
      { key: 'gestao_plano_acao', label: 'Plano de ação (Matriz de Eisenhower + 5W2H)' },
      { key: 'gestao_rotina_indicadores', label: 'Rotina e indicadores (Metas SMART)' },
      { key: 'gestao_precificacao', label: 'Precificação de até 5 produtos ou serviços' },
      { key: 'gestao_receitas_despesas', label: 'Classificação de receitas e despesas' },
      { key: 'gestao_fluxo_caixa', label: 'Fluxo de caixa' },
      { key: 'gestao_orcamento_dre', label: 'Orçamento e DRE' },
    ],
  },
  {
    category: 'Comercial',
    items: [
      { key: 'comercial_7ps', label: '7 Ps do Marketing' },
      { key: 'comercial_jornada', label: 'Jornada do cliente' },
      { key: 'comercial_funil', label: 'Funil de vendas + Pipeline Comercial' },
      { key: 'comercial_scripts', label: 'Scripts de atendimento ao cliente' },
      { key: 'comercial_matriz_abc', label: 'Matriz ABC + Pareto (80/20)' },
    ],
  },
  {
    category: 'Produtos/Serviços',
    items: [
      { key: 'produtos_mapeamento', label: 'Mapeamento de processos (fluxograma + POP)' },
      { key: 'produtos_gargalos', label: 'Identificação de gargalos operacionais (Lean)' },
      { key: 'produtos_organograma', label: 'Definição de papéis e responsabilidades + organograma' },
      { key: 'produtos_kaizen', label: 'Kaizen (Melhoria Contínua)' },
    ],
  },
  {
    category: 'Jurídico',
    items: [
      { key: 'juridico_contratos', label: 'Contrato com clientes e fornecedores' },
      { key: 'juridico_riscos', label: 'Riscos trabalhistas, tributários e patrimoniais' },
    ],
  },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function mondayOfToday() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  return toDateStr(date);
}

function shiftWeek(weekStart, deltaWeeks) {
  const [y, m, d] = weekStart.split('-').map(Number);
  const date = new Date(y, m - 1, d + deltaWeeks * 7);
  return toDateStr(date);
}

function formatWeekLabel(weekStart) {
  const [y, m, d] = weekStart.split('-');
  const start = new Date(Number(y), Number(m) - 1, Number(d));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (dt) => `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}`;
  return `${fmt(start)} - ${fmt(end)}/${end.getFullYear()}`;
}

const EMPTY_FORM = {
  objetivoSemana: '',
  objetivoStatus: '',
  estudoCount: '',
  posicionamentoCount: '',
  producaoCount: '',
  revisaoFeita: false,
  notas: '',
};

export default function IndicadoresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkins, setCheckins] = useState([]);
  const [relacionamentosPorSemana, setRelacionamentosPorSemana] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(mondayOfToday());
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [checklistDone, setChecklistDone] = useState({});

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
      await Promise.all([loadIndicadores(), loadChecklist()]);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadIndicadores() {
    const res = await fetch('/api/admin/indicadores');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    const data = await res.json();
    setCheckins(data.checkins || []);
    setRelacionamentosPorSemana(data.relacionamentosPorSemana || {});
  }

  async function loadChecklist() {
    const res = await fetch('/api/admin/checklist-metodologia');
    if (res.ok) {
      const data = await res.json();
      setChecklistDone(data.done || {});
    }
  }

  useEffect(() => {
    const existing = checkins.find((c) => c.week_start === selectedWeek);
    if (existing) {
      setForm({
        objetivoSemana: existing.objetivo_semana || '',
        objetivoStatus: existing.objetivo_status || '',
        estudoCount: existing.estudo_count ?? '',
        posicionamentoCount: existing.posicionamento_count ?? '',
        producaoCount: existing.producao_count ?? '',
        revisaoFeita: !!existing.revisao_feita,
        notas: existing.notas || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, checkins]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/indicadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: selectedWeek, ...form }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao salvar (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    await loadIndicadores();
  }

  async function toggleChecklistItem(itemKey) {
    const next = !checklistDone[itemKey];
    setChecklistDone((d) => ({ ...d, [itemKey]: next }));
    await fetch('/api/admin/checklist-metodologia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemKey, done: next }),
    });
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  const sortedCheckins = [...checkins].sort((a, b) => b.week_start.localeCompare(a.week_start));
  let streak = 0;
  for (const c of sortedCheckins) {
    if (c.objetivo_status === 'Concluído') streak++;
    else break;
  }

  const totalChecklistItems = CHECKLIST_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
  const doneChecklistItems = Object.values(checklistDone).filter(Boolean).length;

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/indicadores" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Indicadores da Consultoria</h1>
        <p style={styles.sub}>
          Resultado e produção por área, semana a semana -- não horas trabalhadas nem exaustão.
        </p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.weekNav}>
          <button style={styles.weekNavButton} onClick={() => setSelectedWeek(shiftWeek(selectedWeek, -1))}>
            ← Semana anterior
          </button>
          <span style={styles.weekLabel}>{formatWeekLabel(selectedWeek)}</span>
          <button style={styles.weekNavButton} onClick={() => setSelectedWeek(shiftWeek(selectedWeek, 1))}>
            Próxima semana →
          </button>
          {selectedWeek !== mondayOfToday() && (
            <button style={styles.weekNavButton} onClick={() => setSelectedWeek(mondayOfToday())}>
              Semana atual
            </button>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Meta da semana</h3>
            <div style={styles.metaRow}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={form.objetivoSemana}
                onChange={(e) => setForm({ ...form, objetivoSemana: e.target.value })}
                placeholder="Qual é o único objetivo que essa semana precisa entregar?"
              />
              <select
                style={{
                  ...styles.statusSelect,
                  ...(OBJETIVO_STATUS_STYLE[form.objetivoStatus] || {}),
                }}
                value={form.objetivoStatus}
                onChange={(e) => setForm({ ...form, objetivoStatus: e.target.value })}
              >
                <option value="">Status</option>
                {OBJETIVO_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.revisaoFeita}
                onChange={(e) => setForm({ ...form, revisaoFeita: e.target.checked })}
              />
              Fiz a revisão de fechamento da semana
            </label>
            {streak > 0 && (
              <p style={styles.streakNote}>
                🔥 {streak} semana{streak > 1 ? 's' : ''} seguida{streak > 1 ? 's' : ''} com meta concluída
              </p>
            )}
          </div>

          <div style={styles.statsRow}>
            <div style={styles.statTile}>
              <span style={styles.statLabel}>Estratégica e Estudo</span>
              <input
                style={styles.countInput}
                type="number"
                min="0"
                value={form.estudoCount}
                onChange={(e) => setForm({ ...form, estudoCount: e.target.value })}
                placeholder="0"
              />
              <span style={styles.statCaption}>sessões de estudo/revisão na semana</span>
            </div>
            <div style={styles.statTile}>
              <span style={styles.statLabel}>Posicionamento</span>
              <input
                style={styles.countInput}
                type="number"
                min="0"
                value={form.posicionamentoCount}
                onChange={(e) => setForm({ ...form, posicionamentoCount: e.target.value })}
                placeholder="0"
              />
              <span style={styles.statCaption}>conteúdos publicados na semana</span>
            </div>
            <div style={styles.statTile}>
              <span style={styles.statLabel}>Produção</span>
              <input
                style={styles.countInput}
                type="number"
                min="0"
                value={form.producaoCount}
                onChange={(e) => setForm({ ...form, producaoCount: e.target.value })}
                placeholder="0"
              />
              <span style={styles.statCaption}>entregas/reuniões concluídas na semana</span>
            </div>
            <div style={styles.statTile}>
              <span style={styles.statLabel}>Relacionamentos</span>
              <span style={styles.autoValue}>{relacionamentosPorSemana[selectedWeek] || 0}</span>
              <span style={styles.statCaption}>contatos com atividade na semana (auto, via CRM)</span>
            </div>
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Notas da semana</h3>
            <textarea
              style={styles.textarea}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={3}
              placeholder="Opcional"
            />
            <div style={styles.formActions}>
              <button style={styles.button} type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar semana'}
              </button>
            </div>
          </div>
        </form>

        <h2 style={styles.tableTitle}>Histórico</h2>
        <div style={styles.tableWrap}>
          <div style={styles.tableHeadRow}>
            <span>Semana</span>
            <span>Meta</span>
            <span>Status</span>
            <span>Estudo</span>
            <span>Posic.</span>
            <span>Produção</span>
            <span>Relac.</span>
          </div>
          {sortedCheckins.length === 0 && (
            <p style={styles.emptyStateInline}>Nenhum check-in registrado ainda.</p>
          )}
          {sortedCheckins.map((c) => (
            <div key={c.week_start} style={styles.tableRow}>
              <span>{formatWeekLabel(c.week_start)}</span>
              <span style={styles.metaCell}>{c.objetivo_semana || '—'}</span>
              <span>
                {c.objetivo_status && (
                  <span style={{ ...styles.statusPill, ...(OBJETIVO_STATUS_STYLE[c.objetivo_status] || {}) }}>
                    {c.objetivo_status}
                  </span>
                )}
              </span>
              <span>{c.estudo_count ?? '—'}</span>
              <span>{c.posicionamento_count ?? '—'}</span>
              <span>{c.producao_count ?? '—'}</span>
              <span>{relacionamentosPorSemana[c.week_start] || 0}</span>
            </div>
          ))}
        </div>

        <h2 style={styles.tableTitle}>
          Autoauditoria da metodologia ({doneChecklistItems}/{totalChecklistItems})
        </h2>
        <p style={styles.sub}>
          O mesmo checklist de "Aplicação Consultoria" que você usa com clientes, aplicado no seu próprio negócio.
        </p>
        <div style={styles.checklistGrid}>
          {CHECKLIST_GROUPS.map((group) => (
            <div key={group.category} style={styles.checklistPanel}>
              <h3 style={styles.checklistTitle}>{group.category}</h3>
              {group.items.map((item) => (
                <label key={item.key} style={styles.checklistRow}>
                  <input
                    type="checkbox"
                    checked={!!checklistDone[item.key]}
                    onChange={() => toggleChecklistItem(item.key)}
                  />
                  <span style={checklistDone[item.key] ? styles.checklistDoneText : undefined}>{item.label}</span>
                </label>
              ))}
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
  weekNav: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  weekNavButton: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.15)',
    color: '#0F2D24',
    padding: '8px 14px',
    borderRadius: 4,
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  weekLabel: { fontWeight: 700, color: '#0F2D24', fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' },
  panel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 },
  panelTitle: { fontSize: '0.95rem', margin: '0 0 14px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  metaRow: { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  input: {
    padding: '9px 12px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '0.88rem',
    minWidth: 220,
    boxSizing: 'border-box',
  },
  statusSelect: {
    padding: '9px 12px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 30,
    fontSize: '0.82rem',
    fontWeight: 700,
    minWidth: 160,
  },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#3C4A38' },
  streakNote: { fontSize: '0.85rem', color: '#8a6d2f', fontWeight: 700, margin: '10px 0 0' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 },
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
  countInput: {
    padding: '8px 10px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '1.1rem',
    fontWeight: 700,
    width: 90,
    boxSizing: 'border-box',
  },
  autoValue: { fontSize: '1.4rem', fontWeight: 700, color: '#0F2D24', fontVariantNumeric: 'tabular-nums' },
  statCaption: { fontSize: '0.72rem', color: '#3C4A38', opacity: 0.75 },
  textarea: {
    padding: '9px 12px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '0.85rem',
    fontFamily: 'Inter, sans-serif',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  formActions: { display: 'flex', gap: 10, marginTop: 12 },
  button: {
    background: '#C8A869',
    color: '#0F2D24',
    border: 'none',
    padding: '9px 20px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.85rem',
    height: 38,
  },
  tableTitle: { fontSize: '0.95rem', margin: '28px 0 10px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  tableWrap: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, overflow: 'auto' },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '140px 2fr 1.2fr 0.7fr 0.7fr 0.9fr 0.7fr',
    padding: '10px 20px',
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    gap: 10,
    minWidth: 800,
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '140px 2fr 1.2fr 0.7fr 0.7fr 0.9fr 0.7fr',
    padding: '10px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.84rem',
    alignItems: 'center',
    gap: 10,
    minWidth: 800,
  },
  metaCell: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusPill: { fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 30 },
  emptyStateInline: { padding: 20, color: '#3C4A38', margin: 0 },
  checklistGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  checklistPanel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 8, padding: '18px 22px' },
  checklistTitle: { fontSize: '0.85rem', margin: '0 0 12px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  checklistRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: '0.83rem',
    color: '#0F2D24',
    marginBottom: 10,
    cursor: 'pointer',
  },
  checklistDoneText: { textDecoration: 'line-through', opacity: 0.55 },
};
