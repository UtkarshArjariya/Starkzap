import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Providers from "@/app/providers";
import "@/app/globals.css";

const sansFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Dare Board — On-Chain Social Challenges",
    template: "%s | Dare Board",
  },
  description:
    "Post public dares, lock Starknet rewards, and let the community decide the outcome.",
  metadataBase: new URL("https://dareboard.vercel.app"),
  openGraph: {
    title: "Dare Board — On-Chain Social Challenges",
    description: "Post public dares, lock Starknet rewards, and let the community decide the outcome.",
    siteName: "Dare Board",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dare Board — On-Chain Social Challenges",
    description: "Post public dares, lock Starknet rewards, and let the community decide the outcome.",
  },
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.classList.add(stored);
    } else {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    }
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${sansFont.variable} ${monoFont.variable}`} lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
