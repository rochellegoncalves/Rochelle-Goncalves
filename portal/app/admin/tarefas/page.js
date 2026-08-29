'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';

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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) {
    return <div style={styles.loading}>Carregando...</div>;
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <div style={styles.logoBadge}>RG</div>
          <div>
            <strong style={styles.sidebarTitle}>PAINEL DO NEGÓCIO</strong>
            <div style={styles.sidebarSub}>Rochelle Gonçalves</div>
          </div>
        </div>
        <div style={styles.navItemActive}>Minhas Tarefas</div>
        <div style={styles.navItemDisabled}>Visão Geral (em breve)</div>
        <div style={styles.navItemDisabled}>Rentabilidade (em breve)</div>
        <div style={styles.navItemDisabled}>Timesheet (em breve)</div>
        <button style={styles.signOutButton} onClick={handleSignOut}>
          Sair
        </button>
      </aside>

      <main style={styles.main}>
        <h1 style={styles.h1}>Minhas Tarefas</h1>
        <p style={styles.sub}>Puxado direto do seu projeto no Todoist.</p>

        {error && <p style={styles.error}>{error}</p>}

        {urgent.length > 0 && (
          <section style={styles.urgentPanel}>
            <h2 style={styles.urgentTitle}>Tarefas de hoje e atrasadas</h2>
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
          </section>
        )}

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
                <span
                  style={{
                    color: task.isOverdue ? '#d9584a' : task.isToday ? '#C8A869' : 'inherit',
                    fontWeight: task.isOverdue || task.isToday ? 700 : 400,
                  }}
                >
                  {task.due ? formatDate(task.due) : '—'}
                </span>
              </div>
            ))}
          </section>
        ))}
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
  sidebar: {
    width: 260,
    background: '#0F2D24',
    color: '#F7F5F0',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 24px',
    flexShrink: 0,
  },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(200,168,105,0.15)',
    border: '1px solid #C8A869',
    color: '#C8A869',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Playfair Display, serif',
    fontWeight: 600,
    fontSize: 14,
  },
  sidebarTitle: { fontSize: '0.75rem', letterSpacing: '0.05em' },
  sidebarSub: { color: '#C8A869', fontSize: '0.65rem', textTransform: 'uppercase' },
  navItemActive: {
    background: 'rgba(200,168,105,0.15)',
    color: '#C8A869',
    fontWeight: 600,
    padding: '12px 12px',
    borderRadius: 4,
    marginBottom: 4,
  },
  navItemDisabled: {
    color: 'rgba(247,245,240,0.35)',
    padding: '12px 12px',
    fontSize: '0.87rem',
  },
  signOutButton: {
    marginTop: 'auto',
    background: 'transparent',
    border: '1px solid rgba(247,245,240,0.3)',
    color: '#F7F5F0',
    padding: '10px 16px',
    borderRadius: 4,
    fontSize: '0.85rem',
  },
  main: { flex: 1, padding: '40px 48px', maxWidth: 1000 },
  h1: { fontSize: '1.8rem', margin: '0 0 8px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  sub: { color: '#3C4A38', marginBottom: 32 },
  error: { color: '#c8493a', marginBottom: 24 },
  urgentPanel: { background: '#0F2D24', borderRadius: 8, padding: '24px 26px', marginBottom: 36 },
  urgentTitle: { color: '#F7F5F0', fontSize: '1.05rem', marginBottom: 16, fontFamily: 'Playfair Display, serif' },
  urgentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(247,245,240,0.06)',
    borderRadius: 6,
    borderLeft: '4px solid',
    marginBottom: 8,
  },
  urgentTask: { color: '#F7F5F0', fontWeight: 600, fontSize: '0.9rem' },
  urgentMeta: { color: 'rgba(247,245,240,0.6)', fontSize: '0.76rem', marginTop: 2 },
  urgentFlag: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '4px 10px',
    borderRadius: 30,
  },
  stageBlock: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  stageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '14px 20px',
    background: '#E6DCC2',
  },
  stageName: { fontSize: '0.95rem', margin: 0, fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  stageCount: { fontSize: '0.78rem', color: '#3C4A38', fontWeight: 600 },
  emptyState: { padding: '16px 20px', color: '#3C4A38', fontSize: '0.85rem', margin: 0 },
  taskRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid rgba(15,45,36,0.06)',
    fontSize: '0.88rem',
  },
  taskName: { display: 'flex', alignItems: 'center', fontWeight: 600 },
  priorityDot: { width: 8, height: 8, borderRadius: '50%', marginRight: 10, flexShrink: 0 },
};
