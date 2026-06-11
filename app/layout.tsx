import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "后台管理 — AI 陪练",
  description: "AI 陪练后台管理系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geist.variable} h-full`}>
      <body className="h-full bg-zinc-950 text-zinc-100 antialiased">
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
