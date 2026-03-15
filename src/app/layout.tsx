import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import Header from "@/components/Header";
import { WalletProvider } from "@/lib/starkzap";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

export const metadata: Metadata = {
  title: "Dare Board",
  description: "Public dares with escrowed rewards on Starknet."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="font-sans text-white">
        <WalletProvider>
          <div className="min-h-screen">
            <Header />
            {children}
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
