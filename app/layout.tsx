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

          {/* Existing Footer */}
          <Footer />

          {/* Cashfree Compliance Links (Public Policy Pages) */}
          <div className="bg-black text-white border-t border-gray-800">
            <div className="max-w-6xl mx-auto px-4 py-4 text-center text-sm">
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="/contact"
                  className="text-gray-300 hover:text-white underline"
                >
                  Contact
                </a>
                <span className="text-gray-600">|</span>
                <a
                  href="/terms-and-conditions"
                  className="text-gray-300 hover:text-white underline"
                >
                  Terms & Conditions
                </a>
                <span className="text-gray-600">|</span>
                <a
                  href="/refund-policy"
                  className="text-gray-300 hover:text-white underline"
                >
                  Refund Policy
                </a>
              </div>

              <div className="mt-2 text-gray-400">
                Support:{" "}
                <a
                  href="mailto:egpay.xyz@gmail.com"
                  className="underline text-gray-300 hover:text-white"
                >
                  egpay.xyz@gmail.com
                </a>{" "}
                • Bhagalpur, Bihar, India
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}