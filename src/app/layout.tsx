import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyMenu — Plánovač jídel",
  description: "Týdenní plánování jídel pro rodinu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className={`${geistSans.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-gray-900">
              🍽️ MyMenu
            </Link>
            <Link
              href="/jidla"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Jídla
            </Link>
            <Link
              href="/plan"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Týdenní plán
            </Link>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
