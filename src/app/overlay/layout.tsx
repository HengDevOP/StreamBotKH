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
