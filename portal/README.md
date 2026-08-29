# Área do Cliente — Rochelle Gonçalves

Primeira etapa da plataforma: login por código de e-mail + documentos por cliente.

## Como funciona

- **Login**: cliente digita o e-mail, recebe um código de 6 dígitos, digita o código e entra. Sem senha.
- **Documentos**: cada cliente só vê os próprios arquivos (protegido por Row Level Security no banco).

## Antes de rodar

1. Crie um projeto gratuito em [supabase.com](https://supabase.com)
2. No projeto, vá em **SQL Editor** e rode o conteúdo de `supabase/schema.sql`
3. Em **Settings → API**, copie a **Project URL** e a **anon public key**
4. Copie `.env.example` para `.env.local` e cole os dois valores
5. Em **Authentication → Providers → Email**, confirme que "Enable email OTP" está ativado (é o padrão)

## Rodando localmente

```
npm install
npm run dev
```

## Adicionando um cliente (por enquanto, manual — vem um painel depois)

Veja o passo a passo comentado no final de `supabase/schema.sql`.

## Deploy

Publicado via Vercel, com Root Directory apontando para esta pasta (`portal`).
