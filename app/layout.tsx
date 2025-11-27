import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EGPAYDCX Exchange",
  description: "EGPAYDCX - Hybrid Crypto Exchange by EGPAY Tech Pvt Ltd",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <div className="min-h-screen bg-black text-white">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}