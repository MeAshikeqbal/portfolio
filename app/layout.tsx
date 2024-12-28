import { Roboto, Roboto_Mono } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from '@/components/ui/toast';
import { Toaster } from '@/components/ui/toaster';
import { BackToTop } from "@/components/back-to-top";
import { Analytics } from '@vercel/analytics/next';

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata = {
  title: 'Ashik Eqbal - Portfolio',
  description: 'Personal portfolio and blog of Your Name, a software engineer specializing in web development.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${roboto.variable} ${robotoMono.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <ToastProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="flex-grow">
              {children}
            </main>
            <BackToTop />
          </ThemeProvider>
          <Toaster />
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}