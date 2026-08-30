'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';
import AdminSidebar from '../../../components/AdminSidebar';

const PRIORITY_COLOR = { 4: '#d9584a', 3: '#C8A869', 2: '#8ba58f', 1: '#8ba58f' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function TarefasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [urgent, setUrgent] = useState([]);
  const [savingTaskId, setSavingTaskId] = useState(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const res = await fetch('/api/todoist');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(`Erro (${res.status}): ${JSON.stringify(body)}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setGroups(data.groups || []);
      setUrgent(data.urgent || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleDateChange(taskId, newDate) {
    const previousGroups = groups;
    setGroups((gs) =>
      gs.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, due: newDate || null } : t)),
      }))
    );
    setSavingTaskId(taskId);
    setError('');

    const res = await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, dueDate: newDate || null }),
    });
    setSavingTaskId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao salvar data no Todoist (${res.status}): ${JSON.stringify(body)}`);
      setGroups(previousGroups);
    }
  }

  if (loading) {
    return <div style={styles.loading}>Carregando...</div>;
  }

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/tarefas" />

      <main style={styles.main}>
        <h1 style={styles.h1}>Minhas Tarefas</h1>
        <p style={styles.sub}>
          Puxado direto do seu projeto no Todoist. Mudar a data aqui já atualiza lá também.
        </p>

        {error && <p style={styles.error}>{error}</p>}

        {urgent.length > 0 && (
          <section style={styles.urgentPanel}>
            <h2 style={styles.urgentTitle}>Tarefas de hoje e atrasadas</h2>
            <div style={styles.urgentGrid}>
              {urgent.map((t) => (
                <div
                  key={t.id}
                  style={{
                    ...styles.urgentRow,
                    borderLeftColor: t.isOverdue ? '#d9584a' : '#C8A869',
                  }}
                >
                  <div>
                    <div style={styles.urgentTask}>{t.content}</div>
                    <div style={styles.urgentMeta}>
                      {t.groupName} · Prazo: {t.isOverdue ? formatDate(t.due) : 'hoje'}
                    </div>
                  </div>
                  <span
                    style={{
                      ...styles.urgentFlag,
                      color: t.isOverdue ? '#e8776a' : '#C8A869',
                      background: t.isOverdue ? 'rgba(217,88,74,0.18)' : 'rgba(200,168,105,0.2)',
                    }}
                  >
                    {t.isOverdue ? 'Atrasada' : 'Vence hoje'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={styles.groupsGrid}>
          {groups.map((group) => (
            <section key={group.id} style={styles.stageBlock}>
              <div style={styles.stageHeader}>
                <h3 style={styles.stageName}>{group.name}</h3>
                <span style={styles.stageCount}>{group.tasks.length} tarefa(s)</span>
              </div>
              {group.tasks.length === 0 && (
                <p style={styles.emptyState}>Nenhuma tarefa nesta área.</p>
              )}
              {group.tasks.map((task) => (
                <div key={task.id} style={styles.taskRow}>
                  <span style={styles.taskName}>
                    <span
                      style={{
                        ...styles.priorityDot,
                        background: PRIORITY_COLOR[task.priority] || '#8ba58f',
                      }}
                    />
                    {task.content}
                  </span>
                  <input
                    type="date"
                    style={{
                      ...styles.dateInput,
                      color: task.isOverdue ? '#d9584a' : task.isToday ? '#C8A869' : '#3C4A38',
                      fontWeight: task.isOverdue || task.isToday ? 700 : 400,
                      opacity: savingTaskId === task.id ? 0.5 : 1,
                    }}
                    value={task.due || ''}
                    disabled={savingTaskId === task.id}
                    onChange={(e) => handleDateChange(task.id, e.target.value)}
                  />
                </div>
              ))}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex' },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3C4A38',
  },
  main: { flex: 1, padding: '36px 48px', maxWidth: 1440 },
  h1: { fontSize: '1.6rem', margin: '0 0 6px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  sub: { color: '#3C4A38', marginBottom: 24, fontSize: '0.9rem' },
  error: { color: '#c8493a', marginBottom: 18, fontSize: '0.9rem' },
  urgentPanel: { background: '#0F2D24', borderRadius: 8, padding: '20px 22px', marginBottom: 28 },
  urgentTitle: { color: '#F7F5F0', fontSize: '0.95rem', marginBottom: 14, fontFamily: 'Playfair Display, serif' },
  urgentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 8,
  },
  urgentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'rgba(247,245,240,0.06)',
    borderRadius: 6,
    borderLeft: '4px solid',
    gap: 10,
  },
  urgentTask: { color: '#F7F5F0', fontWeight: 600, fontSize: '0.84rem' },
  urgentMeta: { color: 'rgba(247,245,240,0.6)', fontSize: '0.72rem', marginTop: 2 },
  urgentFlag: {
    fontSize: '0.66rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '4px 10px',
    borderRadius: 30,
    whiteSpace: 'nowrap',
  },
  groupsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: 20,
    alignItems: 'start',
  },
  stageBlock: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  stageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '11px 18px',
    background: '#E6DCC2',
  },
  stageName: { fontSize: '0.86rem', margin: 0, fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  stageCount: { fontSize: '0.72rem', color: '#3C4A38', fontWeight: 600 },
  emptyState: { padding: '14px 18px', color: '#3C4A38', fontSize: '0.8rem', margin: 0 },
  taskRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '9px 18px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.82rem',
    gap: 10,
  },
  taskName: { display: 'flex', alignItems: 'center', fontWeight: 600, minWidth: 0 },
  priorityDot: { width: 7, height: 7, borderRadius: '50%', marginRight: 9, flexShrink: 0 },
  dateInput: {
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    padding: '4px 6px',
    fontSize: '0.78rem',
    fontFamily: 'Inter, sans-serif',
    background: '#fff',
    flexShrink: 0,
  },
};
