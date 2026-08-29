'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const userId = session.user.id;

      const { data: clientRow } = await supabase
        .from('clients')
        .select('company_name')
        .eq('id', userId)
        .single();

      setCompanyName(clientRow?.company_name || session.user.email);

      const { data: docs } = await supabase
        .from('documents')
        .select('id, name, category, created_at, file_path')
        .eq('client_id', userId)
        .order('created_at', { ascending: false });

      setDocuments(docs || []);
      setLoading(false);
    }

    load();
  }, [router]);

  async function handleDownload(filePath) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 60);

    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  }

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
      <header style={styles.header}>
        <div style={styles.logoWrap}>
          <div style={styles.logoBadge}>RG</div>
          <div>
            <strong style={styles.headerTitle}>ÁREA DO CLIENTE</strong>
            <div style={styles.headerSub}>Ritmo para a Gestão</div>
          </div>
        </div>
        <button style={styles.signOutButton} onClick={handleSignOut}>
          Sair
        </button>
      </header>

      <main style={styles.main}>
        <h1 style={styles.h1}>Olá, {companyName}</h1>
        <p style={styles.sub}>Seus documentos estão listados abaixo.</p>

        <section style={styles.docList}>
          {documents.length === 0 && (
            <p style={styles.emptyState}>Nenhum documento disponível ainda.</p>
          )}
          {documents.map((doc) => (
            <div key={doc.id} style={styles.docRow}>
              <div>
                <div style={styles.docName}>{doc.name}</div>
                <div style={styles.docMeta}>
                  {doc.category} ·{' '}
                  {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <button
                style={styles.downloadButton}
                onClick={() => handleDownload(doc.file_path)}
              >
                Baixar
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh' },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3C4A38',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 32px',
    background: '#0F2D24',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 12 },
  logoBadge: {
    width: 36,
    height: 36,
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
  headerTitle: { color: '#F7F5F0', fontSize: '0.78rem', letterSpacing: '0.04em' },
  headerSub: { color: '#C8A869', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
  signOutButton: {
    background: 'transparent',
    border: '1px solid rgba(247,245,240,0.4)',
    color: '#F7F5F0',
    padding: '8px 18px',
    borderRadius: 4,
    fontSize: '0.85rem',
  },
  main: { maxWidth: 900, margin: '0 auto', padding: '40px 32px' },
  h1: { fontSize: '1.8rem', marginBottom: 8 },
  sub: { color: '#3C4A38', marginBottom: 32 },
  docList: {
    background: '#fff',
    border: '1px solid rgba(15,45,36,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  emptyState: { padding: 24, color: '#3C4A38', textAlign: 'center' },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 22px',
    borderBottom: '1px solid rgba(15,45,36,0.06)',
  },
  docName: { fontWeight: 600, fontSize: '0.92rem' },
  docMeta: { fontSize: '0.78rem', color: '#3C4A38' },
  downloadButton: {
    background: '#0F2D24',
    color: '#F7F5F0',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 4,
    fontSize: '0.8rem',
    fontWeight: 600,
  },
};
