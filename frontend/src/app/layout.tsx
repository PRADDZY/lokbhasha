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
      <body>{children}</body>
    </html>
  )
}
