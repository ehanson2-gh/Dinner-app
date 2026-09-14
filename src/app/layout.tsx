import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import "./globals.css";
import styles from "./frame.module.css";

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  weight: "400",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dinner Tracker",
  description: "Eric & Sarah's shared dinner log, recipe box, and weekly menu.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5ead8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${caprasimo.variable} ${figtree.variable}`}>
      <body>
        <div className={styles.frame}>{children}</div>
      </body>
    </html>
  );
}
