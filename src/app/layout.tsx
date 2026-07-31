import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUSSIO · Quản lý Voucher",
  description: "Internal tool theo dõi & tạo voucher Shopify cho HUSSIO",
};

const themeScript = `try{var t=localStorage.getItem('vc-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
