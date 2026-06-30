import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paylix — Multi-Chain EVM Processor",
  description: "Enterprise-grade multi-chain cryptocurrency payment processor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
