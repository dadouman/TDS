/**
 * Root Layout
 * Top-level layout for the entire application
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TDS - Transport Distribution System',
  description: 'Streamline your transport operations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
