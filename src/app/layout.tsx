import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { CommandPalette } from "@/components/command-palette";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skill Forge",
  description: "Engineering-grade skill and tool creation for AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <Navbar />
        <main className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
          {children}
        </main>
        <CommandPalette />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1A1A1A",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#EDEDED",
            },
          }}
        />
      </body>
    </html>
  );
}
