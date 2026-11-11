import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Pixelify_Sans } from 'next/font/google'
import './globals.css'

const body = Geist({ subsets: ['latin'], variable: '--font-body' })
const display = Pixelify_Sans({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'MooWorks: Dairy Farm Tycoon',
  description: 'Grow a one-cow pasture into a fully automated dairy factory in this cozy pixel-art idle tycoon game.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#24170f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
