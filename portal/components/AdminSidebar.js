'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';

const NAV_ITEMS = [
  { href: '/admin/tarefas', label: 'Minhas Tarefas', ready: true },
  { href: '/admin/clientes', label: 'Clientes', ready: true },
  { href: '/admin/documentos', label: 'Documentos', ready: true },
  { href: '/admin/plano-acao', label: 'Plano de Ação', ready: true },
  { href: '/admin/rentabilidade', label: 'Rentabilidade', ready: true },
  { href: '/admin/timesheet', label: 'Timesheet', ready: true },
  { href: '/admin/crm', label: 'CRM', ready: true },
  { href: '#', label: 'Visão Geral (em breve)', ready: false },
];

export default function AdminSidebar({ active }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <div style={styles.logoBadge}>RG</div>
        <div>
          <strong style={styles.logoTitle}>PAINEL DO NEGÓCIO</strong>
          <div style={styles.logoSub}>Rochelle Gonçalves</div>
        </div>
      </div>

      {NAV_ITEMS.map((item) =>
        item.ready ? (
          <Link
            key={item.label}
            href={item.href}
            style={active === item.href ? styles.navItemActive : styles.navItem}
          >
            {item.label}
          </Link>
        ) : (
          <div key={item.label} style={styles.navItemDisabled}>
            {item.label}
          </div>
        )
      )}

      <button style={styles.signOutButton} onClick={handleSignOut}>
        Sair
      </button>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 260,
    background: '#0F2D24',
    color: '#F7F5F0',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 24px',
    flexShrink: 0,
    minHeight: '100vh',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
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
  logoTitle: { fontSize: '0.75rem', letterSpacing: '0.05em' },
  logoSub: { color: '#C8A869', fontSize: '0.65rem', textTransform: 'uppercase' },
  navItem: {
    color: 'rgba(247,245,240,0.8)',
    padding: '12px 12px',
    borderRadius: 4,
    marginBottom: 4,
    fontSize: '0.87rem',
    display: 'block',
  },
  navItemActive: {
    background: 'rgba(200,168,105,0.15)',
    color: '#C8A869',
    fontWeight: 600,
    padding: '12px 12px',
    borderRadius: 4,
    marginBottom: 4,
    fontSize: '0.87rem',
    display: 'block',
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
};
