import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Inter } from "next/font/google";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DarulKubra - Student Registration & Management",
  description:
    "Comprehensive student registration and management system for DarulKubra",
  keywords: ["education", "registration", "management", "students", "teachers"],
  authors: [{ name: "DarulKubra" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk')) {
              
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                }
              });
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <SessionProvider>
            <Toaster position="top-center" />
            {children}
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
