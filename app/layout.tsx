import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Montserrat } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeStyleFix } from "@/components/theme-style-fix"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
})

export const metadata: Metadata = {
  title: "Mobile Muslims | Pain-Free Salah Community",
  description:
    "Join our community dedicated to helping Muslims achieve pain-free Salah through healing and strengthening techniques.",
  generator: 'v0.dev',
  icons: {
    icon: '/m-modified.png',
    shortcut: '/m-modified.png',
    apple: '/m-modified.png',
  }
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
      data-theme="dark"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-midnight font-sans antialiased">
        <ThemeStyleFix />
        <ThemeProvider 
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
          disableTransitionOnChange
          storageKey="mobile-muslims-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}