import './globals.css';

export const metadata = {
  title: 'Área do Cliente | Rochelle Gonçalves',
  description: 'Ritmo para a Gestão — área exclusiva de clientes',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
