import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex items-center justify-center p-4">
      <div className="text-center py-12 max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
          <span className="font-mono text-xl font-bold">404</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Chakra_Petch']">
          Not Found
        </h1>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none bg-slate-900 border border-slate-800 text-xs text-white hover:border-cyan-400 hover:text-cyan-400 transition-colors font-mono uppercase tracking-wider"
          >
            <ArrowLeft size={14} />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
