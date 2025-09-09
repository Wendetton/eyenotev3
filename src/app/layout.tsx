// src/app/layout.tsx
import './globals.css';
import './fullbleed.css'; // 👈 novo CSS para ocupar a tela toda
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EyeNote',
  description: 'Atendimento colaborativo em tempo real',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      {/* 
        bg-white para remover as faixas escuras,
        min-h-screen e w-screen para ocupar toda a tela
      */}
      <body className="min-h-screen w-screen bg-white antialiased text-gray-900">
        {/* 
          Wrapper com "full-bleed" para forçar 100% da largura em todas as páginas,
          respeitando as "safe areas" do iOS/iPad.
        */}
        <div
          className="full-bleed min-h-screen w-screen overflow-x-hidden"
          style={{
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* 
            main com padding horizontal sutil para não colar nas bordas.
            Se quiser mais “respiro”, aumente para px-6/px-8.
          */}
          <main
            aria-label="eyenote-root"
            className="w-full min-h-screen px-4 sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
