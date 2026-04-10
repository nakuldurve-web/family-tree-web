import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Family Tree',
  description: 'Our family tree — generations of history',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-tan-50">
        <header className="bg-tan-900 text-white shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="text-2xl">🌳</span>
              <span className="text-lg font-semibold tracking-tight group-hover:text-accent-200 transition-colors">
                Family Tree
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link href="/" className="px-3 py-1.5 rounded-md text-tan-300 hover:text-white hover:bg-tan-800 transition-colors">
                Home
              </Link>
              <Link href="/submit" className="px-3 py-1.5 rounded-md text-tan-300 hover:text-white hover:bg-tan-800 transition-colors">
                Submit
              </Link>
              <Link href="/admin" className="ml-2 bg-accent-600 hover:bg-accent-500 text-white px-4 py-1.5 rounded-md transition-colors">
                Admin
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-4 py-6">
          {children}
        </main>

        <footer className="mt-12 border-t border-tan-200 py-6 text-center text-sm text-tan-400">
          Family Tree — preserving history for future generations
        </footer>
      </body>
    </html>
  );
}
