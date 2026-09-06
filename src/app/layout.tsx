import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Rail } from "@/components/Rail";
import { CommandPalette } from "@/components/CommandPalette";

export const metadata: Metadata = {
  title: "APP AI AGGREGATOR",
  description: "One interface for your entire AI & developer ecosystem.",
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">SKIP TO CONTENT</a>
        <div className="shell">
          <Rail />
          <main id="main" className="stage">{children}</main>
        </div>
        <CommandPalette />
      </body>
    </html>
  );
}
