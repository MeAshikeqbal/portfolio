import { Roboto, Roboto_Mono } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from '@/components/ui/toast';
import { Toaster } from '@/components/ui/toaster';
import { BackToTop } from "@/components/back-to-top";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

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
  title: {
    default: 'Ashik Eqbal - Portfolio',
  },
  description: 'Personal portfolio and blog of Ashik Eqbal, a software engineer specializing in web development.',
  keywords: ['Ashik Eqbal', 'Software Engineer', 'Web Development', 'Portfolio', 'Blog'],
  authors: [{ name: 'Ashik Eqbal' }],
  creator: 'Ashik Eqbal',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.itsashik.info',
    siteName: 'Ashik Eqbal Portfolio',
    title: 'Ashik Eqbal - Software Engineer',
    description: 'Personal portfolio and blog of Ashik Eqbal, a software engineer specializing in web development.',
    images: [
      {
        url: 'https://www.itsashik.info/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Ashik Eqbal - Software Engineer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ashik Eqbal - Software Engineer',
    description: 'Personal portfolio and blog of Ashik Eqbal, a software engineer specializing in web development.',
    images: ['https://www.itsashik.info/og-image.png'],
    creator: '@me_ashikeqbal',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  manifest: '/site.webmanifest',
  feed: [
    {
      url: '/rss.xml',
      type: 'application/rss+xml',
      title: 'Ashik Eqbal - Blog RSS Feed',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${roboto.variable} ${robotoMono.variable}`}>
      <head>
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <ToastProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex-grow">
            {children}
            </div>
            <BackToTop />
          </ThemeProvider>
          <Toaster />
        </ToastProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}