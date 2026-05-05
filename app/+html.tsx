// Static HTML wrapper for expo-router web export.
// Adds PWA manifest, Apple home-screen meta tags, and theme color so the
// site behaves like a real app once added to home screen on iOS.

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Theme + status bar */}
        <meta name="theme-color" content="#0B0B0D" />
        <meta name="color-scheme" content="dark" />

        {/* Standard PWA manifest */}
        <link rel="manifest" href="/manifest.webmanifest" />

        {/* Apple home-screen / standalone behavior */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="DCC" />
        <link rel="apple-touch-icon" href="/dcc-logo.jpg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/dcc-logo.jpg" />

        {/* Open Graph / share preview */}
        <meta property="og:title" content="Deluxe Car Club" />
        <meta
          property="og:description"
          content="Members-only automotive lifestyle club."
        />
        <meta property="og:image" content="/dcc-logo.jpg" />
        <meta property="og:type" content="website" />

        <ScrollViewStyleReset />
        {/* Force a dark page background while the bundle boots, and patch
            the iOS home-indicator gap below the tab bar in PWA standalone
            mode by extending the tab bar's background into the safe area. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { background-color: #0B0B0D; color-scheme: dark; }
              /* React Navigation web tab bar uses role="tablist". On iOS PWA
                 standalone, viewport-fit=cover means the home-indicator strip
                 is part of the page; matching the tab bar's background to that
                 area + bumping its height so labels stay above the indicator. */
              /* TODO: still leaves a small gap on iOS PWA — see NEXT-SESSION.md */
              [role="tablist"] {
                padding-bottom: env(safe-area-inset-bottom) !important;
                height: calc(64px + env(safe-area-inset-bottom)) !important;
                background-color: #13131A !important;
              }
              /* Belt-and-suspenders: a fixed strip behind the tab bar so the
                 safe area always shows tab-bar surface color, even if React
                 Navigation re-renders the tab bar without the role above. */
              body::after {
                content: '';
                position: fixed;
                left: 0;
                right: 0;
                bottom: 0;
                height: env(safe-area-inset-bottom);
                background-color: #13131A;
                pointer-events: none;
                z-index: 0;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
