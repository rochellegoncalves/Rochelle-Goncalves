'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';
import { CHECKLIST_GROUPS } from '../../../lib/methodologyChecklist';

const FUNNEL_ORDER = ['Lead Frio', 'Lead Morno', 'Proposta enviada', 'Cliente', 'Fora do Perfil'];
const FUNNEL_STYLE = {
  'Fora do Perfil': { background: 'rgba(200,73,58,0.15)', color: '#a23929' },
  'Lead Frio': { background: 'rgba(15,45,36,0.06)', color: '#3C4A38' },
  'Lead Morno': { background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' },
  'Proposta enviada': { background: 'rgba(139,165,143,0.2)', color: '#4c6350' },
  Cliente: { background: 'rgba(58,140,82,0.18)', color: '#2f6b41' },
};

const OBJETIVO_STATUS_OPTIONS = ['Concluído', 'Parcial', 'Não concluído'];
const OBJETIVO_STATUS_STYLE = {
  Concluído: { background: 'rgba(58,140,82,0.18)', color: '#2f6b41' },
  Parcial: { background: 'rgba(200,168,105,0.2)', color: '#8a6d2f' },
  'Não concluído': { background: 'rgba(200,73,58,0.15)', color: '#a23929' },
};

const ACTIVITY_TIPOS = ['Contato', 'Reunião'];

function formatMoney(value) {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
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

const EMPTY_CHECKIN_FORM = {
  objetivoSemana: '',
  objetivoStatus: '',
  estudoCount: '',
  posicionamentoCount: '',
  producaoCount: '',
  revisaoFeita: false,
  notas: '',
};

const EMPTY_ACTIVITY_FORM = { contactNome: '', tipo: 'Contato', data: toDateStr(new Date()) };

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
  const [error, setError] = useState('');
  const [data, setData] = useState({
    clientesAtivos: null,
    recebidoMes: null,
    emAbertoMes: null,
    funnelCounts: null,
    processosStats: null,
    horasSemana: null,
    timesheetError: null,
    tarefasUrgentes: null,
  });

  // Indicadores (check-in semanal)
  const [checkins, setCheckins] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(mondayOfToday());
  const [checkinForm, setCheckinForm] = useState(EMPTY_CHECKIN_FORM);
  const [savingCheckin, setSavingCheckin] = useState(false);

  // Atividades do CRM (contato/reunião)
  const [activities, setActivities] = useState([]);
  const [crmContactNames, setCrmContactNames] = useState([]);
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY_FORM);
  const [loggingActivity, setLoggingActivity] = useState(false);

  // Autoauditoria
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
      await Promise.all([loadOverview(), loadCheckins(), loadActivities(), loadChecklist(), loadCrmNames()]);
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

  async function loadOverview() {
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
        const weekStart = new Date();
        const dow = (weekStart.getDay() + 6) % 7;
        weekStart.setDate(weekStart.getDate() - dow);
        weekStart.setHours(0, 0, 0, 0);
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

  async function loadCheckins() {
    const data = await safeJson(fetch('/api/admin/indicadores'));
    setCheckins(data?.checkins || []);
  }

  async function loadActivities() {
    const data = await safeJson(fetch('/api/admin/crm/activities'));
    setActivities(data?.activities || []);
  }

  async function loadCrmNames() {
    const data = await safeJson(fetch('/api/admin/crm'));
    setCrmContactNames((data?.contacts || []).map((c) => c.nome));
  }

  async function loadChecklist() {
    const data = await safeJson(fetch('/api/admin/checklist-metodologia'));
    setChecklistDone(data?.done || {});
  }

  useEffect(() => {
    const existing = checkins.find((c) => c.week_start === selectedWeek);
    if (existing) {
      setCheckinForm({
        objetivoSemana: existing.objetivo_semana || '',
        objetivoStatus: existing.objetivo_status || '',
        estudoCount: existing.estudo_count ?? '',
        posicionamentoCount: existing.posicionamento_count ?? '',
        producaoCount: existing.producao_count ?? '',
        revisaoFeita: !!existing.revisao_feita,
        notas: existing.notas || '',
      });
    } else {
      setCheckinForm(EMPTY_CHECKIN_FORM);
    }
  }, [selectedWeek, checkins]);

  async function handleSaveCheckin(e) {
    e.preventDefault();
    setSavingCheckin(true);
    setError('');
    const res = await fetch('/api/admin/indicadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: selectedWeek, ...checkinForm }),
    });
    setSavingCheckin(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao salvar (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    await loadCheckins();
  }

  async function handleLogActivity(e) {
    e.preventDefault();
    if (!activityForm.contactNome) return;
    setLoggingActivity(true);
    setError('');
    const res = await fetch('/api/admin/crm/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityForm),
    });
    setLoggingActivity(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao registrar atividade (${res.status}): ${JSON.stringify(body)}`);
      return;
    }
    setActivityForm({ ...EMPTY_ACTIVITY_FORM, tipo: activityForm.tipo });
    await loadActivities();
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

  // Métricas de atividade calculadas a partir do registro (não da
  // coluna "Data Contato" da planilha, que é sobrescrita).
  const todayStr = toDateStr(new Date());
  const weekStartStr = mondayOfToday();
  const contatosHoje = activities.filter((a) => a.tipo === 'Contato' && a.data === todayStr).length;
  const contatosSemana = activities.filter((a) => a.tipo === 'Contato' && a.data >= weekStartStr).length;
  const reunioesSemana = activities.filter((a) => a.tipo === 'Reunião' && a.data >= weekStartStr).length;

  const byContact = {};
  for (const a of activities) {
    if (!byContact[a.contact_nome]) byContact[a.contact_nome] = [];
    byContact[a.contact_nome].push(a);
  }
  const tempos = [];
  for (const nome of Object.keys(byContact)) {
    const events = byContact[nome];
    const tornouCliente = events.find((e) => e.tipo === 'Tornou-se Cliente');
    if (!tornouCliente) continue;
    const primeiraData = events.reduce((min, e) => (e.data < min ? e.data : min), events[0].data);
    const dias = (new Date(tornouCliente.data) - new Date(primeiraData)) / (1000 * 60 * 60 * 24);
    if (dias >= 0) tempos.push(dias);
  }
  const tempoMedioCliente = tempos.length > 0 ? tempos.reduce((s, d) => s + d, 0) / tempos.length : null;

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/visao-geral" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Visão Geral</h1>
        <p style={styles.sub}>Resumo, indicadores e autoauditoria -- tudo numa página só.</p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.statsRow}>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Clientes ativos</span>
            <span style={styles.statValue}>{data.clientesAtivos ?? '—'}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Recebido este mês</span>
            <span style={styles.statValue}>{data.recebidoMes != null ? formatMoney(data.recebidoMes) : '—'}</span>
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

        <h2 style={styles.sectionTitle}>Atividade de relacionamento</h2>
        <p style={styles.sub}>
          Registro de verdade (não a coluna "Data Contato" da planilha, que se perde a cada atualização).
        </p>
        <div style={styles.statsRow}>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Contatos hoje</span>
            <span style={styles.statValue}>{contatosHoje}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Contatos essa semana</span>
            <span style={styles.statValue}>{contatosSemana}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Reuniões essa semana</span>
            <span style={styles.statValue}>{reunioesSemana}</span>
          </div>
          <div style={styles.statTile}>
            <span style={styles.statLabel}>Tempo médio até virar cliente</span>
            <span style={styles.statValue}>{tempoMedioCliente != null ? `${Math.round(tempoMedioCliente)}d` : '—'}</span>
          </div>
        </div>

        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Registrar atividade</h3>
          <form onSubmit={handleLogActivity} style={styles.activityForm}>
            <div style={styles.field}>
              <label style={styles.label}>Contato</label>
              <input
                style={styles.input}
                required
                list="crm-contact-names"
                value={activityForm.contactNome}
                onChange={(e) => setActivityForm({ ...activityForm, contactNome: e.target.value })}
                placeholder="Nome do contato"
              />
              <datalist id="crm-contact-names">
                {crmContactNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Tipo</label>
              <select
                style={styles.input}
                value={activityForm.tipo}
                onChange={(e) => setActivityForm({ ...activityForm, tipo: e.target.value })}
              >
                {ACTIVITY_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Data</label>
              <input
                style={styles.input}
                type="date"
                value={activityForm.data}
                onChange={(e) => setActivityForm({ ...activityForm, data: e.target.value })}
              />
            </div>
            <div style={styles.formActions}>
              <button style={styles.button} type="submit" disabled={loggingActivity}>
                {loggingActivity ? 'Registrando...' : '+ Registrar'}
              </button>
            </div>
          </form>
        </div>

        <h2 style={styles.sectionTitle}>Indicadores da semana</h2>

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

        <form onSubmit={handleSaveCheckin}>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Meta da semana</h3>
            <div style={styles.metaRow}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={checkinForm.objetivoSemana}
                onChange={(e) => setCheckinForm({ ...checkinForm, objetivoSemana: e.target.value })}
                placeholder="Qual é o único objetivo que essa semana precisa entregar?"
              />
              <select
                style={{ ...styles.statusSelect, ...(OBJETIVO_STATUS_STYLE[checkinForm.objetivoStatus] || {}) }}
                value={checkinForm.objetivoStatus}
                onChange={(e) => setCheckinForm({ ...checkinForm, objetivoStatus: e.target.value })}
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
                checked={checkinForm.revisaoFeita}
                onChange={(e) => setCheckinForm({ ...checkinForm, revisaoFeita: e.target.checked })}
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
                value={checkinForm.estudoCount}
                onChange={(e) => setCheckinForm({ ...checkinForm, estudoCount: e.target.value })}
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
                value={checkinForm.posicionamentoCount}
                onChange={(e) => setCheckinForm({ ...checkinForm, posicionamentoCount: e.target.value })}
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
                value={checkinForm.producaoCount}
                onChange={(e) => setCheckinForm({ ...checkinForm, producaoCount: e.target.value })}
                placeholder="0"
              />
              <span style={styles.statCaption}>entregas/reuniões concluídas na semana</span>
            </div>
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Notas da semana</h3>
            <textarea
              style={styles.textarea}
              value={checkinForm.notas}
              onChange={(e) => setCheckinForm({ ...checkinForm, notas: e.target.value })}
              rows={3}
              placeholder="Opcional"
            />
            <div style={styles.formActions}>
              <button style={styles.button} type="submit" disabled={savingCheckin}>
                {savingCheckin ? 'Salvando...' : 'Salvar semana'}
              </button>
            </div>
          </div>
        </form>

        <h3 style={styles.tableTitle}>Histórico</h3>
        <div style={styles.tableWrap}>
          <div style={styles.tableHeadRow}>
            <span>Semana</span>
            <span>Meta</span>
            <span>Status</span>
            <span>Estudo</span>
            <span>Posic.</span>
            <span>Produção</span>
          </div>
          {sortedCheckins.length === 0 && <p style={styles.emptyStateInline}>Nenhum check-in registrado ainda.</p>}
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
            </div>
          ))}
        </div>

        <h2 style={styles.sectionTitle}>
          Autoauditoria da metodologia ({doneChecklistItems}/{totalChecklistItems})
        </h2>
        <p style={styles.sub}>
          Clique num item pra escrever o conteúdo de verdade daquele ponto no seu negócio (ou ver a tela que já
          cobre ele).
        </p>
        <div style={styles.checklistGrid}>
          {CHECKLIST_GROUPS.map((group) => (
            <div key={group.category} style={styles.checklistPanel}>
              <h3 style={styles.checklistTitle}>{group.category}</h3>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  style={styles.checklistRow}
                  onClick={() => router.push(`/admin/metodologia/${item.key}`)}
                >
                  <span style={checklistDone[item.key] ? styles.checklistDoneMark : styles.checklistPendingMark}>
                    {checklistDone[item.key] ? '✓' : '○'}
                  </span>
                  <span style={checklistDone[item.key] ? styles.checklistDoneText : undefined}>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <h2 style={styles.sectionTitle}>Acesso rápido</h2>
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
  error: { color: '#c8493a', marginBottom: 18, fontSize: '0.9rem' },
  sectionTitle: {
    fontSize: '1.1rem',
    margin: '36px 0 4px',
    fontFamily: 'Playfair Display, serif',
    color: '#0F2D24',
    paddingTop: 24,
    borderTop: '1px solid rgba(15,45,36,0.1)',
  },
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
  statCaption: { fontSize: '0.72rem', color: '#3C4A38', opacity: 0.75 },
  countInput: {
    padding: '8px 10px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '1.1rem',
    fontWeight: 700,
    width: 90,
    boxSizing: 'border-box',
  },
  panelsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 },
  panel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 8, padding: '18px 22px', marginBottom: 16 },
  panelTitle: { fontSize: '0.92rem', margin: '0 0 14px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  panelEmpty: { fontSize: '0.85rem', color: '#3C4A38', margin: 0 },
  funnelList: { display: 'flex', flexDirection: 'column', gap: 10 },
  funnelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  funnelBadge: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 30 },
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
  activityForm: { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end' },
  field: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 160 },
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
    padding: '9px 20px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.85rem',
    height: 38,
    cursor: 'pointer',
  },
  weekNav: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' },
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
  metaRow: { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
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
  tableTitle: { fontSize: '0.95rem', margin: '20px 0 10px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  tableWrap: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 6, overflow: 'auto', marginBottom: 20 },
  tableHeadRow: {
    display: 'grid',
    gridTemplateColumns: '140px 2fr 1.2fr 0.7fr 0.7fr 0.9fr',
    padding: '10px 20px',
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    color: '#3C4A38',
    fontWeight: 700,
    background: '#E6DCC2',
    gap: 10,
    minWidth: 700,
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '140px 2fr 1.2fr 0.7fr 0.7fr 0.9fr',
    padding: '10px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.84rem',
    alignItems: 'center',
    gap: 10,
    minWidth: 700,
  },
  metaCell: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusPill: { fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 30 },
  emptyStateInline: { padding: 20, color: '#3C4A38', margin: 0 },
  checklistGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 },
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
    background: 'none',
    border: 'none',
    padding: 0,
    textAlign: 'left',
    width: '100%',
  },
  checklistDoneMark: { color: '#2f6b41', fontWeight: 700, flexShrink: 0 },
  checklistPendingMark: { color: 'rgba(15,45,36,0.3)', flexShrink: 0 },
  checklistDoneText: { textDecoration: 'line-through', opacity: 0.55 },
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
