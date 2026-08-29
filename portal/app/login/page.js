'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (sendError) {
      setError('Não encontramos um cadastro com esse e-mail. Confira e tente novamente.');
      return;
    }
    setStep('code');
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    setLoading(false);
    if (verifyError) {
      setError('Código inválido ou expirado. Tente novamente.');
      return;
    }
    router.replace('/dashboard');
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoBadge}>RG</div>
        <h1 style={styles.h1}>Área do Cliente</h1>
        <p style={styles.sub}>Ritmo para a Gestão</p>

        {step === 'email' && (
          <form onSubmit={handleSendCode}>
            <label style={styles.label}>Seu e-mail</label>
            <input
              style={styles.input}
              type="email"
              required
              placeholder="voce@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar código de acesso'}
            </button>
            <p style={styles.note}>
              Você vai receber um código de 6 dígitos por e-mail para entrar — sem necessidade de senha.
            </p>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode}>
            <label style={styles.label}>Código recebido em {email}</label>
            <input
              style={styles.input}
              type="text"
              inputMode="numeric"
              required
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
            <p style={styles.note}>
              <button
                type="button"
                onClick={() => setStep('email')}
                style={styles.linkButton}
              >
                Usar outro e-mail
              </button>
            </p>
          </form>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(160deg, #0F2D24 0%, #14382c 100%)',
  },
  card: {
    background: '#F7F5F0',
    width: 400,
    maxWidth: '90vw',
    borderRadius: 8,
    padding: '48px 40px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
    borderTop: '4px solid #C8A869',
    textAlign: 'center',
  },
  logoBadge: {
    width: 56,
    height: 56,
    background: '#0F2D24',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontFamily: 'Playfair Display, serif',
    color: '#C8A869',
    fontSize: 22,
    fontWeight: 600,
  },
  h1: { fontSize: '1.5rem', marginBottom: 8 },
  sub: { color: '#3C4A38', fontSize: '0.92rem', marginBottom: 32 },
  label: {
    display: 'block',
    textAlign: 'left',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#0F2D24',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid rgba(15,45,36,0.2)',
    borderRadius: 4,
    fontSize: '1rem',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    padding: 15,
    background: '#C8A869',
    color: '#0F2D24',
    border: 'none',
    borderRadius: 4,
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  note: { marginTop: 20, fontSize: '0.8rem', color: '#3C4A38' },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#0F2D24',
    textDecoration: 'underline',
    fontSize: '0.8rem',
    padding: 0,
  },
  error: { marginTop: 16, color: '#c8493a', fontSize: '0.85rem' },
};
