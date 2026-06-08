import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  description: "Universal web-based database visualization and management tool.",
  title: "Legacy"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
