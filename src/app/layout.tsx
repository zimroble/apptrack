import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppTrack",
  description: "Track your internship applications from wishlist to offer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
