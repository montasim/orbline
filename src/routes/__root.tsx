import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

// the orb on its line: the Orbline mark
const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><radialGradient id='o' cx='.38' cy='.34' r='.75'><stop offset='0' stop-color='%23ffffff'/><stop offset='.3' stop-color='%236ee7b7'/><stop offset='.85' stop-color='%2314b8a6'/><stop offset='1' stop-color='%23064e3b'/></radialGradient><linearGradient id='l'><stop offset='0' stop-color='%232dd4bf' stop-opacity='0'/><stop offset='1' stop-color='%237dd3fc'/></linearGradient></defs><rect width='64' height='64' rx='16' fill='%23050b1a'/><rect x='6' y='44' width='40' height='4' rx='2' fill='url(%23l)'/><circle cx='38' cy='30' r='16' fill='url(%23o)'/><circle cx='38' cy='30' r='16' fill='none' stroke='%235eead4' stroke-width='2'/><ellipse cx='33' cy='24' rx='5' ry='3' fill='%23ffffff' opacity='.85' transform='rotate(-30 33 24)'/></svg>"

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
          'Orbline: roll a glowing orb along the line through five endless worlds, from the aurora glacier to a lava caldera. Jump, slide, gather crystals and unlock new orbs.',
      },
      { name: 'theme-color', content: '#050b1a' },
      // installable app (PWA): iOS reads these instead of the manifest
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Orbline' },
      { title: 'Orbline — Five-World Orb Runner' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: FAVICON },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
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
      <body className="bg-night text-ice overflow-hidden select-none m-0 p-0 antialiased font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
