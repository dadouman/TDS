/**
 * Freighter Layout
 * Layout for freighter dashboard pages
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - TDS",
  description: "Manage your transport plans",
};

export default function FreighterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
