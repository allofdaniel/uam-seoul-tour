import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SKYBOUND - 당신만의 하늘을 비행하세요",
  description: "AI 기반 UAM 서울 관광 안내 게임. 서울 상공을 자유 비행하며 Gemini AI가 실시간 관광 안내를 제공합니다.",
  keywords: ["UAM", "서울", "관광", "비행", "AI", "Gemini", "Three.js"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
