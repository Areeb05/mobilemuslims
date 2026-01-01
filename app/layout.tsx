import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Montserrat } from "next/font/google"
import "./globals.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
})

export const metadata: Metadata = {
  title: "Understand Salah - Arabic Speech Transcription",
  description:
    "Real-time Arabic speech-to-text transcription with instant English translation for Islamic prayer assistance. Enable your microphone and speak Arabic for live transcription.",
  generator: 'v0.dev',
  icons: [
    {
      rel: 'icon',
      url: '/m-modified.png',
    },
    {
      rel: 'apple-touch-icon',
      url: '/m-modified.png',
    }
  ]
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${montserrat.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-midnight font-sans antialiased text-white">
        {children}
      </body>
    </html>
  )
}
