import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "Lupe Command Center",
  description: "AI Assistant Dashboard — Monitor, manage, and track Lupe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-zinc-950 text-zinc-100">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
