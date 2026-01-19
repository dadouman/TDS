/**
 * Auth Layout
 * Layout for authentication pages
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TDS - Transport Distribution System",
  description: "Streamline your transport operations",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
