import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Family Tree',
  description: 'Our family tree — generations of history',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-tan-50">
        <header className="bg-tan-800 text-tan-50 shadow-md">
          <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">🌳</span>
              <span className="text-xl font-bold tracking-wide group-hover:text-tan-200 transition-colors">
                Family Tree
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link
                href="/"
                className="hover:text-tan-200 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/submit"
                className="hover:text-tan-200 transition-colors"
              >
                Submit
              </Link>
              <Link
                href="/admin"
                className="bg-tan-600 hover:bg-tan-500 text-white px-3 py-1.5 rounded-md transition-colors"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-4 py-6">
          {children}
        </main>

        <footer className="mt-12 border-t border-tan-200 bg-tan-100 py-6 text-center text-sm text-tan-700">
          <p>Family Tree &mdash; preserving our history for future generations</p>
        </footer>
      </body>
    </html>
  );
}
