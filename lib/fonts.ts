import { Geist, Geist_Mono } from "next/font/google"

/** Shared by every root layout ([lang], studio) and the global 404. */
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${geistSans.variable} ${geistMono.variable}`
