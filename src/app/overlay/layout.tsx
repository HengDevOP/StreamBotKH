import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stream Overlay',
  description: 'OBS Studio transparent overlay source',
};

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@500;700;900&family=Press+Start+2P&family=Bebas+Neue&family=Kanit:wght@400;600;700&family=Montserrat:wght@400;600;800;900&family=Permanent+Marker&family=VT323&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/fonts/khmer-fonts.css" />
      <style>{`
        html, body, #__next, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0">
        {children}
      </div>
    </>
  );
}
