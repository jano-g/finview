import './globals.css';
import Link from 'next/link';

export const metadata = { title: 'FinView', description: 'Personal finance intelligence' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="brand">
            <span className="logo">◧</span> FinView
          </div>
          <nav>
            <Link href="/">Dashboard</Link>
            <Link href="/review">Review</Link>
            <Link href="/compare">Compare</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
