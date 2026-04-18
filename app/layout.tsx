import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "@cyntler/react-doc-viewer/dist/index.css";
import "./globals.css";

const quicksand = localFont({
  src: [
    {
      path: "../public/fonts/Quicksand-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/Quicksand-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Quicksand-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Quicksand-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Quicksand-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  applicationName: "Hệ thống phiên dịch âm thanh thông minh",
  title: {
    default: "Hệ thống phiên dịch âm thanh thông minh",
    template: "%s | Hệ thống phiên dịch âm thanh thông minh",
  },
  description:
    "Nền tảng phiên dịch âm thanh thông minh hỗ trợ bóc băng, quản lý biên bản và theo dõi lịch sử cuộc họp.",
  keywords: [
    "hệ thống phiên dịch âm thanh thông minh",
    "phiên dịch âm thanh",
    "bóc băng cuộc họp",
    "quản lý biên bản",
    "transcript",
  ],
  openGraph: {
    title: "Hệ thống phiên dịch âm thanh thông minh",
    description:
      "Nền tảng phiên dịch âm thanh thông minh hỗ trợ bóc băng, quản lý biên bản và theo dõi lịch sử cuộc họp.",
    locale: "vi_VN",
    type: "website",
    siteName: "Hệ thống phiên dịch âm thanh thông minh",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hệ thống phiên dịch âm thanh thông minh",
    description:
      "Nền tảng phiên dịch âm thanh thông minh hỗ trợ bóc băng, quản lý biên bản và theo dõi lịch sử cuộc họp.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="vi"
      className={`${quicksand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
