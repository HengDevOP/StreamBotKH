import '@/index.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ModalProvider } from '@/context/ModalContext';
import { AppShell } from '@/components/common/AppShell';

export const metadata: Metadata = {
  title: 'streambotkh.com - Livestream Donation Alerts & ABA Bakong KHQR',
  description:
    'The all-in-one donation gateway built for Cambodian streamers. Accept instant tips via ABA Mobile and Bakong KHQR with zero-latency OBS screen animations, TTS audio, and Telegram notifications.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2300F0FF'><path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@500;700;900&family=Press+Start+2P&family=Bebas+Neue&family=Kanit:wght@400;600;700&family=Montserrat:wght@400;600;800;900&family=Permanent+Marker&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="text-slate-100 antialiased font-['Inter',sans-serif] selection:bg-cyan-500 selection:text-black">
        <AuthProvider>
          <SocketProvider>
            <ModalProvider>
              <AppShell>{children}</AppShell>
            </ModalProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
