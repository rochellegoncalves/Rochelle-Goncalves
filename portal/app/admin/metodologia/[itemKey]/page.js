'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '../../../../lib/supabaseClient';
import AdminSidebar from '../../../../components/AdminSidebar';
import { findChecklistItem } from '../../../../lib/methodologyChecklist';

export default function MetodologiaItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemKey = params.itemKey;
  const item = findChecklistItem(itemKey);

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const res = await fetch('/api/admin/checklist-metodologia');
      if (res.ok) {
        const data = await res.json();
        setContent(data.content?.[itemKey] || '');
        setDone(!!data.done?.[itemKey]);
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, itemKey]);

  async function saveContent(newContent) {
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/checklist-metodologia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemKey, content: newContent }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`Erro ao salvar (${res.status}): ${JSON.stringify(body)}`);
    }
  }

  async function toggleDone() {
    const next = !done;
    setDone(next);
    await fetch('/api/admin/checklist-metodologia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemKey, done: next }),
    });
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  if (!item) {
    return (
      <div style={styles.page}>
        <AdminSidebar active="/admin/visao-geral" />
        <main style={styles.main}>
          <p style={styles.error}>Item não encontrado.</p>
          <button style={styles.button} onClick={() => router.push('/admin/visao-geral')}>
            Voltar
          </button>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <AdminSidebar active="/admin/visao-geral" />

      <main style={styles.main}>
        <button style={styles.backLink} onClick={() => router.push('/admin/visao-geral')}>
          ← Voltar pra Visão Geral
        </button>

        <p style={styles.eyebrow}>{item.category}</p>
        <h1 style={styles.h1}>{item.label}</h1>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.headerRow}>
          <label style={styles.doneLabel}>
            <input type="checkbox" checked={done} onChange={toggleDone} />
            Considero esse ponto resolvido no meu negócio
          </label>
          {item.linkedFeature && (
            <button style={styles.linkButton} onClick={() => router.push(item.linkedFeature.href)}>
              {item.linkedFeature.label} →
            </button>
          )}
        </div>

        <div style={styles.panel}>
          <label style={styles.label}>Conteúdo</label>
          <textarea
            style={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => saveContent(content)}
            rows={18}
            placeholder="Escreva aqui o conteúdo real desse ponto pro seu próprio negócio..."
          />
          <p style={styles.saveNote}>{saving ? 'Salvando...' : 'Salva automaticamente ao sair do campo.'}</p>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif', background: '#F7F5F0' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3C4A38' },
  main: { flex: 1, padding: '36px 48px', maxWidth: 1000 },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#3C4A38',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 20,
  },
  eyebrow: { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#8a6d2f', margin: '0 0 6px' },
  h1: { fontSize: '1.5rem', margin: '0 0 20px', fontFamily: 'Playfair Display, serif', color: '#0F2D24' },
  error: { color: '#c8493a', marginBottom: 18, fontSize: '0.9rem' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  doneLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', color: '#3C4A38', fontWeight: 600 },
  linkButton: {
    background: 'rgba(200,168,105,0.15)',
    border: '1px solid rgba(200,168,105,0.4)',
    color: '#0F2D24',
    padding: '9px 16px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  panel: { background: '#fff', border: '1px solid rgba(15,45,36,0.08)', borderRadius: 8, padding: '20px 24px' },
  label: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#3C4A38', display: 'block', marginBottom: 8 },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    border: '1px solid rgba(15,45,36,0.15)',
    borderRadius: 4,
    fontSize: '0.9rem',
    fontFamily: 'Inter, sans-serif',
    lineHeight: 1.6,
    resize: 'vertical',
  },
  saveNote: { fontSize: '0.75rem', color: '#3C4A38', opacity: 0.7, margin: '8px 0 0' },
  button: {
    background: '#C8A869',
    color: '#0F2D24',
    border: 'none',
    padding: '9px 18px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
};
