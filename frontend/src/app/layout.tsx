import { Cormorant_Garamond, IBM_Plex_Sans } from 'next/font/google'

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
})

export const metadata = {
  title: 'LokBhasha - Government Marathi Translator',
  description: 'Making government language understandable',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  )
}
