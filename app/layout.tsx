import type { Metadata } from "next";
import { Geist, Geist_Mono, Qwitcher_Grypen } from "next/font/google";
import "./globals.css";
import Loader from "./components/Loader";
import Navbar from "./components/Navbar";
import PageTransition from "./components/PageTransition";
import Footer from "./components/Footer";
import ScrollProgress from "./components/ScrollProgress";
import StarCursor from "./components/StarCursor";
import { SITE } from "./lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const qwitcherGrypen = Qwitcher_Grypen({
  variable: "--font-qwitcher-grypen",
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
      className={`${geistSans.variable} ${geistMono.variable} ${qwitcherGrypen.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Pause entrance animations before first paint; Loader releases them.
            Skipped for reduced-motion users.
            Also: on reloads, Chrome's automatic scroll restoration lands
            ~20% of the viewport too low on this page (and compounds per
            reload), so we restore the saved position manually instead. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("is-loading","is-nav-loading")}}catch(e){};try{var n=performance.getEntriesByType("navigation")[0];if(n&&(n.type==="reload"||n.type==="back_forward")){history.scrollRestoration="manual";var y=+sessionStorage.getItem("sz-scroll:"+location.pathname)||0;addEventListener("load",function(){requestAnimationFrame(function(){scrollTo(0,y);requestAnimationFrame(function(){history.scrollRestoration="auto"})})})}addEventListener("pagehide",function(){try{sessionStorage.setItem("sz-scroll:"+location.pathname,String(scrollY))}catch(e){}})}catch(e){}`,
          }}
        />
        <Loader />
        <PageTransition />
        <ScrollProgress />
        <StarCursor />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
