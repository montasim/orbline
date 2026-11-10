import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23120f24'/><path d='M30 65 L45 35 L60 48 L75 25 L65 75 Z' fill='%2300f5ff'/><circle cx='55' cy='32' r='7' fill='%23a855f7'/></svg>"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
      },
      {
        name: 'description',
        content:
          'Shadow Runner — An intense endless cyberpunk shadow running game with double jumps, dynamic obstacles, powers and levels.',
      },
      { name: 'theme-color', content: '#0a0a14' },
      { title: 'Shadow Runner — Endless Shadow Action' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: FAVICON },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#07070d] text-gray-100 overflow-hidden select-none m-0 p-0 antialiased font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
