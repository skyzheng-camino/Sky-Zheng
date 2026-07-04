import type { Metadata } from "next";
import { Caveat, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Loader from "./components/Loader";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollProgress from "./components/ScrollProgress";
import { SITE } from "./lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: "700",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} | ${SITE.role}`,
    template: `%s | ${SITE.name}`,
  },
  description: `Portfolio of ${SITE.name}, a ${SITE.role.toLowerCase()} building web apps, APIs, and data pipelines.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Pause entrance animations before first paint; Loader releases them.
            Skipped for reduced-motion users. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("is-loading","is-nav-loading")}}catch(e){}`,
          }}
        />
        <Loader />
        <ScrollProgress />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
